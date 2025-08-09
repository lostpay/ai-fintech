import { AIResponse, AIQueryContext, EmbeddedFinancialData, QueryType, FinancialData, ChatMessage, ComponentDisplayData } from '../../types/ai';
import { DatabaseService } from '../DatabaseService';
import { BudgetAnalyticsService } from '../BudgetAnalyticsService';
import { BudgetCalculationService } from '../BudgetCalculationService';
import HuggingFaceModelManager from './HuggingFaceModelManager';
import LangChainOrchestrator from './LangChainOrchestrator';
import AIQueryProcessor from './AIQueryProcessor';

export class AIService {
  private static instance: AIService;
  private initialized = false;

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize AI components
      await HuggingFaceModelManager.initialize();
      await LangChainOrchestrator.initialize();
      
      this.initialized = true;
    } catch (error) {
      console.error('AIService initialization failed:', error);
      // Don't throw - fall back to placeholder responses
    }
  }

  /**
   * Process a user query and return an AI response
   * Enhanced with actual AI integration while maintaining backward compatibility
   */
  public async processQuery(
    query: string, 
    context?: AIQueryContext
  ): Promise<AIResponse> {
    // Try AI processing first if initialized
    if (this.initialized) {
      try {
        return await this.processQueryWithAI(query, context);
      } catch (error) {
        console.error('AI processing failed, falling back to placeholder:', error);
      }
    }

    // Fallback to original placeholder logic
    await this.delay(1500);

    // Placeholder response logic based on query content
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('budget') || lowerQuery.includes('spending')) {
      return {
        content: "I can see you're asking about your budget. Here's a summary of your current budget status. This is a placeholder response that will be replaced with actual AI-generated content.",
        embeddedData: {
          type: 'budget_card',
          title: 'Budget Overview',
          data: {
            // Placeholder data - will integrate with DatabaseService
            totalBudget: 3000,
            totalSpent: 2100,
            remainingBudget: 900,
          }
        },
        suggestedActions: [
          'View detailed budget breakdown',
          'Set up budget alerts',
          'Review spending patterns'
        ]
      };
    }

    if (lowerQuery.includes('transaction') || lowerQuery.includes('recent')) {
      return {
        content: "Here are your recent transactions. This placeholder will be replaced with intelligent analysis of your spending patterns.",
        embeddedData: {
          type: 'transaction_list',
          title: 'Recent Transactions',
          data: {
            // Placeholder data - will integrate with DatabaseService
            transactions: []
          }
        }
      };
    }

    if (lowerQuery.includes('category') || lowerQuery.includes('breakdown')) {
      return {
        content: "I've analyzed your spending by category. This is a placeholder response that will show actual category analysis.",
        embeddedData: {
          type: 'category_breakdown',
          title: 'Spending by Category',
          data: {
            // Placeholder data - will integrate with DatabaseService
            categories: []
          }
        }
      };
    }

    // Default response
    return {
      content: `Thank you for your question: "${query}". This is a placeholder response from the AI assistant. In the full implementation, I'll provide intelligent insights about your finances, spending patterns, and budget recommendations.`,
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
   * New AI processing method using HuggingFace and LangChain
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
      const transactions = await databaseService.getTransactions(undefined, 'expense', startDate, endDate);
      
      let filteredTransactions = transactions;
      if (parsedQuery.category) {
        filteredTransactions = transactions.filter(t => 
          t.category?.toLowerCase().includes(parsedQuery.category.toLowerCase())
        );
      }

      return {
        amount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactions: filteredTransactions,
        timeframe: parsedQuery.timeframe?.value || 'custom',
        categories: [...new Set(filteredTransactions.map(t => t.category).filter(Boolean))]
      };
    } catch (error) {
      console.error('Error getting spending data:', error);
      return {};
    }
  }

  private async getBudgetData(parsedQuery: any): Promise<FinancialData> {
    try {
      const databaseService = DatabaseService.getInstance();
      const budgets = await databaseService.getBudgets();
      const budgetCalcService = new BudgetCalculationService(databaseService);
      
      if (parsedQuery.category) {
        const budget = budgets.find(b => 
          b.category.toLowerCase().includes(parsedQuery.category.toLowerCase())
        );
        
        if (budget) {
          const budgetProgress = await budgetCalcService.getBudgetProgress(budget.id);
          
          if (budgetProgress) {
            return {
              budgetStatus: {
                category: budget.category,
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
            category: budget.category,
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
      let transactions = await databaseService.getTransactions();

      if (parsedQuery.category) {
        transactions = transactions.filter(t => 
          t.category?.toLowerCase().includes(parsedQuery.category.toLowerCase())
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
        categories: [...new Set(transactions.map(t => t.category).filter(Boolean))]
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
            type: 'budget_card',
            title: 'Budget Status',
            data: data.budgetStatus
          };
        }
        break;
      
      case 'transaction_search':
        if (data.transactions) {
          return {
            type: 'transaction_list',
            title: 'Recent Transactions',
            data: { transactions: data.transactions }
          };
        }
        break;
      
      case 'spending_summary':
        if (data.categories) {
          return {
            type: 'category_breakdown',
            title: 'Spending by Category',
            data: { categories: data.categories, amount: data.amount }
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
        recentTransactions: await DatabaseService.getInstance().getTransactions(undefined, undefined, undefined, undefined, 10),
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
    return this.initialized && HuggingFaceModelManager.isInitialized();
  }
}

export default AIService;