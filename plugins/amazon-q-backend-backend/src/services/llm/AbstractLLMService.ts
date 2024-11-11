export interface AbstractLLMService {
  chat(message: string, sessionId: string): AsyncGenerator<string, void, unknown>;
} 