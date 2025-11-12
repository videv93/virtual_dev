import Anthropic from '@anthropic-ai/sdk';
import type { ConversationMessage } from '@virtual-dev/shared';

export type LLMProvider = 'anthropic' | 'openrouter';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  maxTokens: number;
}

export interface ChatResponse {
  content: string;
  stopReason: string;
}

export interface StreamChunk {
  type: 'content' | 'done';
  content?: string;
}

/**
 * Unified LLM provider interface supporting Anthropic and OpenRouter
 */
export class LLMProvider {
  private anthropicClient: Anthropic | null = null;
  private provider: LLMProvider;
  private model: string;
  private apiKey: string;
  private maxTokens: number;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Determine provider from env
    const providerEnv = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
    this.provider = (providerEnv === 'openrouter' ? 'openrouter' : 'anthropic') as LLMProvider;

    // Get API key and model based on provider
    if (this.provider === 'openrouter') {
      this.apiKey = process.env.OPENROUTER_API_KEY || '';
      this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet';
    } else {
      this.apiKey = process.env.ANTHROPIC_API_KEY || '';
      this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    }

    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '1024', 10);

    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      console.warn(`⚠️  ${this.provider} API key not found. LLM chat will be disabled.`);
      console.warn(
        `   Set ${this.provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'ANTHROPIC_API_KEY'} in .env to enable NPC conversations.`
      );
      return;
    }

    try {
      if (this.provider === 'anthropic') {
        this.anthropicClient = new Anthropic({ apiKey: this.apiKey });
        console.log('✅ Anthropic Claude API client initialized');
      } else {
        console.log(`✅ OpenRouter API client initialized (model: ${this.model})`);
      }
      console.log(`📝 Using LLM provider: ${this.provider}`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.provider} client:`, error);
    }
  }

  /**
   * Check if LLM provider is configured
   */
  public isConfigured(): boolean {
    return this.provider === 'anthropic' ? this.anthropicClient !== null : !!this.apiKey;
  }

  /**
   * Chat completion - supports both Anthropic and OpenRouter
   */
  public async chat(
    messages: ConversationMessage[],
    systemPrompt: string
  ): Promise<ChatResponse> {
    if (!this.isConfigured()) {
      throw new Error(`LLM provider (${this.provider}) is not configured.`);
    }

    try {
      if (this.provider === 'anthropic') {
        return this.chatAnthropic(messages, systemPrompt);
      } else {
        return this.chatOpenRouter(messages, systemPrompt);
      }
    } catch (error) {
      console.error(`Error calling ${this.provider} API:`, error);
      throw error;
    }
  }

  /**
   * Stream chat - supports both Anthropic and OpenRouter
   */
  public async *streamChat(
    messages: ConversationMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamChunk> {
    if (!this.isConfigured()) {
      throw new Error(`LLM provider (${this.provider}) is not configured.`);
    }

    try {
      if (this.provider === 'anthropic') {
        yield* this.streamChatAnthropic(messages, systemPrompt);
      } else {
        yield* this.streamChatOpenRouter(messages, systemPrompt);
      }
    } catch (error) {
      console.error(`Error calling ${this.provider} streaming API:`, error);
      throw error;
    }
  }

  /**
   * Anthropic Claude API chat
   */
  private async chatAnthropic(
    messages: ConversationMessage[],
    systemPrompt: string
  ): Promise<ChatResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
      content,
      stopReason: response.stop_reason,
    };
  }

  /**
   * OpenRouter API chat
   */
  private async chatOpenRouter(
    messages: ConversationMessage[],
    systemPrompt: string
  ): Promise<ChatResponse> {
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Virtual Dev',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: openRouterMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return {
      content,
      stopReason: data.choices[0].finish_reason,
    };
  }

  /**
   * Anthropic Claude streaming chat
   */
  private async *streamChatAnthropic(
    messages: ConversationMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamChunk> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const stream = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          type: 'content',
          content: event.delta.text,
        };
      }
    }

    yield { type: 'done' };
  }

  /**
   * OpenRouter streaming chat (using Server-Sent Events)
   */
  private async *streamChatOpenRouter(
    messages: ConversationMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamChunk> {
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Virtual Dev',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: openRouterMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${JSON.stringify(error)}`);
    }

    if (!response.body) {
      throw new Error('No response body from OpenRouter');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield {
                  type: 'content',
                  content,
                };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done' };
        } else {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield {
                type: 'content',
                content,
              };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      yield { type: 'done' };
    } finally {
      reader.releaseLock();
    }
  }

  public getConfig(): LLMConfig {
    return {
      provider: this.provider,
      model: this.model,
      apiKey: this.apiKey,
      maxTokens: this.maxTokens,
    };
  }
}

// Export singleton instance
export const llmProvider = new LLMProvider();
