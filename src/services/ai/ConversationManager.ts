import AsyncStorage from '@react-native-async-storage/async-storage';
// Simple memory implementation since LangChain BufferMemory is not available
interface SimpleMemory {
  chatHistory: {
    addUserMessage: (message: string) => Promise<void>;
    addAIChatMessage: (message: string) => Promise<void>;
  };
}

class SimpleChatMemory implements SimpleMemory {
  private messages: Array<{role: string; content: string}> = [];
  
  chatHistory = {
    addUserMessage: async (message: string) => {
      this.messages.push({role: 'user', content: message});
    },
    addAIChatMessage: async (message: string) => {
      this.messages.push({role: 'assistant', content: message});
    }
  };
}
import { 
  ConversationFinancialContext,
  ExtendedChatMessage,
  AIResponseWithEmbedding,
  EmbeddedFinancialData
} from '../../types/ai/EmbeddedDataTypes';
import { AIQueryContext } from '../../types/ai';
import { DatabaseService } from '../DatabaseService';
import { Category } from '../../types/Category';
import { Budget } from '../../types/Budget';

// Storage keys for AsyncStorage
const STORAGE_KEYS = {
  CONVERSATION_CONTEXT: '@conversation_context',
  CONVERSATION_HISTORY: '@conversation_history',
  LANGCHAIN_MEMORY: '@langchain_memory',
};

// Active conversation context
interface ActiveConversation {
  id: string;
  messages: ExtendedChatMessage[];
  context: ConversationFinancialContext;
  memory: SimpleMemory;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ConversationManager handles conversation context persistence and retrieval
 * for maintaining AI chat sessions with financial data focus
 */
export class ConversationManager {
  private static instance: ConversationManager;
  private activeConversation: ActiveConversation | null = null;
  private dbService: DatabaseService;
  private initialized = false;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /**
   * Initialize the conversation manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure database is initialized
      await this.dbService.initialize();
      
      // Load active conversation if exists
      await this.loadActiveConversation();
      
      this.initialized = true;
      console.log('ConversationManager initialized successfully');
    } catch (error) {
      console.error('ConversationManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(): Promise<string> {
    const conversationId = this.generateConversationId();
    
    const newConversation: ActiveConversation = {
      id: conversationId,
      messages: [],
      context: this.createEmptyContext(),
      memory: new SimpleChatMemory(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeConversation = newConversation;
    await this.saveConversationContext();
    
    return conversationId;
  }

  /**
   * Add a message to the current conversation
   */
  async addMessage(message: ExtendedChatMessage): Promise<void> {
    if (!this.activeConversation) {
      await this.startNewConversation();
    }

    if (!this.activeConversation) {
      throw new Error('Failed to create conversation');
    }

    // Add message to conversation
    this.activeConversation.messages.push(message);
    this.activeConversation.updatedAt = new Date();

    // Update LangChain memory
    await this.updateLangChainMemory(message);

    // Update conversation context if message has embedded data
    if (message.embeddedData) {
      await this.updateContextFromEmbeddedData(message.embeddedData);
    }

    // Save to persistent storage
    await this.saveConversationHistory();
    await this.saveConversationContext();
  }

  /**
   * Update conversation context with new data
   */
  async updateConversationContext(updates: Partial<ConversationFinancialContext>): Promise<void> {
    if (!this.activeConversation) {
      await this.startNewConversation();
    }

    if (!this.activeConversation) {
      throw new Error('Failed to create conversation');
    }

    // Merge updates with existing context
    this.activeConversation.context = {
      ...this.activeConversation.context,
      ...updates,
    };

    this.activeConversation.updatedAt = new Date();
    await this.saveConversationContext();
  }

  /**
   * Get current conversation context
   */
  getConversationContext(): ConversationFinancialContext | null {
    return this.activeConversation?.context || null;
  }

  /**
   * Get conversation messages
   */
  getMessages(): ExtendedChatMessage[] {
    return this.activeConversation?.messages || [];
  }

