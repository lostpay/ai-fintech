// Main AI Service (existing, enhanced)
export { AIService, default } from './AIService';

// AI Processing Services
export { default as AIQueryProcessor } from './AIQueryProcessor';
export { default as HuggingFaceModelManager } from './HuggingFaceModelManager';
export { default as LangChainOrchestrator } from './LangChainOrchestrator';
export { default as ConversationManager } from './ConversationManager';
export { default as PrivacyManager } from './PrivacyManager';

// Re-export types
export type * from '../../types/ai';