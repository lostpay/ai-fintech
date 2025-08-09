export interface HuggingFaceModel {
  name: string;
  type: ModelType;
  endpoint: string;
  temperature?: number;
  maxTokens?: number;
  isLoaded: boolean;
}

export type ModelType = 
  | 'conversational'
  | 'financial_analysis' 
  | 'classification'
  | 'general_purpose';

export interface HuggingFaceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface ModelResponse {
  text: string;
  confidence?: number;
  metadata?: {
    model: string;
    processingTime: number;
    tokenCount?: number;
  };
}

export interface ClassificationResponse {
  labels: string[];
  scores: number[];
  sequence: string;
}

export interface ConversationalResponse {
  generated_text: string;
  conversation: {
    past_user_inputs: string[];
    generated_responses: string[];
  };
}

export interface ModelLoadingState {
  model: string;
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  lastUsed?: Date;
}

export interface HuggingFaceError {
  name: string;
  message: string;
  status?: number;
  model?: string;
}