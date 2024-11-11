import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { LlmChatApi, ChatSession } from './LlmChatApi';

export class LlmChatClient implements LlmChatApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async getBaseUrl() {
    const baseUrl = await this.discoveryApi.getBaseUrl('amazon-q-backend');
    return baseUrl;
  }

  async getSessions(): Promise<ChatSession[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/sessions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }
    return await response.json();
  }

  async getSession(id: string): Promise<ChatSession> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/sessions/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }
    return await response.json();
  }

  async createSession(): Promise<ChatSession> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/sessions`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    return await response.json();
  }

  async deleteSession(id: string): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/sessions/search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to search sessions: ${response.statusText}`);
    }
    return await response.json();
  }

  async *chat(message: string, sessionId: string): AsyncGenerator<string, void, unknown> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^data: /, ''));

        for (const line of lines) {
          if (line === '[DONE]') return;
          try {
            const parsed = JSON.parse(line);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk) yield parsed.chunk;
          } catch (e) {
            console.warn('Failed to parse SSE message:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
} 