  /**
   * Handle follow-up query with conversation context
   */
  async handleFollowUpQuery(
    query: string, 
    previousContext?: AIQueryContext
  ): Promise<{
    contextualQuery: string;
    enhancedContext: AIQueryContext;
    referenceData: any;
  }> {
    if (!this.activeConversation) {
      throw new Error('No active conversation for follow-up query');
    }

    const context = this.activeConversation.context;
    
    // Analyze query for referential terms
    const referentialTerms = this.extractReferentialTerms(query);
    let contextualQuery = query;
    let referenceData: any = {};

    // Replace referential terms with specific context
    if (referentialTerms.includes('those transactions') || referentialTerms.includes('them')) {
      if (context.embeddedComponents.some(comp => comp.type === 'TransactionList')) {
        const lastTransactionEmbed = context.embeddedComponents
          .filter(comp => comp.type === 'TransactionList')
          .pop();
        referenceData.transactions = lastTransactionEmbed;
        contextualQuery = query.replace(/those transactions?|them/gi, 'the previously shown transactions');
      }
    }

    if (referentialTerms.includes('these categories') || referentialTerms.includes('which categories')) {
      if (context.focusedCategories.length > 0) {
        const categories = await this.getCategoriesByIds(context.focusedCategories);
        referenceData.categories = categories;
        const categoryNames = categories.map(c => c.name).join(', ');
        contextualQuery = query.replace(/these categories|which categories/gi, `categories: ${categoryNames}`);
      }
    }

    if (referentialTerms.includes('that budget') || referentialTerms.includes('this budget')) {
      if (context.focusedBudgets.length > 0) {
        const budgets = await this.getBudgetsByIds(context.focusedBudgets);
        referenceData.budgets = budgets;
        const budgetNames = budgets.map(b => `Budget ${b.id}`).join(', ');
        contextualQuery = query.replace(/that budget|this budget/gi, `budget for ${budgetNames}`);
      }
    }

    // Create enhanced context
    const enhancedContext: AIQueryContext = {
      ...previousContext,
      currentScreen: 'ai_chat',
      sessionId: this.activeConversation.id,
      timestamp: new Date(),
      recentTransactions: referenceData.transactions?.data?.transactions || [],
      activeBudgets: referenceData.budgets || [],
      userPreferences: {
        timeframe: context.timeframe,
        focusedCategories: context.focusedCategories,
        focusedBudgets: context.focusedBudgets,
      },
    };

    return {
      contextualQuery,
      enhancedContext,
      referenceData,
    };
  }

  /**
   * Maintain topic focus across related questions
   */
  async maintainTopicFocus(
    newQuery: string, 
    previousContext: AIQueryContext
  ): Promise<AIQueryContext> {
    if (!this.activeConversation) {
      return previousContext;
    }

    const context = this.activeConversation.context;
    
    // Determine if the new query is related to the current topic
    const isRelatedQuery = this.isQueryRelated(newQuery, context);
    
    if (isRelatedQuery) {
      // Maintain focus on current categories and budgets
      return {
        ...previousContext,
        recentTransactions: previousContext.recentTransactions || [],
        activeBudgets: previousContext.activeBudgets || [],
        userPreferences: {
          ...previousContext.userPreferences,
          timeframe: context.timeframe,
          focusedCategories: context.focusedCategories,
          focusedBudgets: context.focusedBudgets,
        },
      };
    } else {
      // New topic, clear focused items but maintain recent context
      await this.updateConversationContext({
        focusedCategories: [],
        focusedBudgets: [],
        lastQueryType: this.classifyQueryType(newQuery),
      });
      
      return previousContext;
    }
  }

  /**
   * Get conversation history for reference
   */
  getConversationHistory(): ExtendedChatMessage[] {
    return this.activeConversation?.messages || [];
  }

