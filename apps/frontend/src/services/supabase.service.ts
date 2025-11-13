import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ChatMessage, SupabaseChatMessage } from '@virtual-dev/shared';
import { useGameStore } from '../stores/gameStore';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private chatChannel: RealtimeChannel | null = null;

  initialize(): void {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase credentials not configured. Chat features will be disabled.');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');
  }

  /**
   * Convert Supabase chat message to app chat message format
   */
  private convertSupabaseMessage(msg: SupabaseChatMessage): ChatMessage {
    return {
      id: msg.id,
      userId: msg.user_id,
      username: msg.username,
      message: msg.message,
      timestamp: new Date(msg.created_at).getTime(),
      position: {
        x: msg.position_x,
        y: msg.position_y,
      },
    };
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    userId: string,
    username: string,
    message: string,
    position: { x: number; y: number }
  ): Promise<ChatMessage | null> {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('chat_messages')
        .insert({
          user_id: userId,
          username: username,
          message: message,
          position_x: position.x,
          position_y: position.y,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        useGameStore.getState().addToast('error', 'Failed to send message');
        return null;
      }

      return this.convertSupabaseMessage(data as SupabaseChatMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      useGameStore.getState().addToast('error', 'Failed to send message');
      return null;
    }
  }

  /**
   * Load recent chat messages
   */
  async loadRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading messages:', error);
        useGameStore.getState().addToast('error', 'Failed to load chat history');
        return [];
      }

      return (data as SupabaseChatMessage[])
        .map((msg) => this.convertSupabaseMessage(msg))
        .reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Error loading messages:', error);
      useGameStore.getState().addToast('error', 'Failed to load chat history');
      return [];
    }
  }

  /**
   * Subscribe to real-time chat messages
   */
  subscribeToMessages(callback: (message: ChatMessage) => void): void {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return;
    }

    // Unsubscribe from previous channel if exists
    if (this.chatChannel) {
      this.chatChannel.unsubscribe();
    }

    // Create new channel for chat messages
    this.chatChannel = this.client
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as SupabaseChatMessage;
          const chatMessage = this.convertSupabaseMessage(newMessage);
          callback(chatMessage);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to chat messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to chat messages');
          useGameStore.getState().addToast('error', 'Failed to connect to real-time chat');
        }
      });
  }

  /**
   * Unsubscribe from chat messages
   */
  unsubscribeFromMessages(): void {
    if (this.chatChannel) {
      this.chatChannel.unsubscribe();
      this.chatChannel = null;
      console.log('Unsubscribed from chat messages');
    }
  }

  /**
   * Check if Supabase is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get Supabase client (for advanced use cases)
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
