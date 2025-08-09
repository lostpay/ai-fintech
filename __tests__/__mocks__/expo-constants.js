export default {
  expoConfig: {
    extra: {
      HUGGINGFACE_API_KEY: 'mock_huggingface_key',
      OPENAI_API_KEY: 'mock_openai_key',
      ANTHROPIC_API_KEY: 'mock_anthropic_key',
      GOOGLE_AI_API_KEY: 'mock_google_key',
      AI_SERVICE_TIMEOUT: '30000',
      AI_MAX_TOKENS: '2000',
      AI_TEMPERATURE: '0.7',
      HF_CLASSIFICATION_MODEL: 'facebook/bart-large-mnli',
      HF_CONVERSATIONAL_MODEL: 'microsoft/DialoGPT-medium',
      HF_FINANCIAL_MODEL: 'ProsusAI/finbert',
      HF_GENERAL_MODEL: 'google/flan-t5-base',
    },
  },
};