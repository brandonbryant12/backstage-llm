/**
 * A Backstage plugin that provides LLM chat capabilities
 *
 * @packageDocumentation
 */

export { llmChatPlugin, LlmChatPage } from './plugin';
export { llmChatApiRef } from './api/LlmChatApi';
export type { 
  LlmChatApi, 
  ChatMessage, 
  ChatSession 
} from './api/LlmChatApi';
export { LlmChatClient } from './api/LlmChatClient';
export { MockLlmChatApi } from './api/MockLlmChatApi';
