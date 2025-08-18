import { AIResponse, AIQueryContext, QueryType, FinancialData } from '../../types/ai';
import { 
  EmbeddedBudgetCardData, 
  EmbeddedTransactionListData, 
  EmbeddedChartData,
  AIResponseWithEmbedding,
  ProcessingType,
  EmbeddedFinancialData,
  ExtendedChatMessage,
  ConversationFinancialContext
} from '../../types/ai/EmbeddedDataTypes';
import { DatabaseService } from '../DatabaseService';
import { BudgetAnalyticsService } from '../BudgetAnalyticsService';
import { BudgetCalculationService } from '../BudgetCalculationService';
import { Category } from '../../types/Category';
import { getAIBackendClient, AIBackendClient, AIQueryResponse } from './AIBackendClient';
// Keep these for fallback only
import HuggingFaceModelManager from './HuggingFaceModelManager';
import LangChainOrchestrator from './LangChainOrchestrator';
import AIQueryProcessor from './AIQueryProcessor';
import ConversationManager from './ConversationManager';
import PrivacyManager from './PrivacyManager';

export class AIService {
  private static instance: AIService;
  private initialized = false;
  private backendClient: AIBackendClient;
  private conversationManager: ConversationManager;
  private privacyManager: PrivacyManager;
  private backendConnected = false;

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
    this.backendClient = getAIBackendClient();
    this.conversationManager = ConversationManager.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test backend connection first
      console.log('🔗 Testing AI backend connection...');
      const connectionStatus = await this.backendClient.getConnectionStatus();
      console.log('🔍 Connection status:', connectionStatus);
      const isBackendConnected = connectionStatus.connected;
      
      if (isBackendConnected) {
        console.log('✅ Backend connected - using AI backend with real database data');
        this.backendConnected = true;
      } else {
        console.log('⚠️ Backend not available - will use fallback mode with local database');
        this.backendConnected = false;
      }

      // Initialize database (still needed for fallback mode)
      const databaseService = DatabaseService.getInstance();
      await databaseService.initialize();
      console.log('Database initialized for AI service');

      // If backend is not connected, initialize fallback AI components
      if (!this.backendConnected) {
        try {
          await HuggingFaceModelManager.initialize();
          console.log('HuggingFace models initialized (fallback mode)');
          
          await AIQueryProcessor.initialize();
          console.log('Enhanced AIQueryProcessor initialized with hybrid routing');
          
          await LangChainOrchestrator.initialize();
          console.log('LangChain orchestrator initialized (fallback mode)');
        } catch (error) {
          console.warn('Fallback AI components failed to initialize:', error);
        }
      }
      
      await this.conversationManager.initialize();
      console.log('Conversation manager initialized');
      
      await this.privacyManager.initialize();
      console.log('Privacy manager initialized');
      
