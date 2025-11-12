import Anthropic from '@anthropic-ai/sdk';
import type { ConversationMessage, NPCConfig } from '@virtual-dev/shared';
import { supabaseService } from './supabase.service';

class NPCService {
  private anthropic: Anthropic | null = null;
  private readonly model = 'claude-3-5-sonnet-20241022';
  private readonly maxTokens = 1024;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('⚠️  Anthropic API key not found. NPC chat will be disabled.');
      console.warn('   Set ANTHROPIC_API_KEY in .env to enable NPC conversations.');
      return;
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
      console.log('✅ Anthropic Claude API client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Anthropic client:', error);
    }
  }

  /**
   * Check if Claude API is configured
   */
  public isConfigured(): boolean {
    return this.anthropic !== null;
  }

  /**
   * Chat with an NPC using Claude API
   */
  public async chat(
    npcId: string,
    userId: string,
    userMessage: string,
    conversationId?: string
  ): Promise<{
    success: boolean;
    message?: string;
    conversationId?: string;
    npcName?: string;
    error?: string;
  }> {
    // Check if services are configured
    if (!this.anthropic) {
      return {
        success: false,
        error: 'NPC chat is not configured. Please set ANTHROPIC_API_KEY.',
      };
    }

    if (!supabaseService.isConfigured()) {
      return {
        success: false,
        error: 'Database is not configured. Please set Supabase credentials.',
      };
    }

    try {
      // Get NPC configuration
      const npc = await supabaseService.getNPCById(npcId);
      if (!npc) {
        return {
          success: false,
          error: 'NPC not found.',
        };
      }

      // Get or create conversation history
      let conversation = conversationId
        ? await supabaseService.getConversation(npcId, userId)
        : null;

      const conversationHistory: ConversationMessage[] = conversation
        ? conversation.messages
        : [];

      // Add user message to history
      const userMsg: ConversationMessage = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      };
      conversationHistory.push(userMsg);

      // Prepare messages for Claude API
      const messages: Anthropic.MessageParam[] = conversationHistory.map(
        (msg) => ({
          role: msg.role,
          content: msg.content,
        })
      );

      // Call Claude API
      const startTime = Date.now();
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: npc.systemPrompt,
        messages: messages,
      });

      const responseTime = Date.now() - startTime;
      console.log(
        `✅ Claude API response for ${npc.name} in ${responseTime}ms`
      );

      // Extract assistant response
      const assistantMessage =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Add assistant message to history
      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
      };
      conversationHistory.push(assistantMsg);

      // Save conversation to database
      const newConversationId = await supabaseService.saveMessage(
        npcId,
        userId,
        conversationId || null,
        conversationHistory
      );

      return {
        success: true,
        message: assistantMessage,
        conversationId: newConversationId || undefined,
        npcName: npc.name,
      };
    } catch (error) {
      console.error('Error in NPC chat:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while chatting with the NPC.',
      };
    }
  }

  /**
   * Stream chat with an NPC using Claude API (for real-time responses)
   */
  public async streamChat(
    npcId: string,
    userId: string,
    userMessage: string,
    conversationId: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{
    success: boolean;
    conversationId?: string;
    npcName?: string;
    error?: string;
  }> {
    // Check if services are configured
    if (!this.anthropic) {
      return {
        success: false,
        error: 'NPC chat is not configured. Please set ANTHROPIC_API_KEY.',
      };
    }

    if (!supabaseService.isConfigured()) {
      return {
        success: false,
        error: 'Database is not configured. Please set Supabase credentials.',
      };
    }

    try {
      // Get NPC configuration
      const npc = await supabaseService.getNPCById(npcId);
      if (!npc) {
        return {
          success: false,
          error: 'NPC not found.',
        };
      }

      // Get or create conversation history
      let conversation = conversationId
        ? await supabaseService.getConversation(npcId, userId)
        : null;

      const conversationHistory: ConversationMessage[] = conversation
        ? conversation.messages
        : [];

      // Add user message to history
      const userMsg: ConversationMessage = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      };
      conversationHistory.push(userMsg);

      // Prepare messages for Claude API
      const messages: Anthropic.MessageParam[] = conversationHistory.map(
        (msg) => ({
          role: msg.role,
          content: msg.content,
        })
      );

      // Call Claude API with streaming
      const stream = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: npc.systemPrompt,
        messages: messages,
        stream: true,
      });

      // Collect full response
      let fullResponse = '';

      // Stream response
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const chunk = event.delta.text;
          fullResponse += chunk;
          onChunk(chunk);
        }
      }

      // Add assistant message to history
      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      };
      conversationHistory.push(assistantMsg);

      // Save conversation to database
      const newConversationId = await supabaseService.saveMessage(
        npcId,
        userId,
        conversationId || null,
        conversationHistory
      );

      return {
        success: true,
        conversationId: newConversationId || undefined,
        npcName: npc.name,
      };
    } catch (error) {
      console.error('Error in NPC stream chat:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while chatting with the NPC.',
      };
    }
  }
}

// Export singleton instance
export const npcService = new NPCService();
