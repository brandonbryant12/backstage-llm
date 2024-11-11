import express from 'express';
import Router from 'express-promise-router';
import { ChatStore } from './services/chat/types';
import { AbstractLLMService } from './services/llm/AbstractLLMService';
import { z } from 'zod';
import { InputError } from '@backstage/errors';

export async function createRouter({
  chatStore,
  llmService,
}: {
  chatStore: ChatStore;
  llmService: AbstractLLMService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  const messageSchema = z.object({
    message: z.string(),
    sessionId: z.string(),
  });

  router.get('/sessions', async (_req, res) => {
    const sessions = await chatStore.getSessions();
    res.json(sessions);
  });

  router.get('/sessions/:id', async (req, res) => {
    const session = await chatStore.getSession(req.params.id);
    res.json(session);
  });

  router.post('/sessions', async (_req, res) => {
    const session = await chatStore.createSession();
    res.json(session);
  });

  router.delete('/sessions/:id', async (req, res) => {
    await chatStore.deleteSession(req.params.id);
    res.status(204).send();
  });

  router.get('/sessions/search', async (req, res) => {
    const query = req.query.query as string;
    const sessions = await chatStore.searchSessions(query);
    res.json(sessions);
  });

  router.post('/chat', async (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const { message, sessionId } = parsed.data;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Add user message to session
      await chatStore.addMessageToSession(sessionId, {
        role: 'user',
        content: message,
        timestamp: Date.now(),
      });

      // Stream the response
      let fullResponse = '';
      for await (const chunk of llmService.chat(message, sessionId)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Add assistant message to session
      await chatStore.addMessageToSession(sessionId, {
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      });

      res.write('data: [DONE]\n\n');
    } catch (error) {
      const err = error as Error;
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.end();
    }
  });

  return router;
}
