import { LlmChatApi, ChatSession } from './LlmChatApi';

export class MockLlmChatApi implements LlmChatApi {
  private sessions: Map<string, ChatSession> = new Map();
  private readonly responses = [
    "I understand your question. Based on the context, ",
    "Let me analyze that for you. ",
    "That's an interesting question. Here's what I think: ",
    "I can help you with that. ",
    "From my analysis, "
  ];

  private readonly streamDelay = 10;
  private readonly chunkSize = 3;

  constructor() {
    // Initialize with a default session
    const defaultSession = this.createDefaultSession();
    this.sessions.set(defaultSession.id, defaultSession);
  }

  private createDefaultSession(): ChatSession {
    return {
      id: 'default',
      title: 'New Chat',
      lastMessage: 'Welcome! How can I help you today?',
      lastMessageTime: Date.now(),
      messages: [{
        role: 'assistant' as const,
        content: 'Welcome! How can I help you today?',
        timestamp: Date.now()
      }]
    };
  }

  async *chat(message: string, sessionId: string): AsyncGenerator<string, void, unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    session.messages.push({
      role: 'user' as const,
      content: message,
      timestamp: Date.now()
    });

    // Pick a random starter phrase
    const starter = this.responses[Math.floor(Math.random() * this.responses.length)];
    const response = `${starter}Your message was "${message}"...`;

    // Stream the response
    let streamedResponse = '';
    for (let i = 0; i < response.length; i += this.chunkSize) {
      const chunk = response.slice(i, i + this.chunkSize);
      streamedResponse += chunk;
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, this.streamDelay));
    }

    // Add assistant message
    session.messages.push({
      role: 'assistant' as const,
      content: streamedResponse,
      timestamp: Date.now()
    });

    // Update session metadata
    session.lastMessage = streamedResponse;
    session.lastMessageTime = Date.now();
  }

  async getSessions(): Promise<ChatSession[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  }

  async getSession(id: string): Promise<ChatSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  async createSession(): Promise<ChatSession> {
    const id = `session-${Date.now()}`;
    const session: ChatSession = {
      id,
      title: 'New Chat',
      lastMessage: 'Welcome! How can I help you today?',
      lastMessageTime: Date.now(),
      messages: [{
        role: 'assistant' as const,
        content: 'Welcome! How can I help you today?',
        timestamp: Date.now()
      }]
    };
    this.sessions.set(id, session);
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.getSessions();
    }

    const matchingSessions: ChatSession[] = [];
    
    for (const session of this.sessions.values()) {
      // Search in messages
      const hasMatchingMessage = session.messages.some(msg => 
        msg.content.toLowerCase().includes(normalizedQuery)
      );

      // Search in title
      const hasMatchingTitle = session.title.toLowerCase().includes(normalizedQuery);

      if (hasMatchingMessage || hasMatchingTitle) {
        matchingSessions.push(session);
      }
    }

    return matchingSessions.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  }
} 