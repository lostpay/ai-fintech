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
      name: Constants.expoConfig?.extra?.HF_FINANCIAL_MODEL || 'ProsusAI/finbert',
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
      name: Constants.expoConfig?.extra?.HF_GENERAL_MODEL || 'google/flan-t5-base',
      type: 'general_purpose',
      endpoint: '',
      temperature: Number(Constants.expoConfig?.extra?.AI_TEMPERATURE) || 0.5,
      maxTokens: Number(Constants.expoConfig?.extra?.AI_MAX_TOKENS) || 100,
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
      
      // Use proper HuggingFace text classification API
      const result = await this.hf.textClassification({
        model: model.name,
        inputs: text
      });

      // Convert HF result to our interface format
      if (Array.isArray(result)) {
        return {
          labels: result.map(r => r.label),
          scores: result.map(r => r.score),
          sequence: text
        };
      }

      // Fallback for single result
      return {
        labels: [result.label],
        scores: [result.score],
        sequence: text
      };
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
      
      // Use proper HuggingFace chat completion API
      const messages = [
        ...pastUserInputs?.map((input, i) => [
          { role: 'user' as const, content: input },
          { role: 'assistant' as const, content: generatedResponses?.[i] || 'I understand.' }
        ]).flat() || [],
        { role: 'user' as const, content: inputs }
      ];

      const response = await this.hf.chatCompletion({
        model: model.name,
        messages: messages,
        max_tokens: model.maxTokens || 150,
        temperature: model.temperature || 0.7
      });

      const generated_text = response.choices?.[0]?.message?.content || `Response to: ${inputs}`;

      return {
        generated_text,
        conversation: {
          past_user_inputs: [...(pastUserInputs || []), inputs],
          generated_responses: [...(generatedResponses || []), generated_text]
        }
      };
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