import { ChatMessage, ChatSession } from '../../types';

export interface ChatStore {
  createSchema(): Promise<void>;
  getSessions(): Promise<ChatSession[]>;
  getSession(id: string): Promise<ChatSession>;
  createSession(): Promise<ChatSession>;
  deleteSession(id: string): Promise<void>;
  searchSessions(query: string): Promise<ChatSession[]>;
  addMessageToSession(sessionId: string, message: ChatMessage): Promise<void>;
  updateSessionMetadata(sessionId: string, metadata: Partial<ChatSession>): Promise<void>;
} 