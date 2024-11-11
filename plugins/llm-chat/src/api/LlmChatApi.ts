import { createApiRef } from '@backstage/core-plugin-api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: number;
  messages: ChatMessage[];
}

export interface LlmChatApi {
  /**
   * Sends a chat message and streams the response
   * @param message - The message to send
   * @param sessionId - The ID of the chat session
   */
  chat(message: string, sessionId: string): AsyncGenerator<string, void, unknown>;
  
  /**
   * Gets all chat sessions
   */
  getSessions(): Promise<ChatSession[]>;
  
  /**
   * Gets a specific chat session by ID
   * @param id - The session ID
   */
  getSession(id: string): Promise<ChatSession>;
  
  /**
   * Creates a new chat session
   */
  createSession(): Promise<ChatSession>;
  
  /**
   * Deletes a chat session
   * @param id - The session ID to delete
   */
  deleteSession(id: string): Promise<void>;
  
  /**
   * Searches chat sessions
   * @param query - The search query
   */
  searchSessions(query: string): Promise<ChatSession[]>;
  
  /**
   * Sets the knowledge base for the chat session
   * @param kbId - The ID of the knowledge base
   */
  setKnowledgeBase?(kbId: string): Promise<void>;
  
  /**
   * Sets the business context for the chat session
   * @param context - The business context
   */
  setBusinessContext?(context: any): Promise<void>;
  
  /**
   * Modifies the chat to support additional options
   * @param message - The message to send
   * @param sessionId - The ID of the chat session
   * @param options - Additional options for the chat
   */
  chat(message: string, sessionId: string, options?: {
    knowledgeBase?: string;
    businessContext?: any;
    // other provider-specific options
  }): AsyncGenerator<string, void, unknown>;
}

/**
 * API Reference for the LlmChatApi
 * @public
 */
export const llmChatApiRef = createApiRef<LlmChatApi>({
  id: 'plugin.llm-chat.api',
}); 