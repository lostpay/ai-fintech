import { HfInference } from '@huggingface/inference';
import Constants from 'expo-constants';
import {
  HuggingFaceModel,
  ModelType,
  HuggingFaceConfig,
  ModelResponse,
  ClassificationResponse,
  ConversationalResponse,
  ModelLoadingState,
  QueryType
} from '../../types/ai';

class HuggingFaceModelManager {
  private hf: HfInference | null = null;
  private config: HuggingFaceConfig | null = null;
  private models: Record<ModelType, HuggingFaceModel> = {
    conversational: {
      name: Constants.expoConfig?.extra?.HF_CONVERSATIONAL_MODEL || 'microsoft/DialoGPT-medium',
      type: 'conversational',
      endpoint: '',
      temperature: Number(Constants.expoConfig?.extra?.AI_TEMPERATURE) || 0.7,
      maxTokens: Number(Constants.expoConfig?.extra?.AI_MAX_TOKENS) || 150,
      isLoaded: false
    },
    financial_analysis: {
      name: Constants.expoConfig?.extra?.HF_FINANCIAL_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      type: 'financial_analysis',
      endpoint: '',
      temperature: 0.3,
      maxTokens: 100,
      isLoaded: false
    },
    classification: {
      name: Constants.expoConfig?.extra?.HF_CLASSIFICATION_MODEL || 'facebook/bart-large-mnli',
      type: 'classification',
      endpoint: '',
      temperature: 0.1,
      maxTokens: 50,
      isLoaded: false
    },
    general_purpose: {
      name: Constants.expoConfig?.extra?.HF_GENERAL_MODEL || 'distilbert-base-uncased-finetuned-sst-2-english',
      type: 'general_purpose',
      endpoint: '',
      temperature: Number(Constants.expoConfig?.extra?.AI_TEMPERATURE) || 0.5,
      maxTokens: Number(Constants.expoConfig?.extra?.AI_MAX_TOKENS) || 100,
      isLoaded: false
    },
    embedding: {
      name: Constants.expoConfig?.extra?.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
      type: 'embedding',
      endpoint: '',
      temperature: 0.0,
      maxTokens: 0,
      isLoaded: false
    }
  };

  private loadingStates: Record<string, ModelLoadingState> = {};

  async initialize(): Promise<void> {
    try {
      // Get API key from environment variables
      const apiKey = Constants.expoConfig?.extra?.HUGGINGFACE_API_KEY;
      
      if (apiKey) {
        this.config = {
          apiKey,
          timeout: Number(Constants.expoConfig?.extra?.AI_SERVICE_TIMEOUT) || 30000,
          retryAttempts: 3
        };

        this.hf = new HfInference(this.config.apiKey);
        console.log('HuggingFace ModelManager initialized with API key from environment');
      } else {
        console.warn('No HuggingFace API key found in environment variables. AI features will use fallback implementations.');
        // Don't throw - allow fallback mode
      }
    } catch (error) {
      console.error('Failed to initialize HuggingFaceModelManager:', error);
      // Don't throw - allow fallback mode
    }
  }

  async storeApiKey(apiKey: string): Promise<void> {
    // This method is deprecated - API keys are now read from environment variables
    console.warn('storeApiKey is deprecated. Please set HUGGINGFACE_API_KEY in your .env file instead.');
    
    // Still support runtime override for testing
    this.config = { ...this.config, apiKey };
    this.hf = new HfInference(apiKey);
  }

  getFinancialAnalysisModel(): HuggingFaceModel {
    return this.models.financial_analysis;
  }

  getConversationalModel(): HuggingFaceModel {
    return this.models.conversational;
  }

  getClassificationModel(): HuggingFaceModel {
    return this.models.classification;
  }

  getEmbeddingModel(): HuggingFaceModel {
    return this.models.embedding;
  }

  async switchModel(queryType: QueryType): Promise<HuggingFaceModel> {
    const modelType = this.getModelTypeForQuery(queryType);
    const model = this.models[modelType];
    
    // Update last used time
    this.loadingStates[model.name] = {
      ...this.loadingStates[model.name],
      lastUsed: new Date()
    };

    return model;
  }

  async classifyText(text: string, candidateLabels: string[]): Promise<ClassificationResponse> {
    if (!this.hf) {
      throw new Error('HuggingFace client not initialized');
    }

    try {
      const model = this.getClassificationModel();
      
      // Use zero-shot classification API for facebook/bart-large-mnli
      const result = await this.hf.zeroShotClassification({
        model: model.name,
        inputs: text,
        parameters: { candidate_labels: candidateLabels }
      });

      // Convert HF result to our interface format - handle different response structures
      if (result && ((result as any).labels || (result as any).sequence)) {
        return {
          labels: (result as any).labels || candidateLabels,
          scores: (result as any).scores || candidateLabels.map(() => 0.5),
          sequence: (result as any).sequence || text
        };
      }

      // Handle array response format
      if (Array.isArray(result) && result.length > 0) {
        return {
          labels: result.map(r => r.label || candidateLabels[0]),
          scores: result.map(r => r.score || 0.5),
          sequence: text
        };
      }

      // Fallback if response structure is unexpected
      throw new Error('Unexpected response structure from zero-shot classification');
    } catch (error) {
      console.error('Classification failed, using fallback:', error);
      
      // Fallback classification using pattern matching
      const lowerText = text.toLowerCase();
      let bestLabel = candidateLabels[0];
      let bestScore = 0.5;

      candidateLabels.forEach(label => {
        if (lowerText.includes(label.toLowerCase())) {
          bestLabel = label;
          bestScore = 0.8;
        }
      });

      return {
        labels: [bestLabel, ...candidateLabels.filter(l => l !== bestLabel)],
        scores: [bestScore, ...candidateLabels.filter(l => l !== bestLabel).map(() => 0.2)],
        sequence: text
      };
    }
  }

