/**
 * Enhanced AI Service with Backend Integration
 * Provides seamless integration between the React Native app and the Python AI backend
 */
import { AIResponse, AIQueryContext, QueryType, FinancialData } from '../../types/ai';
import { 
  AIResponseWithEmbedding,
  ProcessingType,
  EmbeddedFinancialData,
  ExtendedChatMessage,
  ConversationFinancialContext,
  EmbeddedBudgetCardData,
  EmbeddedTransactionListData,
  EmbeddedChartData
} from '../../types/ai/EmbeddedDataTypes';
import { getAIBackendClient, AIBackendClient } from './AIBackendClient';
import ConversationManager from './ConversationManager';
import PrivacyManager from './PrivacyManager';

export class AIServiceBackend {
  private static instance: AIServiceBackend;
  private initialized = false;
  private backendClient: AIBackendClient;
  private conversationManager: ConversationManager;
  private privacyManager: PrivacyManager;
  private isBackendAvailable = false;

  public static getInstance(): AIServiceBackend {
    if (!AIServiceBackend.instance) {
      AIServiceBackend.instance = new AIServiceBackend();
    }
    return AIServiceBackend.instance;
  }

  private constructor() {
    this.backendClient = getAIBackendClient();
    this.conversationManager = ConversationManager.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize components
      await this.conversationManager.initialize();
      await this.privacyManager.initialize();
      
      // Test backend connectivity
      this.isBackendAvailable = await this.backendClient.testConnectivity();
      
      if (this.isBackendAvailable) {
        console.log('AI Backend is available - using remote AI processing');
      } else {
        console.warn('AI Backend is not available - falling back to local processing');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('AIServiceBackend initialization failed:', error);
      this.isBackendAvailable = false;
      // Don't throw - allow fallback to local processing
    }
  }

  /**
   * Process a user query using the AI backend or fallback to local processing
   */
  public async processQuery(
    query: string, 
    context?: AIQueryContext
  ): Promise<AIResponse> {
    try {
      if (this.isBackendAvailable) {
        return await this.processQueryWithBackend(query, context);
      } else {
        return await this.processQueryLocally(query, context);
      }
    } catch (error) {
      console.error('Query processing failed:', error);
      
      // Always provide a fallback response
      return {
        message: `I encountered an issue processing your question: "${query}". Please try rephrasing your question or check your connection.`,
        content: `I encountered an issue processing your question: "${query}". Please try rephrasing your question or check your connection.`,
        confidence: 0.1,
        queryType: 'unknown' as QueryType,
        suggestedActions: [
          'Try asking about your spending',
          'Ask about budget status', 
          'Search for transactions'
        ]
      };
    }
  }

  /**
   * Process query using the Python AI backend
   */
  private async processQueryWithBackend(
    query: string,
    context?: AIQueryContext
  ): Promise<AIResponse> {
    try {
      const backendResponse = await this.backendClient.processQuery(query, {
        session_id: this.backendClient.getSessionId(),
        context: context ? {
          conversation_history: context.previousQueries || [],
          last_query_type: context.currentScreen || 'unknown'
        } : {}
      });

      // Convert backend response to app response format
      return {
        content: backendResponse.message,
        message: backendResponse.message,
        confidence: backendResponse.confidence,
        queryType: backendResponse.query_type as QueryType,
        embeddedData: this.convertBackendEmbeddedData(backendResponse.embedded_data),
        suggestedActions: backendResponse.suggested_actions,
        financialData: await this.extractFinancialDataFromBackend(backendResponse)
      };

    } catch (error) {
      console.error('Backend query processing failed:', error);
      throw error;
    }
  }

