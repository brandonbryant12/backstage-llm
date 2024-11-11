import { Knex } from 'knex';
import { ChatMessage, ChatSession } from '../../types';
import { ChatStore } from './types';
import { NotFoundError } from '@backstage/errors';
import crypto from 'crypto';

export class ChatStoreDatabaseService implements ChatStore {
  constructor(
    private readonly db: Knex,
  ) {}

  async createSchema(): Promise<void> {
    // Check and create chat_sessions table
    const hasSessionsTable = await this.db.schema.hasTable('chat_sessions');
    if (!hasSessionsTable) {
      await this.db.schema.createTable('chat_sessions', table => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.string('lastMessage').notNullable();
        table.string('lastMessageTime').notNullable();
      });
    }

    // Check and create chat_messages table
    const hasMessagesTable = await this.db.schema.hasTable('chat_messages');
    if (!hasMessagesTable) {
      await this.db.schema.createTable('chat_messages', table => {
        table.increments('id').primary();
        table.string('sessionId').references('id').inTable('chat_sessions');
        table.string('role').notNullable();
        table.text('content').notNullable();
        table.bigInteger('timestamp').notNullable();
      });
    }

    // Create default session if it doesn't exist
    const defaultSession = await this.db('chat_sessions').where({ id: 'default' }).first();
    if (!defaultSession) {
      await this.createDefaultSession();
    }
  }

  private async createDefaultSession(): Promise<void> {
    const session = {
      id: 'default',
      title: 'New Chat',
      lastMessage: 'Welcome! How can I help you today?',
      lastMessageTime: new Date().toISOString(),
    };

    await this.db('chat_sessions').insert(session);
  }

  async getSessions(): Promise<ChatSession[]> {
    const sessions = await this.db('chat_sessions')
      .select('*')
      .orderBy('lastMessageTime', 'desc');

    return Promise.all(
      sessions.map(async session => ({
        ...session,
        messages: await this.getSessionMessages(session.id),
      })),
    );
  }

  async getSession(id: string): Promise<ChatSession> {
    const session = await this.db('chat_sessions').where({ id }).first();
    if (!session) {
      throw new NotFoundError(`Session with id ${id} not found`);
    }

    return {
      ...session,
      messages: await this.getSessionMessages(id),
    };
  }

  async createSession(): Promise<ChatSession> {
    const id = crypto.randomUUID();
    const session = {
      id,
      title: 'New Chat',
      lastMessage: 'Welcome! How can I help you today?',
      lastMessageTime: new Date().toISOString(),
    };

    try {
      await this.db('chat_sessions').insert(session);

      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: session.lastMessage,
        timestamp: Date.now(),
      };

      await this.addMessageToSession(id, welcomeMessage);

      return {
        ...session,
        messages: [welcomeMessage],
      };
    } catch (error) {
      console.error('Error creating session:', error as Error);
      throw new Error(`Failed to create session: ${(error as Error).message}`);
    }
  }

  async deleteSession(id: string): Promise<void> {
    await this.db('chat_messages').where({ sessionId: id }).delete();
    await this.db('chat_sessions').where({ id }).delete();
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return this.getSessions();
    }

    const sessions = await this.db('chat_sessions')
      .whereRaw('LOWER(title) LIKE ?', [`%${normalizedQuery}%`])
      .orWhereRaw('LOWER(lastMessage) LIKE ?', [`%${normalizedQuery}%`])
      .orderBy('lastMessageTime', 'desc');

    return Promise.all(
      sessions.map(async session => ({
        ...session,
        messages: await this.getSessionMessages(session.id),
      })),
    );
  }

  async addMessageToSession(
    sessionId: string,
    message: ChatMessage,
  ): Promise<void> {
    await this.db('chat_messages').insert({
      sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });

    await this.updateSessionMetadata(sessionId, {
      lastMessage: message.content,
      lastMessageTime: new Date(message.timestamp).toISOString(),
    });
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<ChatSession>,
  ): Promise<void> {
    await this.db('chat_sessions')
      .where({ id: sessionId })
      .update(metadata);
  }

  private async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.db('chat_messages')
      .where({ sessionId })
      .orderBy('timestamp', 'asc')
      .select('role', 'content', 'timestamp');
  }
} 