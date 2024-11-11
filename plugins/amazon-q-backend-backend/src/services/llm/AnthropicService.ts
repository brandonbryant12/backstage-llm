import { LoggerService } from '@backstage/backend-plugin-api';
import { AbstractLLMService } from './AbstractLLMService';
import { Config } from "@backstage/config";
import Anthropic from '@anthropic-ai/sdk';
import { ChatStore } from '../chat/types';
import { ChatMessage } from '../../types';

export class AnthropicService implements AbstractLLMService {
  private anthropic: Anthropic;
  private readonly MAX_TOKENS = 16_000; // About 12k words of context
  private readonly TARGET_TOKENS = 12_000; // Target when truncating
  private readonly MAX_RESPONSE_TOKENS = 1_000; // Limit response length
  private readonly TRUNCATION_MESSAGE = {
    role: 'assistant' as const,
    content: "Note: Some older messages have been removed to maintain conversation length.",
  };

  constructor(
    private readonly config: Config,
    private readonly logger: LoggerService,
    private readonly chatStore: ChatStore,
  ) {
    const apiKey = this.config.getString('llm.anthropic.apiKey');
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  private async estimateTokenCount(text: string): Promise<number> {
    // Claude uses roughly 4 characters per token as a rough estimate
    return Math.ceil(text.length / 4);
  }

  private async truncateMessages(messages: ChatMessage[]): Promise<Array<{ role: 'user' | 'assistant', content: string }>> {
    let totalTokens = 0;
    
    // First pass: count tokens
    for (const msg of messages) {
      totalTokens += await this.estimateTokenCount(msg.content);
    }

    this.logger.info(`Conversation has approximately ${totalTokens} tokens`);

    if (totalTokens <= this.MAX_TOKENS) {
      return messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    }

    // Need to truncate
    this.logger.info('Truncating conversation history');
    let tokenCount = 0;
    const truncatedMessages: Array<{ role: 'user' | 'assistant', content: string }> = [];

    // Always keep the system message about truncation
    truncatedMessages.push(this.TRUNCATION_MESSAGE);
    tokenCount += await this.estimateTokenCount(this.TRUNCATION_MESSAGE.content);

    // Process messages from newest to oldest until we hit the target
    // Keep message pairs (question/answer) together for better context
    for (let i = messages.length - 1; i >= 0; i -= 2) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      
      const currentTokens = await this.estimateTokenCount(currentMessage.content);
      const previousTokens = previousMessage ? await this.estimateTokenCount(previousMessage.content) : 0;
      const pairTokens = currentTokens + previousTokens;

      if (tokenCount + pairTokens <= this.TARGET_TOKENS) {
        if (previousMessage) {
          truncatedMessages.unshift({
            role: previousMessage.role,
            content: previousMessage.content,
          });
        }
        truncatedMessages.unshift({
          role: currentMessage.role,
          content: currentMessage.content,
        });
        tokenCount += pairTokens;
      } else {
        break;
      }
    }

    this.logger.info(`Truncated conversation to approximately ${tokenCount} tokens`);
    return truncatedMessages;
  }

  async *chat(message: string, sessionId: string): AsyncGenerator<string, void, unknown> {
    try {
      const session = await this.chatStore.getSession(sessionId);
      const truncatedMessages = await this.truncateMessages(session.messages);

      truncatedMessages.push({
        role: 'user',
        content: message,
      });

      const stream = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: this.MAX_RESPONSE_TOKENS,
        messages: truncatedMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          for (const smallChunk of chunk.delta.text.match(/.{1,50}/g) || []) {
            yield smallChunk;
          }
        }
      }
    } catch (error) {
      const e = error as Error
      this.logger.error('Error in Anthropic chat', e);
      throw error;
    }
  }
} 