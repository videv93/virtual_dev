import type { ConversationMessage, NPCConfig } from '@virtual-dev/shared';
import { supabaseService } from './supabase.service';
import { llmProvider } from './llm-provider';

class NPCService {
  constructor() {
    // LLM provider initializes itself
  }

  /**
   * Check if NPC service is configured
   */
  public isConfigured(): boolean {
    return llmProvider.isConfigured();
  }

  /**
   * Chat with an NPC using configured LLM provider
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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'NPC chat is not configured. Please set LLM API credentials.',
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

      // Call LLM API
      const startTime = Date.now();
      const response = await llmProvider.chat(conversationHistory, npc.systemPrompt);

      const responseTime = Date.now() - startTime;
      console.log(
        `✅ LLM response for ${npc.name} in ${responseTime}ms`
      );

      // Add assistant message to history
      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: response.content,
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
        message: response.content,
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
   * Stream chat with an NPC using configured LLM provider (for real-time responses)
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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'NPC chat is not configured. Please set LLM API credentials.',
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

      // Collect full response
      let fullResponse = '';

      // Stream response
      const stream = llmProvider.streamChat(conversationHistory, npc.systemPrompt);
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.content) {
          fullResponse += chunk.content;
          onChunk(chunk.content);
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
