import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  configApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { llmChatApiRef } from './api/LlmChatApi';
import { LlmChatClient } from './api/LlmChatClient';
import { MockLlmChatApi } from './api/MockLlmChatApi';

export const llmChatPlugin = createPlugin({
  id: 'llm-chat',
  apis: [
    createApiFactory({
      api: llmChatApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        configApi: configApiRef,
      },
      factory: ({ discoveryApi, fetchApi, configApi }) => {
        // Check if mock mode is enabled in config
        const useMock = configApi.getOptionalBoolean('llm.chat.mock') ?? false;
        
        if (useMock) {
          return new MockLlmChatApi();
        }
        
        return new LlmChatClient({ discoveryApi, fetchApi });
      },
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const LlmChatPage = llmChatPlugin.provide(
  createRoutableExtension({
    name: 'LlmChatPage',
    component: () =>
      import('./components/LlmChatPage/LlmChatPage').then(m => m.LlmChatPage),
    mountPoint: rootRouteRef,
  }),
);