  async generateConversationalResponse(
    inputs: string,
    pastUserInputs?: string[],
    generatedResponses?: string[]
  ): Promise<ConversationalResponse> {
    if (!this.hf) {
      throw new Error('HuggingFace client not initialized');
    }

    try {
      const model = this.getConversationalModel();
      
      // Try conversational API first (for BlenderBot/DialoGPT)
      try {
        const result = await (this.hf as any).conversational({
          model: model.name,
          inputs: {
            text: inputs,
            past_user_inputs: pastUserInputs || [],
            generated_responses: generatedResponses || []
          },
          parameters: {
            max_length: model.maxTokens || 150,
            temperature: model.temperature || 0.7,
            do_sample: true
          }
        });

        return {
          generated_text: result.generated_text,
          conversation: result.conversation
        };
      } catch (conversationalError) {
        // Fallback to text generation for models that don't support conversational
        const contextText = pastUserInputs && generatedResponses 
          ? pastUserInputs.map((input, i) => `Human: ${input}\nAssistant: ${generatedResponses[i] || 'I understand.'}`).join('\n') + `\nHuman: ${inputs}\nAssistant:`
          : `Human: ${inputs}\nAssistant:`;

        const textResult = await this.hf.textGeneration({
          model: model.name,
          inputs: contextText,
          parameters: {
            max_new_tokens: model.maxTokens || 150,
            temperature: model.temperature || 0.7,
            do_sample: true,
            return_full_text: false
          }
        });

        const generated_text = textResult.generated_text?.trim() || `I can help you with financial questions about spending, budgets, and transactions.`;

        return {
          generated_text,
          conversation: {
            past_user_inputs: [...(pastUserInputs || []), inputs],
            generated_responses: [...(generatedResponses || []), generated_text]
          }
        };
      }
    } catch (error) {
      console.error('Conversational generation failed, using fallback:', error);
      
      // Simple fallback response
      const generated_text = `Based on your message "${inputs}", I can help you with financial questions about spending, budgets, and transactions.`;
      
      return {
        generated_text,
        conversation: {
          past_user_inputs: pastUserInputs || [],
          generated_responses: generatedResponses || []
        }
      };
    }
  }

  async generateFinancialAnalysis(text: string): Promise<ModelResponse> {
    if (!this.hf) {
      throw new Error('HuggingFace client not initialized');
    }

    try {
      const model = this.getFinancialAnalysisModel();
      const startTime = Date.now();
      
      const result = await this.hf.textClassification({
        model: model.name,
        inputs: text
      });

      const processingTime = Date.now() - startTime;

      return {
        text: JSON.stringify(result),
        metadata: {
          model: model.name,
          processingTime
        }
      };
    } catch (error) {
      console.error('Financial analysis failed:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.hf) {
      throw new Error('HuggingFace client not initialized');
    }

    try {
      const model = this.getEmbeddingModel();
      
      // Use feature extraction API for sentence-transformers models
      const result = await this.hf.featureExtraction({
        model: model.name,
        inputs: text
      });

      // Handle different response formats
      if (Array.isArray(result)) {
        // If it's a nested array (batch), take the first embedding
        if (Array.isArray(result[0])) {
          return result[0] as number[];
        }
        // If it's a flat array, return as is
        return result as number[];
      }

      throw new Error('Unexpected embedding response format');
    } catch (error) {
      console.error('Embedding generation failed:', error);
      
      // Fallback: generate pseudo-embedding based on text characteristics
      return this.generateFallbackEmbedding(text);
    }
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple fallback: create pseudo-embedding based on text properties
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Match all-MiniLM-L6-v2 dimension
    
    // Basic text features
    embedding[0] = Math.min(text.length / 100, 1); // Text length
    embedding[1] = Math.min(words.length / 50, 1); // Word count
    
    // Simple word-based features
    words.forEach((word, index) => {
      const hash = this.simpleHash(word) % 380; // Use remaining dimensions
      embedding[hash + 2] = Math.min(embedding[hash + 2] + 0.1, 1);
    });
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private getModelTypeForQuery(queryType: QueryType): ModelType {
    switch (queryType) {
      case 'spending_summary':
      case 'budget_status':
      case 'balance_inquiry':
        return 'financial_analysis';
      case 'transaction_search':
        return 'classification';
      default:
        return 'general_purpose';
    }
  }

  getLoadingState(modelName: string): ModelLoadingState | undefined {
    return this.loadingStates[modelName];
  }

  isInitialized(): boolean {
    return this.hf !== null && this.config !== null;
  }
}

export default new HuggingFaceModelManager();