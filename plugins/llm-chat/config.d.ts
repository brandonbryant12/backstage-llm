export interface Config {
  llm?: {
    chat?: {
      /**
       * Whether to use mock implementation
       * @visibility frontend
       */
      mock?: boolean;
    };
  };
} 