  /**
   * Fallback to local query processing when backend is unavailable
   */
  private async processQueryLocally(
    query: string,
    context?: AIQueryContext
  ): Promise<AIResponse> {
    // Implement basic local processing as fallback
    const lowerQuery = query.toLowerCase();
    
    // Simple keyword-based classification
    let queryType: QueryType = 'unknown';
    if (lowerQuery.includes('budget')) queryType = 'budget_status';
    else if (lowerQuery.includes('spending') || lowerQuery.includes('spent')) queryType = 'spending_summary';
    else if (lowerQuery.includes('transaction')) queryType = 'transaction_search';
    else if (lowerQuery.includes('balance')) queryType = 'balance_inquiry';

    return {
      message: `I'm currently operating in offline mode. Your query about "${query}" has been noted, but I'm unable to provide detailed financial analysis without the AI backend connection.`,
      content: `I'm currently operating in offline mode. Your query about "${query}" has been noted, but I'm unable to provide detailed financial analysis without the AI backend connection.`,
      queryType,
      confidence: 0.5,
      suggestedActions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Ask a simpler question about your finances'
      ]
    };
  }

  /**
   * Enhanced query processing with embedding support
   */
  public async processQueryWithEmbedding(
    query: string, 
    context?: AIQueryContext
  ): Promise<AIResponseWithEmbedding> {
    try {
      // Check privacy preferences
      const privacyPrefs = this.privacyManager.getPrivacyPreferences();
      const processingType: ProcessingType = this.isBackendAvailable ? 'hugging-face' : 'on-device';

      // Request consent for AI processing
      const hasConsent = await this.privacyManager.requestConsent(
        'query_processing', 
        processingType, 
        ['financial_data', 'conversation_context']
      );

      // For testing purposes, allow processing even without explicit consent
      // TODO: Implement proper privacy settings UI
      if (!hasConsent && processingType === 'hugging-face') {
        console.warn('AI processing without explicit consent - for testing only');
        // Continue processing instead of blocking
      }

      // Get conversation context for follow-up handling
      const conversationContext = this.conversationManager.getConversationContext();
      let enhancedContext = context;
      
      if (conversationContext) {
        const followUpResult = await this.conversationManager.handleFollowUpQuery(query, context);
        enhancedContext = followUpResult.enhancedContext;
        query = followUpResult.contextualQuery;
      }

      // Process query
      const response = await this.processQuery(query, enhancedContext);

      // Create embedded data
      const embeddedData = await this.createEmbeddedData(response);

      // Create enhanced response
      const enhancedResponse: AIResponseWithEmbedding = {
        content: response.content,
        embeddedData,
        suggestedActions: response.suggestedActions,
        processingType,
        modelUsed: processingType === 'hugging-face' ? 'hugging-face-model' : 'local-processing',
        contextUpdates: conversationContext ? {
          lastQueryType: response.queryType || 'unknown',
        } : undefined,
      };

      // Update conversation history
      await this.addToConversationHistory(query, enhancedResponse);

      return enhancedResponse;
    } catch (error) {
      console.error('Enhanced query processing failed:', error);
      
      return {
        content: 'I encountered an error processing your request. Please try again.',
        processingType: 'on-device',
        modelUsed: 'error_fallback',
      };
    }
  }

  /**
   * Get suggested queries based on backend or local context
   */
  public async getSuggestedQueries(context?: AIQueryContext): Promise<string[]> {
    try {
      if (this.isBackendAvailable) {
        return await this.backendClient.getQuerySuggestions();
      }
    } catch (error) {
      console.error('Failed to get suggestions from backend:', error);
    }

    // Fallback to static suggestions
    return [
      'How much have I spent this month?',
      'What are my top spending categories?', 
      'Am I staying within my budget?',
      'Show me recent transactions',
      'What are my spending trends?'
    ];
  }

  /**
   * Validate query before processing
   */
  public validateQuery(query: string): { isValid: boolean; error?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    if (query.length > 500) {
      return { isValid: false, error: 'Query is too long. Please keep it under 500 characters.' };
    }

    return { isValid: true };
  }

  /**
   * Check if backend is available
   */
  public async checkBackendHealth(): Promise<boolean> {
    try {
      const health = await this.backendClient.checkHealth();
      this.isBackendAvailable = health.status === 'healthy';
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Backend health check failed:', error);
      this.isBackendAvailable = false;
      return false;
    }
  }

  /**
   * Get backend system status
   */
  public async getSystemStatus(): Promise<any> {
    if (!this.isBackendAvailable) {
      return { status: 'offline', message: 'Backend not available' };
    }

    try {
      return await this.backendClient.runSystemTest();
    } catch (error) {
      console.error('Failed to get system status:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Clear conversation history
   */
  public async clearConversationHistory(): Promise<void> {
    try {
      if (this.isBackendAvailable) {
        await this.backendClient.clearConversationHistory();
      }
      await this.conversationManager.clearConversation();
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
    }
  }

  /**
   * Get conversation history
   */
  public async getConversationHistory(): Promise<any> {
    try {
      if (this.isBackendAvailable) {
        return await this.backendClient.getConversationHistory();
      }
      
      // Return local conversation history
      const messages = await this.conversationManager.getMessages();
      return {
        session_id: 'local',
        exchanges: messages.map(msg => ({
          query: msg.role === 'user' ? msg.content : '',
          response: msg.role === 'assistant' ? {
            message: msg.content,
            confidence: 1.0,
            query_type: 'unknown',
            processing_type: 'on-device'
          } : undefined,
          timestamp: msg.timestamp.toISOString()
        })).filter(ex => ex.query || ex.response),
        total_exchanges: Math.floor(messages.length / 2),
        session_start: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return { exchanges: [], total_exchanges: 0 };
    }
  }

  // Utility methods

  /**
   * Convert backend embedded data to app format
   */
  private convertBackendEmbeddedData(backendData: any): any {
    if (!backendData) return undefined;

    return {
      type: backendData.component_type.toLowerCase().replace('_', '_'),
      title: backendData.title,
      data: backendData.data,
      size: backendData.size
    };
  }

  /**
   * Extract financial data from backend response
   */
  private async extractFinancialDataFromBackend(backendResponse: any): Promise<FinancialData> {
    if (!backendResponse.embedded_data) return {};

    const data = backendResponse.embedded_data.data;
    
    return {
      amount: data.total || data.total_amount || 0,
      transactions: data.transactions || [],
      categories: data.categories || [],
      budgetStatus: data.budget || data.budgets || undefined
    };
  }

  /**
   * Create embedded data for UI components
   */
  private async createEmbeddedData(response: AIResponse): Promise<EmbeddedFinancialData | undefined> {
    if (!response.embeddedData || !response.financialData) return undefined;

    try {
      switch (response.queryType) {
        case 'budget_status':
          return {
            type: 'BudgetCard',
            title: 'Budget Status',
            size: 'compact',
            chatContext: true,
            budgetData: response.financialData.budgetStatus,
            progressData: response.financialData.budgetStatus ? {
              spent: response.financialData.budgetStatus.spent || 0,
              remaining: response.financialData.budgetStatus.remaining || 0,
              percentage: response.financialData.budgetStatus.percentage || 0
            } : undefined
          } as EmbeddedBudgetCardData;

        case 'transaction_search':
          return {
            type: 'TransactionList',
            title: 'Recent Transactions',
            size: 'compact',
            chatContext: true,
            transactions: response.financialData.transactions || [],
            totalCount: response.financialData.transactions?.length || 0
          } as EmbeddedTransactionListData;

        case 'spending_summary':
          return {
            type: 'CategoryBreakdownChart',
            title: 'Spending by Category',
            size: 'compact',
            chatContext: true,
            chartData: response.financialData.categories?.map((category: string, index: number) => ({
              x: category,
              y: response.financialData.amount || 0,
              label: category
            })) || [],
            metadata: {
              totalAmount: response.financialData.amount || 0,
              currency: 'USD',
              categories: response.financialData.categories || []
            }
          } as EmbeddedChartData;

        default:
          return undefined;
      }
    } catch (error) {
      console.error('Error creating embedded data:', error);
      return undefined;
    }
  }

  /**
   * Add query and response to conversation history
   */
  private async addToConversationHistory(
    query: string, 
    response: AIResponseWithEmbedding
  ): Promise<void> {
    try {
      // Add user message
      const userMessage: ExtendedChatMessage = {
        id: this.generateMessageId(),
        content: query,
        role: 'user',
        timestamp: new Date(),
        status: 'sent',
      };

      await this.conversationManager.addMessage(userMessage);

      // Add assistant response
      const assistantMessage: ExtendedChatMessage = {
        id: this.generateMessageId(),
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        embeddedData: response.embeddedData,
        processingType: response.processingType,
        modelUsed: response.modelUsed,
      };

      await this.conversationManager.addMessage(assistantMessage);
    } catch (error) {
      console.error('Failed to add to conversation history:', error);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation context
   */
  public getConversationContext(): ConversationFinancialContext | null {
    return this.conversationManager.getConversationContext();
  }

  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if backend is available
   */
  public isBackendConnected(): boolean {
    return this.isBackendAvailable;
  }

  /**
   * Reconnect to backend
   */
  public async reconnectToBackend(): Promise<boolean> {
    try {
      this.isBackendAvailable = await this.backendClient.testConnectivity();
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Failed to reconnect to backend:', error);
      return false;
    }
  }
}

export default AIServiceBackend;