      this.initialized = true;
      console.log(`✅ AIService initialized ${this.backendConnected ? 'with backend integration' : 'in fallback mode'}`);
    } catch (error) {
      console.error('AIService initialization failed:', error);
      this.initialized = false;
      this.backendConnected = false;
    }
  }

  /**
   * Process a user query and return an AI response
   * Routes through backend or falls back to local processing
   */
  public async processQuery(
    query: string, 
    context?: AIQueryContext
  ): Promise<AIResponse> {
    // Ensure initialization before processing
    if (!this.initialized) {
      console.log('AIService not initialized, attempting initialization...');
      await this.initialize();
    }

    // Try backend processing first if connected
    if (this.backendConnected) {
      try {
        console.log('🔀 Routing query to AI backend:', query);
        return await this.processQueryWithBackend(query, context);
      } catch (error) {
        console.error('Backend processing failed, falling back to local AI:', error);
        this.backendConnected = false; // Mark backend as disconnected
      }
    }

    // Try local AI processing if backend failed or not available
    if (this.initialized) {
      try {
        console.log('🔄 Using local AI processing:', query);
        return await this.processQueryWithAI(query, context);
      } catch (error) {
        console.error('Local AI processing failed, falling back to database-only responses:', error);
      }
    }

    // Fallback to enhanced placeholder logic
    await this.delay(1500);

    // Enhanced fallback response logic with better free-form query handling
    const lowerQuery = query.toLowerCase();

    try {
      // Get actual financial data for fallback responses
      const databaseService = DatabaseService.getInstance();
      await databaseService.initialize();

      // Enhanced pattern matching for free-form queries
      const patterns = {
        topCategories: /\b(top|biggest|highest|largest|number\s*1|#\s*1)\b.*\b(category|categories|spending|expense)\b/i,
        spending: /\b(spend|spent|expense|expenditure|cost|money)\b/i,
        budget: /\b(budget|budgets|budgeted)\b/i,
        transactions: /\b(transaction|transactions|recent|last|purchase|purchases)\b/i,
        merchant: /\b(at|from)\s+([A-Z][a-zA-Z\s&'-]+)(?:\s|$)/,
        timeframe: {
          lastNDays: /\blast (\d+) days?\b/i,
          thisMonth: /\bthis month\b/i,
          lastMonth: /\blast month\b/i
        }
      };

      // Enhanced pattern matching for top categories queries
      if (patterns.topCategories.test(lowerQuery)) {
        const transactions = await databaseService.getTransactionsWithCategories(undefined, 'expense');
        const categoryTotals = transactions.reduce((acc, t) => {
          const category = t.category_name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);
        
        const sortedCategories = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        if (sortedCategories.length > 0) {
          const [topCategory, topAmount] = sortedCategories[0];
          return {
            content: `Your #1 top spending category is "${topCategory}" with $${(topAmount / 100).toFixed(2)} spent.${sortedCategories.length > 1 ? ` Your top 5 categories are: ${sortedCategories.map(([cat, amt]) => `${cat} ($${(amt / 100).toFixed(2)})`).join(', ')}.` : ''}`,
            message: `Your #1 top spending category is "${topCategory}" with $${(topAmount / 100).toFixed(2)} spent.`,
            confidence: 0.95,
            queryType: 'spending_summary' as QueryType,
            embeddedData: {
              type: 'CategoryBreakdownChart',
              title: 'Top Spending Categories',
              chartData: sortedCategories.map(([name, amount]) => ({
                x: name,
                y: amount / 100,
                label: name,
              })),
              metadata: {
                totalAmount: Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0),
                currency: 'USD',
                categories: []
              },
              size: 'compact',
              chatContext: true,
            },
            suggestedActions: [
              'Analyze spending trends',
              'Set category budgets',
              'View transaction details'
            ]
          };
        }
      }

      // Enhanced budget and spending queries  
      if (patterns.budget.test(lowerQuery) || patterns.spending.test(lowerQuery)) {
        const budgets = await databaseService.getBudgetsWithDetails();
        const currentMonth = new Date();
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthTransactions = await databaseService.getTransactions(undefined, 'expense', monthStart, currentMonth);
        
        const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
        
        return {
          content: `Based on your current data, you've spent $${(totalSpent / 100).toFixed(2)} this month${totalBudgeted > 0 ? ` out of a total budget of $${(totalBudgeted / 100).toFixed(2)}` : ''}. ${budgets.length === 0 ? 'Consider setting up budgets to track your spending better.' : ''}`,
          message: `Based on your current data, you've spent $${(totalSpent / 100).toFixed(2)} this month${totalBudgeted > 0 ? ` out of a total budget of $${(totalBudgeted / 100).toFixed(2)}` : ''}. ${budgets.length === 0 ? 'Consider setting up budgets to track your spending better.' : ''}`,
          confidence: 0.9,
          queryType: 'budget_status' as QueryType,
          embeddedData: budgets.length > 0 ? {
            type: 'BudgetCard',
            title: 'Budget Overview',
            budgetData: budgets[0],
            progressData: {
              spent: budgets[0].spent_amount || 0,
              remaining: budgets[0].amount - (budgets[0].spent_amount || 0),
              percentage: budgets[0].percentage || 0,
            },
            size: 'compact',
            chatContext: true,
          } : undefined,
          suggestedActions: [
            'View detailed budget breakdown',
            'Set up budget alerts',
            'Review spending patterns'
          ]
        };
      }

      // Enhanced merchant-specific queries
      const merchantMatch = patterns.merchant.exec(query);
      if (merchantMatch) {
        const merchantName = merchantMatch[2].trim();
        const allTransactions = await databaseService.getTransactionsWithCategories();
        const merchantTransactions = allTransactions.filter(t => 
          t.description?.toLowerCase().includes(merchantName.toLowerCase())
        );
        
        const totalSpent = merchantTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return {
          content: `You've spent $${(totalSpent / 100).toFixed(2)} at ${merchantName} across ${merchantTransactions.length} transactions.${merchantTransactions.length === 0 ? ' No transactions found for this merchant.' : ''}`,
          message: `You've spent $${(totalSpent / 100).toFixed(2)} at ${merchantName} across ${merchantTransactions.length} transactions.`,
          confidence: 0.85,
          queryType: 'transaction_search' as QueryType,
          embeddedData: merchantTransactions.length > 0 ? {
            type: 'TransactionList',
            title: `Transactions at ${merchantName}`,
            transactions: merchantTransactions.slice(0, 10),
            totalCount: merchantTransactions.length,
            size: 'compact',
            chatContext: true,
          } : undefined,
          suggestedActions: [
            'View all transactions',
            'Set spending alerts for merchant',
            'Analyze spending patterns'
          ]
        };
      }

      // Enhanced timeframe-specific queries
      const lastNDaysMatch = patterns.timeframe.lastNDays.exec(lowerQuery);
      if (lastNDaysMatch) {
        const days = parseInt(lastNDaysMatch[1]);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        const timeframeTransactions = await databaseService.getTransactions(undefined, 'expense', startDate, endDate);
        
        const totalSpent = timeframeTransactions.reduce((sum, t) => sum + t.amount, 0);
        const avgDaily = totalSpent / days;
        
        return {
          content: `In the last ${days} days, you've spent $${(totalSpent / 100).toFixed(2)} across ${timeframeTransactions.length} transactions. That's an average of $${(avgDaily / 100).toFixed(2)} per day.`,
          message: `In the last ${days} days, you've spent $${(totalSpent / 100).toFixed(2)} across ${timeframeTransactions.length} transactions.`,
          confidence: 0.9,
          queryType: 'spending_summary' as QueryType,
          embeddedData: timeframeTransactions.length > 0 ? {
            type: 'TransactionList',
            title: `Last ${days} Days Spending`,
            transactions: timeframeTransactions.slice(0, 10),
            totalCount: timeframeTransactions.length,
            size: 'compact',
            chatContext: true,
          } : undefined,
          suggestedActions: [
            'View spending trends',
            'Compare with previous period',
            'Set spending goals'
          ]
        };
      }

      if (patterns.transactions.test(lowerQuery)) {
        const recentTransactions = await databaseService.getTransactionsWithCategories(undefined, undefined, undefined, undefined);
        const last10 = recentTransactions.slice(0, 10);
        
        return {
          content: `Here are your ${last10.length} most recent transactions${last10.length === 0 ? '. You haven\'t recorded any transactions yet - start by adding your first expense!' : ', showing real data from your account.'}`,
          message: `Here are your ${last10.length} most recent transactions${last10.length === 0 ? '. You haven\'t recorded any transactions yet - start by adding your first expense!' : ', showing real data from your account.'}`,
          confidence: 0.9,
          queryType: 'transaction_search' as QueryType,
          embeddedData: last10.length > 0 ? {
            type: 'TransactionList',
            title: 'Recent Transactions',
            transactions: last10,
            totalCount: recentTransactions.length,
            size: 'compact',
            chatContext: true,
          } : undefined
        };
      }

      if (lowerQuery.includes('category') || lowerQuery.includes('breakdown')) {
        const transactions = await databaseService.getTransactionsWithCategories(undefined, 'expense');
        const categoryTotals = transactions.reduce((acc, t) => {
          const category = t.category_name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);
        
        const chartData = Object.entries(categoryTotals).map(([name, amount]) => ({
          x: name,
          y: amount / 100, // Convert to dollars
          label: name,
        }));
        
        return {
          content: `I've analyzed your spending across ${Object.keys(categoryTotals).length} categories${chartData.length === 0 ? '. No expenses found - start by adding some transactions to see category breakdowns.' : ', showing your actual spending patterns.'}`,
          message: `I've analyzed your spending across ${Object.keys(categoryTotals).length} categories${chartData.length === 0 ? '. No expenses found - start by adding some transactions to see category breakdowns.' : ', showing your actual spending patterns.'}`,
          confidence: 0.9,
          queryType: 'spending_summary' as QueryType,
          embeddedData: chartData.length > 0 ? {
            type: 'CategoryBreakdownChart',
            title: 'Spending by Category',
            chartData,
            metadata: {
              totalAmount: Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0),
              currency: 'USD',
              categories: []
            },
            size: 'compact',
            chatContext: true,
          } : undefined
        };
      }
    } catch (error) {
      console.error('Error getting database data for fallback response:', error);
    }

    // Default response
    return {
      message: `Thank you for your question: "${query}". This is a placeholder response from the AI assistant. In the full implementation, I'll provide intelligent insights about your finances, spending patterns, and budget recommendations.`,
      content: `Thank you for your question: "${query}". This is a placeholder response from the AI assistant. In the full implementation, I'll provide intelligent insights about your finances, spending patterns, and budget recommendations.`,
      confidence: 0.5,
      queryType: 'unknown' as QueryType,
      suggestedActions: [
        'Ask about your monthly budget',
        'Review recent transactions',
        'Analyze spending categories'
      ]
    };
  }

  /**
   * Get suggested queries based on user context
   */
  public getSuggestedQueries(context?: AIQueryContext): string[] {
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

    // Add any other validation rules as needed
    return { isValid: true };
  }

  /**
   * Utility method to simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process query using the AI backend (with real database integration)
   */
  private async processQueryWithBackend(query: string, context?: AIQueryContext): Promise<AIResponse> {
    try {
      const backendResponse: AIQueryResponse = await this.backendClient.processQuery(query, context);
      
      // Convert backend response to frontend format
      return {
        content: backendResponse.message,
        message: backendResponse.message,
        confidence: backendResponse.confidence,
        queryType: this.mapBackendQueryType(backendResponse.query_type),
        suggestedActions: backendResponse.suggested_actions || [],
        // Convert embedded data if present
        embeddedData: backendResponse.embedded_data ? 
          this.convertBackendEmbeddedData(backendResponse.embedded_data) : undefined,
      };
    } catch (error) {
      console.error('Backend query processing failed:', error);
      throw error;
    }
  }

  /**
   * Convert backend embedded data to frontend format
   */
  private convertBackendEmbeddedData(backendData: any): EmbeddedFinancialData | undefined {
    if (!backendData) return undefined;

    switch (backendData.component_type) {
      case 'BudgetCard':
      case 'budget_card':
        return {
          type: 'BudgetCard',
          title: backendData.title,
          budgetData: backendData.data.budget,
          progressData: backendData.data.progress,
          size: backendData.size === 'compact' ? 'compact' : 'full',
          chatContext: true,
        } as EmbeddedBudgetCardData;

      case 'TransactionList':
      case 'transaction_list':
        return {
          type: 'TransactionList',
          title: backendData.title,
          transactions: backendData.data.transactions,
          totalCount: backendData.data.total_count,
          size: backendData.size === 'compact' ? 'compact' : 'full',
          chatContext: true,
        } as EmbeddedTransactionListData;

      case 'CategoryBreakdownChart':
      case 'category_chart':
        return {
          type: 'CategoryBreakdownChart',
          title: backendData.title,
          chartData: backendData.data.chart_data,
          metadata: backendData.data.metadata,
          size: backendData.size === 'compact' ? 'compact' : 'full',
          chatContext: true,
        } as EmbeddedChartData;

      default:
        console.warn('Unknown backend embedded data type:', backendData.component_type);
        return undefined;
    }
  }

  /**
   * Map backend query types to frontend types
   */
  private mapBackendQueryType(backendType: string): QueryType {
    const typeMap: Record<string, QueryType> = {
      'spending_summary': 'spending_summary',
      'budget_status': 'budget_status', 
      'balance_inquiry': 'balance_inquiry',
      'transaction_search': 'transaction_search',
      'unknown': 'unknown',
    };
    
    return typeMap[backendType] || 'unknown';
  }

  /**
   * New AI processing method using HuggingFace and LangChain (fallback)
   */
  private async processQueryWithAI(query: string, context?: AIQueryContext): Promise<AIResponse> {
    try {
      // Parse and classify the query
      const queryResult = await AIQueryProcessor.processQuery(query);
      
      if (!queryResult.isValid) {
        return {
          content: 'I didn\'t understand that query. ' + (queryResult.suggestions?.[0] || ''),
          message: 'I didn\'t understand that query. ' + (queryResult.suggestions?.[0] || ''),
          confidence: 0,
          queryType: 'unknown',
          error: queryResult.errors?.[0],
          suggestions: queryResult.suggestions
        };
      }

      // Get financial data based on query type
      const financialData = await this.getFinancialData(queryResult.classification.type, queryResult.parsedQuery);
      
      // Generate response using LangChain
      const aiResponse = await this.generateAIResponse(financialData, queryResult.classification.type, query);
      
      // Create embedded data for UI components
      const embeddedData = this.createEmbeddedData(financialData, queryResult.classification.type);

      return {
        content: aiResponse,
        message: aiResponse,
        confidence: queryResult.classification.confidence,
        queryType: queryResult.classification.type,
        financialData,
        embeddedData
      };

    } catch (error) {
      console.error('Error in AI processing:', error);
      throw error;
    }
  }

  private async generateAIResponse(data: FinancialData, queryType: QueryType, originalQuery: string): Promise<string> {
    try {
      // Use LangChain for conversational response generation
      const response = await LangChainOrchestrator.processFinancialQuery(originalQuery, data);
      
      if (response && response.trim()) {
        return response;
      }

      // Fallback to template-based responses
      return this.generateTemplateResponse(data, queryType);

    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateTemplateResponse(data, queryType);
    }
  }

  private async getFinancialData(queryType: QueryType, parsedQuery: any): Promise<FinancialData> {
    try {
      switch (queryType) {
        case 'spending_summary':
          return await this.getSpendingData(parsedQuery);
        
        case 'budget_status':
          return await this.getBudgetData(parsedQuery);
        
        case 'balance_inquiry':
          return await this.getBalanceData();
        
        case 'transaction_search':
          return await this.getTransactionData(parsedQuery);
        
        default:
          return {};
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
      return {};
    }
  }

  private async getSpendingData(parsedQuery: any): Promise<FinancialData> {
    try {
      let startDate = new Date();
      let endDate = new Date();

      if (parsedQuery.timeframe) {
        startDate = parsedQuery.timeframe.startDate || startDate;
        endDate = parsedQuery.timeframe.endDate || endDate;
      }

      const databaseService = DatabaseService.getInstance();
      const transactions = await databaseService.getTransactionsWithCategories(undefined, 'expense', startDate, endDate);
      
      let filteredTransactions = transactions;
      if (parsedQuery.category) {
        filteredTransactions = transactions.filter(t => 
          t.category_name?.toLowerCase().includes(parsedQuery.category.toLowerCase())
        );
      }

      return {
        amount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactions: filteredTransactions,
        timeframe: parsedQuery.timeframe?.value || 'custom',
        categories: Array.from(new Set(filteredTransactions.map(t => t.category_name).filter(Boolean)))
      };
    } catch (error) {
      console.error('Error getting spending data:', error);
      return {};
    }
  }

  private async getBudgetData(parsedQuery: any): Promise<FinancialData> {
    try {
      const databaseService = DatabaseService.getInstance();
      const budgets = await databaseService.getBudgetsWithDetails();
      const budgetCalcService = new BudgetCalculationService(databaseService);
      
      if (parsedQuery.category) {
        const budget = budgets.find(b => 
          b.category_name?.toLowerCase().includes(parsedQuery.category.toLowerCase())
        );
        
        if (budget) {
          const budgetProgress = await budgetCalcService.getBudgetProgress(budget.id);
          
          if (budgetProgress) {
            return {
              budgetStatus: {
                category: budget.category_name,
                budgeted: budgetProgress.budgeted_amount,
                spent: budgetProgress.spent_amount,
                remaining: budgetProgress.remaining_amount,
                percentage: budgetProgress.percentage_used
              }
            };
          }
        }
      }
      const budgetStatuses = await Promise.all(
        budgets.map(async (budget) => {
          const budgetProgress = await budgetCalcService.getBudgetProgress(budget.id);
          return {
            category: budget.category_name,
            budgeted: budgetProgress?.budgeted_amount || budget.amount,
            spent: budgetProgress?.spent_amount || 0,
            remaining: budgetProgress?.remaining_amount || budget.amount,
            percentage: budgetProgress?.percentage_used || 0
          };
        })
      );

      return {
        budgetStatus: budgetStatuses
      };
    } catch (error) {
      console.error('Error getting budget data:', error);
      return {};
    }
  }

  private async getBalanceData(): Promise<FinancialData> {
    try {
      const databaseService = DatabaseService.getInstance();
      const transactions = await databaseService.getTransactions();
      const balance = transactions.reduce((sum, t) => sum - t.amount, 0);
      
      return {
        amount: Math.abs(balance)
      };
    } catch (error) {
      console.error('Error getting balance data:', error);
      return {};
    }
  }

  private async getTransactionData(parsedQuery: any): Promise<FinancialData> {
    try {
      const databaseService = DatabaseService.getInstance();
      let transactions = await databaseService.getTransactionsWithCategories();

      if (parsedQuery.category) {
        transactions = transactions.filter(t => 
          t.category_name?.toLowerCase().includes(parsedQuery.category.toLowerCase())
        );
      }

      if (parsedQuery.timeframe) {
        const startDate = parsedQuery.timeframe.startDate;
        const endDate = parsedQuery.timeframe.endDate;
        
        if (startDate && endDate) {
          transactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endDate;
          });
        }
      }

      return {
        transactions: transactions.slice(0, 20),
        amount: transactions.reduce((sum, t) => sum + t.amount, 0),
        categories: Array.from(new Set(transactions.map(t => t.category_name).filter(Boolean)))
      };
    } catch (error) {
      console.error('Error getting transaction data:', error);
      return {};
    }
  }

  private generateTemplateResponse(data: FinancialData, queryType: QueryType): string {
    switch (queryType) {
      case 'spending_summary':
        if (data.amount !== undefined) {
          const timeframe = data.timeframe || 'the selected period';
          return `You spent $${data.amount.toFixed(2)} ${timeframe}${data.categories && data.categories.length > 0 ? ` across ${data.categories.join(', ')} categories` : ''}.`;
        }
        return 'No spending data found for the requested period.';

      case 'budget_status':
        if (data.budgetStatus) {
          if (Array.isArray(data.budgetStatus)) {
            const summaries = data.budgetStatus.map(b => 
              `${b.category}: $${b.spent.toFixed(2)} of $${b.budgeted.toFixed(2)} (${b.percentage.toFixed(1)}%)`
            );
            return `Budget status:\n${summaries.join('\n')}`;
          } else {
            const b = data.budgetStatus;
            return `${b.category} budget: $${b.spent.toFixed(2)} of $${b.budgeted.toFixed(2)} spent (${b.percentage.toFixed(1)}%). Remaining: $${b.remaining.toFixed(2)}.`;
          }
        }
        return 'No budget information found.';

      case 'balance_inquiry':
        if (data.amount !== undefined) {
          return `Your current account balance is $${data.amount.toFixed(2)}.`;
        }
        return 'Unable to retrieve balance information.';

      case 'transaction_search':
        if (data.transactions && data.transactions.length > 0) {
          return `Found ${data.transactions.length} transactions totaling $${data.amount?.toFixed(2) || '0.00'}.`;
        }
        return 'No transactions found matching your criteria.';

      default:
        return 'I can help you with spending summaries, budget status, balance inquiries, and transaction searches.';
    }
  }

  private createEmbeddedData(data: FinancialData, queryType: QueryType): EmbeddedFinancialData | undefined {
    switch (queryType) {
      case 'budget_status':
        if (data.budgetStatus) {
          return {
            type: 'BudgetCard',
            title: 'Budget Status',
            size: 'compact' as const,
            chatContext: true,
            budgetData: data.budgetStatus as any, // TODO: Fix budget data structure
            progressData: {
              spent: data.budgetStatus.spent || 0,
              remaining: data.budgetStatus.remaining || 0,
              percentage: data.budgetStatus.percentage || 0
            }
          };
        }
        break;
      
      case 'transaction_search':
        if (data.transactions) {
          return {
            type: 'TransactionList',
            title: 'Recent Transactions',
            size: 'compact' as const,
            chatContext: true,
            transactions: data.transactions,
            totalCount: data.transactions.length
          };
        }
        break;
      
      case 'spending_summary':
        if (data.categories) {
          return {
            type: 'CategoryBreakdownChart',
            title: 'Spending by Category',
            size: 'compact' as const,
            chatContext: true,
            chartData: data.categories?.map((category: string, index: number) => ({
              x: category,
              y: data.amount || 0,
              label: category
            })) || [],
            metadata: {
              totalAmount: data.amount || 0,
              currency: 'USD',
              categories: []
            }
          };
        }
        break;
    }
    return undefined;
  }

  /**
   * Enhanced integration point for DatabaseService (now implemented)
   */
  private async getFinancialContext(context?: AIQueryContext): Promise<any> {
    try {
      return {
        recentTransactions: await DatabaseService.getInstance().getTransactions(),
        activeBudgets: await DatabaseService.getInstance().getBudgets(),
        categories: await DatabaseService.getInstance().getCategories()
      };
    } catch (error) {
      console.error('Error getting financial context:', error);
      return {};
    }
  }

  // New methods for enhanced AI functionality
  public classifyQueryType(query: string): Promise<QueryType> {
    return AIQueryProcessor.classifyQuery(query).then(result => result.type);
  }

  public async initializeLangChain(): Promise<void> {
    await LangChainOrchestrator.initialize();
  }

  public async clearConversationHistory(): Promise<void> {
    await LangChainOrchestrator.clearMemory();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isBackendConnected(): boolean {
    return this.backendConnected;
  }

  public async getStatus(): Promise<{
    initialized: boolean;
    backendConnected: boolean;
    mode: 'backend' | 'local-ai' | 'database-only';
  }> {
    let mode: 'backend' | 'local-ai' | 'database-only' = 'database-only';
    
    if (this.backendConnected) {
      mode = 'backend';
    } else if (this.initialized && HuggingFaceModelManager.isInitialized()) {
      mode = 'local-ai';
    }

    return {
      initialized: this.initialized,
      backendConnected: this.backendConnected,
      mode
    };
  }

  public async reconnectToBackend(): Promise<boolean> {
    try {
      const isConnected = await this.backendClient.testConnectivity();
      this.backendConnected = isConnected;
      
      if (isConnected) {
        console.log('✅ Reconnected to AI backend');
      } else {
        console.log('❌ Failed to reconnect to AI backend');
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error testing backend connectivity:', error);
      this.backendConnected = false;
      return false;
    }
  }

  /**
   * Enhanced query processing with embedded financial components
   */
  public async processQueryWithEmbedding(
    query: string, 
    context?: AIQueryContext
  ): Promise<AIResponseWithEmbedding> {
    try {
      // Ensure initialization before processing
      if (!this.initialized) {
        console.log('AIService not initialized for enhanced processing, attempting initialization...');
        await this.initialize();
      }

      // Check for follow-up query and enhance context
      const conversationContext = this.conversationManager.getConversationContext();
      let enhancedContext = context;
      
      if (conversationContext) {
        const followUpResult = await this.conversationManager.handleFollowUpQuery(query, context);
        enhancedContext = followUpResult.enhancedContext;
        query = followUpResult.contextualQuery;
      }

      // Determine processing type based on privacy preferences
      const privacyPrefs = this.privacyManager.getPrivacyPreferences();
      const processingType: ProcessingType = privacyPrefs.processingType;

      // Check consent for processing type
      const hasConsent = await this.privacyManager.requestConsent(
        'query_processing', 
        processingType, 
        ['financial_data', 'conversation_context']
      );

      if (!hasConsent && processingType === 'hugging-face') {
        return {
          content: 'Cloud AI processing requires your consent. Please update your privacy settings to continue.',
          processingType: 'on-device',
          modelUsed: 'local_fallback',
        };
      }

      // Process query with enhanced embedding
      let response: AIResponse;
      if (this.initialized && processingType === 'hugging-face') {
        response = await this.processQueryWithAI(query, enhancedContext);
      } else {
        response = await this.processQuery(query, enhancedContext);
      }

      // Create enhanced embedded data
      const embeddedData = await this.createEnhancedEmbeddedData(response.embeddedData, enhancedContext);

      // Create enhanced response
      const enhancedResponse: AIResponseWithEmbedding = {
        content: response.content,
        embeddedData,
        suggestedActions: response.suggestedActions,
        processingType,
        modelUsed: processingType === 'hugging-face' ? 'hugging-face-model' : 'local-processing',
        contextUpdates: conversationContext ? {
          lastQueryType: await this.classifyQueryType(query),
        } : undefined,
      };

      // Update conversation history
      await this.addToConversationHistory(query, enhancedResponse);

      return enhancedResponse;
    } catch (error) {
      console.error('Enhanced query processing failed:', error);
      
      // Fallback response
      return {
        content: 'I encountered an error processing your request. Please try again.',
        processingType: 'on-device',
        modelUsed: 'error_fallback',
      };
    }
  }

  /**
   * Create enhanced embedded data with proper typing
   */
  private async createEnhancedEmbeddedData(
    originalEmbeddedData: EmbeddedFinancialData | undefined,
    context?: AIQueryContext
  ): Promise<EmbeddedFinancialData | undefined> {
    if (!originalEmbeddedData) return undefined;

    const dbService = DatabaseService.getInstance();

    try {
      switch (originalEmbeddedData.type) {
        case 'BudgetCard':
          // Get actual budget data
          const budgets = await dbService.getBudgetsWithDetails();
          if (budgets.length > 0) {
            const budget = budgets[0]; // Use first budget for now
            return {
              type: 'BudgetCard',
              budgetData: budget,
              progressData: {
                spent: budget.spent_amount,
                remaining: budget.amount - budget.spent_amount,
                percentage: budget.percentage,
              },
              size: 'full',
              chatContext: true,
              title: originalEmbeddedData.title,
            } as EmbeddedBudgetCardData;
          }
          break;

        case 'TransactionList':
          // Get actual transaction data
          const transactions = await dbService.getTransactionsWithCategories();
          return {
            type: 'TransactionList',
            transactions: transactions.slice(0, 10),
            totalCount: transactions.length,
            size: 'full',
            chatContext: true,
            title: originalEmbeddedData.title,
          } as EmbeddedTransactionListData;

        case 'CategoryBreakdownChart':
          // Get category breakdown data
          const databaseService = DatabaseService.getInstance();
          const budgetCalculationService = new BudgetCalculationService(databaseService);
          const analyticsService = new BudgetAnalyticsService(
            databaseService,
            budgetCalculationService
          );
          const categoryData = await analyticsService.getCategoryPerformanceAnalysis();
          return {
            type: 'CategoryBreakdownChart',
            chartData: categoryData.map(cat => ({
              x: cat.category_name,
              y: cat.spent_amount / 100, // Convert cents to dollars
              label: cat.category_name,
              color: cat.category_color,
            })),
            metadata: {
              totalAmount: categoryData.reduce((sum, cat) => sum + cat.spent_amount, 0),
              currency: 'USD',
              period: 'current_month',
              categories: categoryData.map(cat => ({
                id: cat.category_id,
                name: cat.category_name,
                color: cat.category_color,
                icon: cat.category_icon,
                created_at: new Date(),
                updated_at: new Date()
              })),
            },
            size: 'full',
            chatContext: true,
            title: originalEmbeddedData.title,
          } as EmbeddedChartData;

        default:
          return originalEmbeddedData;
      }
    } catch (error) {
      console.error('Failed to create enhanced embedded data:', error);
      return originalEmbeddedData;
    }

    return originalEmbeddedData;
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
   * Format financial data for chat display
   */
  public formatFinancialDataForChat(
    data: any, 
    componentType: 'BudgetCard' | 'TransactionList' | 'Chart'
  ): EmbeddedFinancialData {
    switch (componentType) {
      case 'BudgetCard':
        return {
          type: 'BudgetCard',
          budgetData: data.budget,
          progressData: data.progress,
          size: 'compact',
          chatContext: true,
        } as EmbeddedBudgetCardData;

      case 'TransactionList':
        return {
          type: 'TransactionList',
          transactions: data.transactions,
          totalCount: data.totalCount,
          dateRange: data.dateRange,
          size: 'compact',
          chatContext: true,
        } as EmbeddedTransactionListData;

      case 'Chart':
        return {
          type: 'CategoryBreakdownChart',
          chartData: data.chartData,
          metadata: data.metadata,
          size: 'compact',
          chatContext: true,
        } as EmbeddedChartData;

      default:
        throw new Error(`Unsupported component type: ${componentType}`);
    }
  }

  /**
   * Get conversation context for follow-up queries
   */
  public getConversationContext(): ConversationFinancialContext | null {
    return this.conversationManager.getConversationContext();
  }

  /**
   * Clear current conversation and start fresh
   */
  public async clearConversation(): Promise<void> {
    await this.conversationManager.clearConversation();
  }
}

export default AIService;