  /**
   * Clear conversation and start fresh
   */
  async clearConversation(): Promise<void> {
    this.activeConversation = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATION_CONTEXT);
    await AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATION_HISTORY);
    await AsyncStorage.removeItem(STORAGE_KEYS.LANGCHAIN_MEMORY);
  }

  // Private helper methods

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptyContext(): ConversationFinancialContext {
    return {
      focusedBudgets: [],
      focusedCategories: [],
      timeframe: null,
      lastQueryType: '',
      embeddedComponents: [],
    };
  }

  private extractReferentialTerms(query: string): string[] {
    const terms = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('those transactions') || lowerQuery.includes('them')) {
      terms.push('those transactions');
    }
    if (lowerQuery.includes('these categories') || lowerQuery.includes('which categories')) {
      terms.push('these categories');
    }
    if (lowerQuery.includes('that budget') || lowerQuery.includes('this budget')) {
      terms.push('that budget');
    }
    
    return terms;
  }

  private isQueryRelated(query: string, context: ConversationFinancialContext): boolean {
    const queryLower = query.toLowerCase();
    const lastQueryType = context.lastQueryType.toLowerCase();
    
    // Check for topic continuity indicators
    const continuityTerms = ['also', 'and', 'what about', 'how about', 'show me', 'those', 'these'];
    const hasContinuityTerm = continuityTerms.some(term => queryLower.includes(term));
    
    // Check for same domain terms
    const budgetTerms = ['budget', 'spending', 'allocated'];
    const transactionTerms = ['transaction', 'expense', 'purchase', 'payment'];
    const categoryTerms = ['category', 'categories'];
    
    const queryHasBudgetTerms = budgetTerms.some(term => queryLower.includes(term));
    const queryHasTransactionTerms = transactionTerms.some(term => queryLower.includes(term));
    const queryHasCategoryTerms = categoryTerms.some(term => queryLower.includes(term));
    
    const lastQueryHasBudgetTerms = budgetTerms.some(term => lastQueryType.includes(term));
    const lastQueryHasTransactionTerms = transactionTerms.some(term => lastQueryType.includes(term));
    const lastQueryHasCategoryTerms = categoryTerms.some(term => lastQueryType.includes(term));
    
    return hasContinuityTerm || 
           (queryHasBudgetTerms && lastQueryHasBudgetTerms) ||
           (queryHasTransactionTerms && lastQueryHasTransactionTerms) ||
           (queryHasCategoryTerms && lastQueryHasCategoryTerms);
  }

  private classifyQueryType(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('budget') || queryLower.includes('spending')) return 'budget';
    if (queryLower.includes('transaction') || queryLower.includes('expense')) return 'transaction';
    if (queryLower.includes('category') || queryLower.includes('categories')) return 'category';
    if (queryLower.includes('chart') || queryLower.includes('graph')) return 'chart';
    
    return 'general';
  }

  private async updateLangChainMemory(message: ExtendedChatMessage): Promise<void> {
    if (!this.activeConversation) return;

    try {
      const memory = this.activeConversation.memory;
      
      if (message.role === 'user') {
        await memory.chatHistory.addUserMessage(message.content);
      } else {
        await memory.chatHistory.addAIChatMessage(message.content);
      }
    } catch (error) {
      console.error('Failed to update LangChain memory:', error);
    }
  }

  private async updateContextFromEmbeddedData(embeddedData: EmbeddedFinancialData): Promise<void> {
    if (!this.activeConversation) return;

    const updates: Partial<ConversationFinancialContext> = {};
    
    // Update focused items based on embedded data type
    switch (embeddedData.type) {
      case 'BudgetCard':
        if (embeddedData.budgetData?.id) {
          updates.focusedBudgets = [embeddedData.budgetData.id.toString()];
        }
        // Category focus will be handled through separate logic
        break;
        
      case 'TransactionList':
        if (embeddedData.categories) {
          updates.focusedCategories = embeddedData.categories.map(c => c.id.toString());
        }
        if (embeddedData.dateRange) {
          updates.timeframe = {
            start: embeddedData.dateRange.start,
            end: embeddedData.dateRange.end,
          };
        }
        break;
        
      case 'BudgetPerformanceChart':
      case 'CategoryBreakdownChart':
      case 'SpendingTrendChart':
        if (embeddedData.metadata?.categories) {
          updates.focusedCategories = embeddedData.metadata.categories.map(c => c.id.toString());
        }
        break;
    }

    // Add embedded component to context
    updates.embeddedComponents = [
      ...(this.activeConversation.context.embeddedComponents || []),
      embeddedData,
    ].slice(-5); // Keep only last 5 embedded components

    await this.updateConversationContext(updates);
  }

  private async getCategoriesByIds(categoryIds: string[]): Promise<Category[]> {
    try {
      const categories = await this.dbService.getAllCategories();
      return categories.filter(cat => categoryIds.includes(cat.id.toString()));
    } catch (error) {
      console.error('Failed to get categories by IDs:', error);
      return [];
    }
  }

  private async getBudgetsByIds(budgetIds: string[]): Promise<Budget[]> {
    try {
      const budgets = await this.dbService.getAllBudgets();
      return budgets.filter(budget => budgetIds.includes(budget.id.toString()));
    } catch (error) {
      console.error('Failed to get budgets by IDs:', error);
      return [];
    }
  }

  private async loadActiveConversation(): Promise<void> {
    try {
      const contextData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATION_CONTEXT);
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATION_HISTORY);
      
      if (contextData && historyData) {
        const context = JSON.parse(contextData);
        const messages = JSON.parse(historyData);
        
        // Restore conversation
        this.activeConversation = {
          id: context.id,
          messages: messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
          context: {
            ...context.context,
            timeframe: context.context.timeframe ? {
              start: new Date(context.context.timeframe.start),
              end: new Date(context.context.timeframe.end),
            } : null,
          },
          memory: new SimpleChatMemory(),
          createdAt: new Date(context.createdAt),
          updatedAt: new Date(context.updatedAt),
        };
        
        // Restore LangChain memory
        const memoryData = await AsyncStorage.getItem(STORAGE_KEYS.LANGCHAIN_MEMORY);
        if (memoryData) {
          // TODO: Implement LangChain memory restoration
          console.log('LangChain memory restoration not fully implemented');
        }
      }
    } catch (error) {
      console.error('Failed to load active conversation:', error);
      // Continue without loading - will start fresh
    }
  }

  private async saveConversationContext(): Promise<void> {
    if (!this.activeConversation) return;

    try {
      const contextData = {
        id: this.activeConversation.id,
        context: this.activeConversation.context,
        createdAt: this.activeConversation.createdAt.toISOString(),
        updatedAt: this.activeConversation.updatedAt.toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATION_CONTEXT, JSON.stringify(contextData));
    } catch (error) {
      console.error('Failed to save conversation context:', error);
    }
  }

  private async saveConversationHistory(): Promise<void> {
    if (!this.activeConversation) return;

    try {
      const messagesData = this.activeConversation.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      }));
      
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATION_HISTORY, JSON.stringify(messagesData));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }
}

export default ConversationManager;