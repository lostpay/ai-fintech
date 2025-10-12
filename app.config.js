import 'dotenv/config';

export default {
  expo: {
    name: 'app',
    slug: 'app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/images/epz1ksqf7xy81.jpg',
    scheme: 'myfinanceapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    // Deep linking configuration
    deep: {
      links: ['myfinanceapp://', 'https://yourapp.com'],
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './src/assets/images/epz1ksqf7xy81.jpg',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.shane2034.app',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './src/assets/images/epz1ksqf7xy81.jpg',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './src/assets/images/epz1ksqf7xy81.jpg',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'cee870a7-b07f-4c57-892d-2a442bb2cb93',
      },
      // Supabase Configuration
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      // Chatbot Backend URL
      chatbotApiUrl: process.env.EXPO_PUBLIC_CHATBOT_API_URL,
      // AI Service Configuration - loaded from .env
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      AI_SERVICE_TIMEOUT: process.env.AI_SERVICE_TIMEOUT,
      AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
      AI_TEMPERATURE: process.env.AI_TEMPERATURE,
      HF_CLASSIFICATION_MODEL: process.env.HF_CLASSIFICATION_MODEL,
      HF_CONVERSATIONAL_MODEL: process.env.HF_CONVERSATIONAL_MODEL,
      HF_FINANCIAL_MODEL: process.env.HF_FINANCIAL_MODEL,
      HF_GENERAL_MODEL: process.env.HF_GENERAL_MODEL,
    },
    owner: 'shane2034',
  },
};