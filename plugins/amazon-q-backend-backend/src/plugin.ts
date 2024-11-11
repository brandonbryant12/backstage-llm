import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { AnthropicService } from './services/llm/AnthropicService';
import { ChatStoreDatabaseService } from './services/chat/ChatStoreDatabaseService';

/**
 * amazonQBackendPlugin backend plugin
 *
 * @public
 */
export const amazonQBackendPlugin = createBackendPlugin({
  pluginId: 'amazon-q-backend',
  register(env) {
    env.registerInit({
      deps: {
        database: coreServices.database,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
      },
      async init({ database, logger, config, httpRouter }) {
        try {
          const chatStore = new ChatStoreDatabaseService(await database.getClient());
          await chatStore.createSchema().catch(error => {
            logger.error('Failed to create chat schema:', error as Error);
            throw error;
          });

          const llmService = new AnthropicService(config, logger, chatStore);

          const router = await createRouter({
            chatStore,
            llmService,
          });

          httpRouter.use(router);
        } catch (error) {
          logger.error('Failed to initialize amazon-q-backend plugin:', error as Error);
          throw error;
        }
      },
    });
  },
});
