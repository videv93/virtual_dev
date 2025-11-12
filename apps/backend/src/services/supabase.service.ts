import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  NPCConfig,
  SupabaseNPCConfig,
  NPCConversation,
  SupabaseNPCConversation,
  ConversationMessage,
} from '@virtual-dev/shared';

class SupabaseService {
  private client: SupabaseClient | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        '⚠️  Supabase credentials not found. NPC features will be disabled.'
      );
      console.warn(
        '   Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to enable NPCs.'
      );
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
    }
  }

  /**
   * Check if Supabase is configured
   */
  public isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Get all NPCs from database
   */
  public async getNPCs(): Promise<NPCConfig[]> {
    if (!this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('npc_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching NPCs:', error);
        return [];
      }

      // Transform Supabase data to NPCConfig format
      return (data as SupabaseNPCConfig[]).map((npc) => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        systemPrompt: npc.system_prompt,
        position: {
          x: npc.position_x,
          y: npc.position_y,
        },
        iconUrl: npc.icon_url,
      }));
    } catch (error) {
      console.error('Error fetching NPCs:', error);
      return [];
    }
  }

  /**
   * Get a specific NPC by ID
   */
  public async getNPCById(npcId: string): Promise<NPCConfig | null> {
    if (!this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('npc_configs')
        .select('*')
        .eq('id', npcId)
        .single();

      if (error) {
        console.error('Error fetching NPC:', error);
        return null;
      }

      const npc = data as SupabaseNPCConfig;
      return {
        id: npc.id,
        name: npc.name,
        role: npc.role,
        systemPrompt: npc.system_prompt,
        position: {
          x: npc.position_x,
          y: npc.position_y,
        },
        iconUrl: npc.icon_url,
      };
    } catch (error) {
      console.error('Error fetching NPC:', error);
      return null;
    }
  }

  /**
   * Get conversation history between user and NPC
   */
  public async getConversation(
    npcId: string,
    userId: string
  ): Promise<NPCConversation | null> {
    if (!this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('npc_conversations')
        .select('*')
        .eq('npc_id', npcId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No conversation exists yet
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching conversation:', error);
        return null;
      }

      const conv = data as SupabaseNPCConversation;
      return {
        id: conv.id,
        npcId: conv.npc_id,
        userId: conv.user_id,
        messages: conv.messages as ConversationMessage[],
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime(),
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  /**
   * Create a new conversation
   */
  public async createConversation(
    npcId: string,
    userId: string,
    messages: ConversationMessage[]
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('npc_conversations')
        .insert({
          npc_id: npcId,
          user_id: userId,
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return (data as { id: string }).id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  /**
   * Update an existing conversation with new messages
   */
  public async updateConversation(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('npc_conversations')
        .update({
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating conversation:', error);
      return false;
    }
  }

  /**
   * Save a message to conversation history
   */
  public async saveMessage(
    npcId: string,
    userId: string,
    conversationId: string | null,
    newMessages: ConversationMessage[]
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      // If no conversation ID, create a new conversation
      if (!conversationId) {
        return await this.createConversation(npcId, userId, newMessages);
      }

      // Otherwise, update existing conversation
      const success = await this.updateConversation(conversationId, newMessages);
      return success ? conversationId : null;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
