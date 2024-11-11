import { llmChatPlugin } from './plugin';
import { createPlugin } from '@backstage/core-plugin-api';

describe('llm-chat', () => {
  it('should export plugin', () => {
    expect(llmChatPlugin).toEqual(expect.any(createPlugin));
  });

  it('should register routes', () => {
    expect(llmChatPlugin.routes).toBeDefined();
    expect(llmChatPlugin.routes.root).toBeDefined();
  });
});
