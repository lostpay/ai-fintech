import Constants from 'expo-constants';
import NVIDIANIMClient from './NVIDIANIMClient';
import {
  ModelType,
  ModelResponse,
  ClassificationResponse,
  ConversationalResponse,
  ModelLoadingState,
  QueryType
} from '../../types/ai';

interface NVIDIAModel {
  name: string;
  type: ModelType;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  isLoaded: boolean;
}

class NVIDIAModelManager {
  private models: Record<ModelType, NVIDIAModel> = {
    conversational: {
      name: Constants.expoConfig?.extra?.NVIDIA_CONVERSATIONAL_MODEL || 'openai/gpt-oss-20b',
      type: 'conversational',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      temperature: Number(Constants.expoConfig?.extra?.AI_TEMPERATURE) || 0.7,
      maxTokens: Number(Constants.expoConfig?.extra?.AI_MAX_TOKENS) || 300,
      isLoaded: false
    },
    financial_analysis: {
      name: Constants.expoConfig?.extra?.NVIDIA_FINANCIAL_MODEL || 'openai/gpt-oss-20b',
      type: 'financial_analysis',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      temperature: 0.3,
      maxTokens: 400,
      isLoaded: false
    },
    classification: {
      name: Constants.expoConfig?.extra?.NVIDIA_CLASSIFICATION_MODEL || 'openai/gpt-oss-20b',
      type: 'classification',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      temperature: 0.1,
      maxTokens: 50,
      isLoaded: false
    },
    general_purpose: {
      name: Constants.expoConfig?.extra?.NVIDIA_GENERAL_MODEL || 'openai/gpt-oss-20b',
      type: 'general_purpose',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      temperature: Number(Constants.expoConfig?.extra?.AI_TEMPERATURE) || 0.5,
      maxTokens: Number(Constants.expoConfig?.extra?.AI_MAX_TOKENS) || 200,
      isLoaded: false
    }
  };

  private loadingStates: Record<string, ModelLoadingState> = {};

  async initialize(): Promise<void> {
    try {
      // Initialize NVIDIA NIM client
      await NVIDIANIMClient.initialize();
      
      if (NVIDIANIMClient.isInitialized()) {
        // Mark all models as loaded since we use the same NVIDIA NIM endpoint
        Object.values(this.models).forEach(model => {
          model.isLoaded = true;
          this.loadingStates[model.name] = {
            isLoading: false,
            isLoaded: true,
            error: null,
            lastUsed: new Date()
          };
        });
        
        console.log('NVIDIA Model Manager initialized successfully');
      } else {
        console.warn('NVIDIA NIM client initialization failed. AI features will use fallback implementations.');
      }
    } catch (error) {
      console.error('Failed to initialize NVIDIA Model Manager:', error);
      // Don't throw - allow fallback mode
    }
  }

  getFinancialAnalysisModel(): NVIDIAModel {
    return this.models.financial_analysis;
  }

  getConversationalModel(): NVIDIAModel {
    return this.models.conversational;
  }

  getClassificationModel(): NVIDIAModel {
    return this.models.classification;
  }

  async switchModel(queryType: QueryType): Promise<NVIDIAModel> {
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
    try {
      const result = await NVIDIANIMClient.classifyQuery(text, candidateLabels);
      return result;
    } catch (error) {
      console.error('NVIDIA classification failed, using fallback:', error);
      
      // Fallback classification using pattern matching
      return this.fallbackClassification(text, candidateLabels);
    }
  }

  async generateConversationalResponse(
    inputs: string,
    pastUserInputs?: string[],
    generatedResponses?: string[],
    financialContext?: string
  ): Promise<ConversationalResponse> {
    try {
      // Convert to conversation history format
      const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      if (pastUserInputs && generatedResponses) {
        for (let i = 0; i < Math.min(pastUserInputs.length, generatedResponses.length); i++) {
          conversationHistory.push({role: 'user', content: pastUserInputs[i]});
          conversationHistory.push({role: 'assistant', content: generatedResponses[i]});
        }
      }

      const result = await NVIDIANIMClient.generateConversationalResponse(
        inputs,
        financialContext,
        conversationHistory
      );
      
      return result;
    } catch (error) {
      console.error('NVIDIA conversational generation failed, using fallback:', error);
      
      // Fallback response
      const generated_text = `Based on your message "${inputs}", I can help you with financial questions about spending, budgets, and transactions. ${financialContext ? `Here's what I found: ${financialContext}` : ''}`;
      
      return {
        generated_text,
        conversation: {
          past_user_inputs: pastUserInputs || [],
          generated_responses: generatedResponses || []
        }
      };
    }
  }

  async generateFinancialAnalysis(text: string, financialData?: any): Promise<ModelResponse> {
    try {
      const result = await NVIDIANIMClient.generateFinancialAnalysis(text, financialData);
      return result;
    } catch (error) {
      console.error('NVIDIA financial analysis failed:', error);
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
        return 'conversational';
    }
  }

  private fallbackClassification(text: string, candidateLabels: string[]): ClassificationResponse {
    const lowerText = text.toLowerCase();
    let bestLabel = candidateLabels[0];
    let bestScore = 0.5;

    candidateLabels.forEach(label => {
      const labelWords = label.toLowerCase().replace('_', ' ').split(' ');
      const matchCount = labelWords.filter(word => lowerText.includes(word)).length;
      const score = Math.min(0.9, 0.3 + (matchCount / labelWords.length) * 0.6);
      
      if (score > bestScore) {
        bestLabel = label;
        bestScore = score;
      }
    });

    return {
      labels: [bestLabel, ...candidateLabels.filter(l => l !== bestLabel)],
      scores: [bestScore, ...candidateLabels.filter(l => l !== bestLabel).map(() => (1 - bestScore) / (candidateLabels.length - 1))],
      sequence: text
    };
  }

  getLoadingState(modelName: string): ModelLoadingState | undefined {
    return this.loadingStates[modelName];
  }

  isInitialized(): boolean {
    return NVIDIANIMClient.isInitialized();
  }

  async healthCheck(): Promise<boolean> {
    return await NVIDIANIMClient.healthCheck();
  }

  getModelInfo(): Record<ModelType, NVIDIAModel> {
    return { ...this.models };
  }

  getActiveModel(): string {
    return NVIDIANIMClient.getModel();
  }
}

export default new NVIDIAModelManager();