import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { llmChatPlugin, LlmChatPage } from '../src/plugin';
import { MockLlmChatApi } from '../src/api/MockLlmChatApi';
import { llmChatApiRef } from '../src/api/LlmChatApi';

createDevApp()
  .registerPlugin(llmChatPlugin)
  .registerApi({
    api: llmChatApiRef,
    deps: {},
    factory: () => new MockLlmChatApi(),
  })
  .addPage({
    element: <LlmChatPage />,
    title: 'LLM Chat',
    path: '/llm-chat',
  })
  .render();
