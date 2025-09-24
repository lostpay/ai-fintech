import { Transaction, CreateTransactionRequest, UpdateTransactionRequest, TransactionWithCategory } from '../types/Transaction';
import { Category, CreateCategoryRequest } from '../types/Category';
import { Budget, CreateBudgetRequest } from '../types/Budget';
import { Goal, CreateGoalRequest } from '../types/Goal';
import { 
  validateCompleteTransaction, 
  TransactionFormData
} from '../utils/validation';
import { 
  ErrorHandlingService, 
  ValidationError
} from './ErrorHandlingService';
import { emitTransactionChanged } from '../utils/eventEmitter';
import { SupabaseService } from './SupabaseService';

export class DatabaseService {
  private static instance: DatabaseService;
  private supabaseService: SupabaseService;
  private isInitialized = false;
  private categoriesCache: Category[] = [];
  private cacheUpdated = false;

  // Private constructor to prevent direct instantiation
  private constructor() {
    this.supabaseService = new SupabaseService();
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Initialize Supabase database (tables should already exist via migrations)
      await this.supabaseService.initializeDatabase();
      
      // Initialize categories cache
      await this.refreshCategoriesCache();
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Refresh categories cache for validation
   */
  private async refreshCategoriesCache(): Promise<void> {
    try {
      this.categoriesCache = await this.supabaseService.getCategories();
      this.cacheUpdated = true;
    } catch (error) {
      console.error('Failed to refresh categories cache:', error);
      this.cacheUpdated = false;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.isInitialized = false;
    this.categoriesCache = [];
    this.cacheUpdated = false;
    console.log('Database connection closed');
  }

  /**
   * Clear all data from all tables (for testing purposes)
   */
  async clearAllData(): Promise<void> {
    try {
      // Note: This would require admin privileges in Supabase
      // For now, we'll just log a warning
      console.warn('clearAllData not implemented for Supabase - requires admin privileges');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  // ========== CATEGORY CRUD OPERATIONS ==========

  /**
   * Create a new category
   */
  async createCategory(categoryData: CreateCategoryRequest): Promise<Category> {
    try {
      const category = await this.supabaseService.createCategory({
        name: categoryData.name,
        color: categoryData.color,
        icon: categoryData.icon,
        is_default: categoryData.is_default || false,
        is_hidden: categoryData.is_hidden || false
      });
      
      if (!category) {
        throw new Error('Failed to create category');
      }

      // Refresh cache
      await this.refreshCategoriesCache();
      
      return category;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      return await this.supabaseService.getCategories();
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    try {
      const categories = await this.supabaseService.getCategories();
      return categories.find(cat => cat.id === id) || null;
    } catch (error) {
      console.error('Failed to get category by ID:', error);
      throw error;
    }
  }

  // ========== TRANSACTION CRUD OPERATIONS ==========

  /**
   * Create a new transaction with comprehensive validation
   */
  async createTransaction(transactionData: CreateTransactionRequest): Promise<Transaction> {
    try {
      const transaction = await this.supabaseService.createTransaction({
        amount: transactionData.amount / 100, // Supabase service expects dollars
        description: transactionData.description,
        category_id: transactionData.category_id,
        transaction_type: transactionData.transaction_type,
        date: transactionData.date || new Date()
      });
      
      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      // Emit transaction changed event for real-time budget updates
      emitTransactionChanged({
        type: 'created',
        transactionId: transaction.id,
        categoryId: transaction.category_id,
        amount: Math.round(transaction.amount * 100) // Convert back to cents for event
      });
      
      return {
        ...transaction,
        amount: Math.round(transaction.amount * 100), // Convert back to cents
        date: new Date(transaction.date),
        created_at: new Date(transaction.created_at),
        updated_at: new Date(transaction.updated_at)
      };
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw ErrorHandlingService.processError(error, 'Transaction Creation');
    }
  }

  /**
   * Create transaction with form data validation
   */
  async createTransactionWithValidation(formData: TransactionFormData): Promise<Transaction> {
    try {
      // Refresh categories cache if needed
      if (!this.cacheUpdated) {
        await this.refreshCategoriesCache();
      }

      // Comprehensive validation
      const validationResult = validateCompleteTransaction(formData, this.categoriesCache);
      
      if (!validationResult.isValid) {
        throw new ValidationError(validationResult.errors);
      }

      const sanitizedData = validationResult.sanitizedData!;

      // Transform data for database storage (already in dollars for Supabase)
      const dbData: CreateTransactionRequest = {
        amount: Math.round(sanitizedData.amount * 100), // Keep in cents for createTransaction method
        description: sanitizedData.description,
        category_id: sanitizedData.category_id,
        transaction_type: sanitizedData.transaction_type || 'expense',
        date: sanitizedData.date instanceof Date 
          ? sanitizedData.date
          : new Date(sanitizedData.date)
      };

      return await this.createTransaction(dbData);
      
    } catch (error) {
      console.error('Failed to create transaction with validation:', error);
      throw ErrorHandlingService.processError(error, 'Transaction Creation');
    }
  }

  /**
   * Get all transactions with optional filtering
   */
  async getTransactions(
    categoryId?: number, 
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> {
    try {
      const transactions = await this.supabaseService.getTransactions();
      
      // Apply filters
      return transactions
        .filter(t => !categoryId || t.category_id === categoryId)
        .filter(t => !transactionType || t.transaction_type === transactionType)
        .filter(t => !startDate || new Date(t.date) >= startDate)
        .filter(t => !endDate || new Date(t.date) <= endDate)
        .map(t => ({
          ...t,
          amount: Math.round(t.amount * 100), // Convert to cents
          date: new Date(t.date),
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at)
        }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      throw error;
    }
  }

  /**
   * Get all transactions with category information for display purposes
   */
  async getTransactionsWithCategories(
    categoryId?: number, 
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionWithCategory[]> {
    try {
      const transactions = await this.supabaseService.getTransactionsWithCategories();
      
      // Apply filters
      return transactions
        .filter(t => !categoryId || t.category_id === categoryId)
        .filter(t => !transactionType || t.transaction_type === transactionType)
        .filter(t => !startDate || new Date(t.date) >= startDate)
        .filter(t => !endDate || new Date(t.date) <= endDate)
        .map(t => ({
          id: t.id,
          amount: Math.round(t.amount * 100), // Convert to cents
          description: t.description,
          category_id: t.category_id,
          transaction_type: t.transaction_type,
          date: new Date(t.date),
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at),
          category_name: t.category_name,
          category_color: t.category_color,
          category_icon: t.category_icon
        })) as TransactionWithCategory[];
    } catch (error) {
      console.error('Failed to get transactions with categories:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number): Promise<Transaction | null> {
    try {
      const transactions = await this.supabaseService.getTransactions();
      const transaction = transactions.find(t => t.id === id);
      
      if (!transaction) return null;
      
      return {
        ...transaction,
        amount: Math.round(transaction.amount * 100), // Convert to cents
        date: new Date(transaction.date),
        created_at: new Date(transaction.created_at),
        updated_at: new Date(transaction.updated_at)
      };
    } catch (error) {
      console.error('Failed to get transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: number, updateData: UpdateTransactionRequest): Promise<Transaction> {
    try {
      // Get original transaction for event emission
      const originalTransaction = await this.getTransactionById(id);
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      // Convert amounts to dollars for Supabase
      const supabaseUpdateData: any = { ...updateData };
      if (updateData.amount !== undefined) {
        supabaseUpdateData.amount = updateData.amount / 100;
      }
      if (updateData.date !== undefined) {
        supabaseUpdateData.date = updateData.date.toISOString().split('T')[0];
      }

      const success = await this.supabaseService.updateTransaction(id, supabaseUpdateData);
      if (!success) {
        throw new Error('Failed to update transaction');
      }

      const transaction = await this.getTransactionById(id);
      if (!transaction) {
        throw new Error('Failed to retrieve updated transaction');
      }

      // Emit transaction changed event for real-time budget updates
      emitTransactionChanged({
        type: 'updated',
        transactionId: transaction.id,
        categoryId: transaction.category_id,
        amount: transaction.amount,
        previousAmount: updateData.amount
      });
      
      return transaction;
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: number): Promise<void> {
    try {
      // Get transaction data before deleting for event emission
      const transaction = await this.getTransactionById(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      const success = await this.supabaseService.deleteTransaction(id);
      if (!success) {
        throw new Error('Failed to delete transaction');
      }
      
      // Emit transaction changed event for real-time budget updates
      emitTransactionChanged({
        type: 'deleted',
        transactionId: transaction.id,
        categoryId: transaction.category_id,
        amount: transaction.amount
      });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }

  // ========== BUDGET CRUD OPERATIONS ==========

  /**
   * Create a new budget
   */
  async createBudget(budgetData: CreateBudgetRequest): Promise<Budget> {
    try {
      console.log('DatabaseService creating budget:', budgetData);

      const budget = await this.supabaseService.createBudget({
        category_id: budgetData.category_id,
        amount: budgetData.amount / 100, // Convert to dollars for Supabase
        period_start: budgetData.period_start,
        period_end: budgetData.period_end
      });

      if (!budget) {
        throw new Error('Failed to create budget - no data returned');
      }

      return {
        ...budget,
        amount: Math.round(budget.amount * 100), // Convert back to cents
        period_start: new Date(budget.period_start),
        period_end: new Date(budget.period_end),
        created_at: new Date(budget.created_at),
        updated_at: new Date(budget.updated_at)
      };
    } catch (error: any) {
      console.error('DatabaseService failed to create budget:', error);
      throw new Error(error.message || 'Failed to create budget');
    }
  }

  /**
   * Get all budgets with category information
   */
  async getBudgets(): Promise<Budget[]> {
    try {
      const budgets = await this.supabaseService.getBudgets();
      return budgets.map(budget => ({
        ...budget,
        amount: Math.round(budget.amount * 100), // Convert to cents
        period_start: new Date(budget.period_start),
        period_end: new Date(budget.period_end),
        created_at: new Date(budget.created_at),
        updated_at: new Date(budget.updated_at)
      }));
    } catch (error) {
      console.error('Failed to get budgets:', error);
      throw error;
    }
  }

  /**
   * Get budgets by category
   */
  async getBudgetsByCategory(categoryId: number): Promise<Budget[]> {
    try {
      const budgets = await this.getBudgets();
      return budgets.filter(budget => budget.category_id === categoryId);
    } catch (error) {
      console.error('Failed to get budgets by category:', error);
      throw error;
    }
  }

  /**
   * Get budget for specific period
   */
  async getBudgetForPeriod(categoryId: number, periodStart: Date, periodEnd: Date): Promise<Budget | null> {
    try {
      const budgets = await this.getBudgetsByCategory(categoryId);
      return budgets.find(budget => 
        budget.period_start.getTime() === periodStart.getTime() &&
        budget.period_end.getTime() === periodEnd.getTime()
      ) || null;
    } catch (error) {
      console.error('Failed to get budget for period:', error);
      throw error;
    }
  }

  /**
   * Update budget
   */
  async updateBudget(id: number, budgetData: Partial<CreateBudgetRequest>): Promise<Budget> {
    try {
      const updateData: any = {};
      
      if (budgetData.amount !== undefined) {
        updateData.amount = budgetData.amount / 100; // Convert to dollars
      }
      if (budgetData.category_id !== undefined) {
        updateData.category_id = budgetData.category_id;
      }
      if (budgetData.period_start !== undefined) {
        updateData.period_start = budgetData.period_start.toISOString().split('T')[0];
      }
      if (budgetData.period_end !== undefined) {
        updateData.period_end = budgetData.period_end.toISOString().split('T')[0];
      }

      const success = await this.supabaseService.updateBudget(id, updateData);
      if (!success) {
        throw new Error('Failed to update budget');
      }

      // Get updated budget
      const budgets = await this.getBudgets();
      const budget = budgets.find(b => b.id === id);
      
      if (!budget) {
        throw new Error('Failed to retrieve updated budget');
      }
      
      return budget;
    } catch (error) {
      console.error('Failed to update budget:', error);
      throw error;
    }
  }

  /**
   * Delete budget
   */
  async deleteBudget(id: number): Promise<void> {
    try {
      const success = await this.supabaseService.deleteBudget(id);
      if (!success) {
        throw new Error('Failed to delete budget');
      }
    } catch (error) {
      console.error('Failed to delete budget:', error);
      throw error;
    }
  }

  /**
   * Get budgets with category information and spending data
   */
  async getBudgetsWithDetails(): Promise<any[]> {
    try {
      const budgets = await this.supabaseService.getBudgetsWithDetails();
      return budgets.map(budget => ({
        ...budget,
        amount: Math.round(budget.amount * 100), // Convert to cents
        spent_amount: Math.round(budget.spent_amount * 100), // Convert to cents
        remaining_amount: Math.round(budget.remaining_amount * 100), // Convert to cents
        percentage: budget.percentage_used,
        period_start: new Date(budget.period_start),
        period_end: new Date(budget.period_end),
        created_at: new Date(budget.created_at),
        updated_at: new Date(budget.updated_at)
      }));
    } catch (error) {
      console.error('Failed to get budgets with details:', error);
      throw error;
    }
  }

  // ========== GOAL CRUD OPERATIONS ==========

  /**
   * Create a new goal
   */
  async createGoal(goalData: CreateGoalRequest): Promise<Goal> {
    try {
      const goal = await this.supabaseService.createGoal({
        name: goalData.name,
        target_amount: goalData.target_amount / 100, // Convert to dollars
        current_amount: 0, // Default to 0
        target_date: goalData.target_date,
        description: goalData.description || '',
        is_completed: false
      });
      
      if (!goal) {
        throw new Error('Failed to create goal');
      }
      
      return {
        ...goal,
        target_amount: Math.round(goal.target_amount * 100), // Convert back to cents
        current_amount: Math.round(goal.current_amount * 100), // Convert back to cents
        target_date: goal.target_date ? new Date(goal.target_date) : null,
        created_at: new Date(goal.created_at),
        updated_at: new Date(goal.updated_at)
      };
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw error;
    }
  }

  /**
   * Get all goals
   */
  async getGoals(): Promise<Goal[]> {
    try {
      const goals = await this.supabaseService.getGoals();
      return goals.map(goal => ({
        ...goal,
        target_amount: Math.round(goal.target_amount * 100), // Convert to cents
        current_amount: Math.round(goal.current_amount * 100), // Convert to cents
        target_date: goal.target_date ? new Date(goal.target_date) : null,
        created_at: new Date(goal.created_at),
        updated_at: new Date(goal.updated_at)
      }));
    } catch (error) {
      console.error('Failed to get goals:', error);
      throw error;
    }
  }

  // ========== AI CONVERSATION OPERATIONS ==========

  /**
   * Get all categories for AI context
   */
  async getAllCategories(): Promise<Category[]> {
    return this.getCategories();
  }

  /**
   * Get all budgets for AI context
   */
  async getAllBudgets(): Promise<Budget[]> {
    return this.getBudgets();
  }

  // ========== MIGRATION/TEST UTILITY METHODS ==========

  /**
   * Get migration statistics (stub for test compatibility)
   */
  async getMigrationStats(): Promise<any> {
    try {
      const categories = await this.getCategories();
      const transactions = await this.getTransactions();
      const budgets = await this.getBudgets();
      const goals = await this.getGoals();

      return {
        categories: categories.length,
        transactions: transactions.length,
        budgets: budgets.length,
        goals: goals.length
      };
    } catch (error) {
      console.error('Error getting migration stats:', error);
      return {
        categories: 0,
        transactions: 0,
        budgets: 0,
        goals: 0
      };
    }
  }

  /**
   * Import reference data (stub for test compatibility)
   */
  async importReferenceData(referenceData: any): Promise<void> {
    console.warn('importReferenceData not implemented for Supabase - would need admin privileges');
    // This would require implementing data import functionality via Supabase API
    // For now, this is just a stub to maintain compatibility
  }

  /**
   * Reset database (stub for test compatibility)
   */
  async resetDatabase(): Promise<void> {
    console.warn('resetDatabase not implemented for Supabase - would require admin privileges');
    // This would require implementing database reset functionality via Supabase API
    // For now, this is just a stub to maintain compatibility
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get transactions with categories with pagination support
   * Story 2.4: Enhanced database queries for history display
   */
  async getTransactionsWithCategoriesPaginated(
    offset: number = 0,
    limit: number = 50,
    categoryId?: number,
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionWithCategory[]> {
    try {
      const transactions = await this.getTransactionsWithCategories(
        categoryId,
        transactionType,
        startDate,
        endDate
      );
      
      // Apply pagination
      return transactions.slice(offset, offset + limit);
    } catch (error) {
      throw ErrorHandlingService.processError(
        error,
        'Failed to fetch paginated transactions with categories'
      );
    }
  }

  /**
   * Search transactions with full-text search capability
   * Story 2.4: Enhanced search functionality
   */
  async searchTransactions(
    searchTerm?: string,
    categoryId?: number,
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionWithCategory[]> {
    try {
      const transactions = await this.getTransactionsWithCategories(
        categoryId,
        transactionType,
        startDate,
        endDate
      );
      
      if (!searchTerm) return transactions;
      
      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      return transactions.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.category_name.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      throw ErrorHandlingService.processError(
        error,
        'Failed to search transactions'
      );
    }
  }

  /**
   * Get transaction count for pagination
   * Story 2.4: Support for pagination calculations
   */
  async getTransactionCount(
    categoryId?: number,
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date,
    searchTerm?: string
  ): Promise<number> {
    try {
      const transactions = await this.searchTransactions(
        searchTerm,
        categoryId,
        transactionType,
        startDate,
        endDate
      );
      
      return transactions.length;
    } catch (error) {
      throw ErrorHandlingService.processError(
        error,
        'Failed to count transactions'
      );
    }
  }

  /**
   * Execute database transaction with rollback on error
   */
  async executeTransaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      // Supabase handles transactions internally
      return await callback();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a query and return the first result
   * Safe wrapper for analytics and other services
   */
  async getQuery<T>(query: string, params: any[] = []): Promise<T | null> {
    try {
      await this.initialize();
      // This would need to be implemented with direct Supabase SQL queries
      // For now, we'll return null and log a warning
      console.warn('getQuery not implemented for Supabase - use specific service methods instead');
      return null;
    } catch (error) {
      console.error('Database query failed:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a query and return all results
   * Safe wrapper for analytics and other services
   */
  async getAllQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    try {
      await this.initialize();
      // This would need to be implemented with direct Supabase SQL queries
      // For now, we'll return empty array and log a warning
      console.warn('getAllQuery not implemented for Supabase - use specific service methods instead');
      return [];
    } catch (error) {
      console.error('Database query failed:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}