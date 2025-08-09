import * as SQLite from 'expo-sqlite';
import { Transaction, CreateTransactionRequest, UpdateTransactionRequest, TransactionWithCategory } from '../types/Transaction';
import { Category, CreateCategoryRequest } from '../types/Category';
import { Budget, CreateBudgetRequest } from '../types/Budget';
import { Goal, CreateGoalRequest } from '../types/Goal';
import { 
  DATABASE_NAME, 
  DATABASE_VERSION,
  DEFAULT_CATEGORIES, 
  CREATE_TABLES_SQL, 
  CREATE_INDEXES_SQL,
  CREATE_TRIGGERS_SQL 
} from '../constants/database';
import { 
  validateCompleteTransaction, 
  TransactionFormData
} from '../utils/validation';
import { 
  ErrorHandlingService, 
  ValidationError
} from './ErrorHandlingService';
import { emitTransactionChanged } from '../utils/eventEmitter';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private categoriesCache: Category[] = [];
  private cacheUpdated = false;

  // Private constructor to prevent direct instantiation
  private constructor() {}

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

      // Open database connection
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      
      // Enable foreign key constraints
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Run database migrations for schema updates
      await this.runMigrations();
      
      // Create tables
      await this.createTables();
      
      // Create indexes for performance
      await this.createIndexes();
      
      // Create update triggers
      await this.createTriggers();
      
      // Populate default categories if needed
      await this.populateDefaultCategories();
      
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
   * Run database migrations for schema updates
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      // Get current schema version
      let currentVersion = 0;
      try {
        const result = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        currentVersion = result?.user_version || 0;
      } catch (error) {
        console.log('No schema version found, assuming new database');
      }
      
      console.log(`Current database version: ${currentVersion}, target version: ${DATABASE_VERSION}`);
      
      // Migration 1: Add is_hidden column to categories if it doesn't exist
      if (currentVersion < 1) {
        try {
          // Check if is_hidden column exists
          const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(categories)');
          const hasIsHidden = tableInfo.some(column => column.name === 'is_hidden');
          
          if (!hasIsHidden) {
            console.log('Adding is_hidden column to categories table');
            await this.db.execAsync('ALTER TABLE categories ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT 0');
          }
        } catch (error) {
          // Table might not exist yet, that's fine
          console.log('Categories table does not exist yet, will be created with is_hidden column');
        }
        
        // Update schema version
        await this.db.execAsync('PRAGMA user_version = 1');
        console.log('Migration to version 1 completed');
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create all required database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      await this.db.execAsync(`
        BEGIN TRANSACTION;
        ${CREATE_TABLES_SQL.CATEGORIES}
        ${CREATE_TABLES_SQL.TRANSACTIONS}
        ${CREATE_TABLES_SQL.BUDGETS}
        ${CREATE_TABLES_SQL.GOALS}
        ${CREATE_TABLES_SQL.AI_CONVERSATIONS}
        ${CREATE_TABLES_SQL.AI_QUERY_CONTEXT}
        COMMIT;
      `);
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  /**
   * Create performance indexes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    for (const indexSql of CREATE_INDEXES_SQL) {
      await this.db.execAsync(indexSql);
    }
  }

  /**
   * Create update triggers for timestamps
   */
  private async createTriggers(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    for (const triggerSql of CREATE_TRIGGERS_SQL) {
      await this.db.execAsync(triggerSql);
    }
  }

  /**
   * Populate default categories if none exist
   */
  private async populateDefaultCategories(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      // Check if categories already exist
      const result = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
      
      if (result && result.count === 0) {
        // Insert default categories using INSERT OR IGNORE to handle duplicates
        const placeholders = DEFAULT_CATEGORIES.map(() => '(?, ?, ?, ?)').join(', ');
        const values = DEFAULT_CATEGORIES.flatMap(cat => [cat.name, cat.color, cat.icon, cat.is_default]);
        
        await this.db.runAsync(
          `INSERT OR IGNORE INTO categories (name, color, icon, is_default) VALUES ${placeholders}`,
          values
        );
        
        console.log('Default categories populated successfully');
      } else {
        console.log('Categories already exist, skipping population');
      }
    } catch (error) {
      console.error('Failed to populate default categories:', error);
      // Don't throw the error - just log it and continue
      // This prevents the entire database initialization from failing
    }
  }

  /**
   * Refresh categories cache for validation
   */
  private async refreshCategoriesCache(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const categories = await this.db.getAllAsync<any>('SELECT * FROM categories ORDER BY name');
      this.categoriesCache = categories.map(cat => ({
        ...cat,
        created_at: new Date(cat.created_at),
        updated_at: new Date(cat.updated_at),
        is_default: Boolean(cat.is_default),
        is_hidden: Boolean(cat.is_hidden)
      }));
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
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      this.categoriesCache = [];
      this.cacheUpdated = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Clear all data from all tables (for testing purposes)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      await this.db.execAsync(`
        BEGIN TRANSACTION;
        DELETE FROM transactions;
        DELETE FROM budgets;
        DELETE FROM goals;
        DELETE FROM categories;
        COMMIT;
      `);
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  // ========== CATEGORY CRUD OPERATIONS ==========

  /**
   * Create a new category
   */
  async createCategory(categoryData: CreateCategoryRequest): Promise<Category> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const result = await this.db.runAsync(
        'INSERT INTO categories (name, color, icon, is_default, is_hidden) VALUES (?, ?, ?, ?, ?)',
        [
          categoryData.name, 
          categoryData.color, 
          categoryData.icon, 
          categoryData.is_default || false,
          categoryData.is_hidden || false
        ]
      );
      
      const category = await this.db.getFirstAsync<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [result.lastInsertRowId]
      );
      
      if (!category) {
        throw new Error('Failed to retrieve created category');
      }
      
      return this.formatCategoryDates(category);
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const categories = await this.db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
      return categories.map(this.formatCategoryDates);
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const category = await this.db.getFirstAsync<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      
      return category ? this.formatCategoryDates(category) : null;
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const date = transactionData.date || new Date();
      const result = await this.db.runAsync(
        'INSERT INTO transactions (amount, description, category_id, transaction_type, date) VALUES (?, ?, ?, ?, ?)',
        [
          transactionData.amount,
          transactionData.description,
          transactionData.category_id,
          transactionData.transaction_type,
          date.toISOString().split('T')[0] // Format as YYYY-MM-DD
        ]
      );
      
      const transaction = await this.db.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?',
        [result.lastInsertRowId]
      );
      
      if (!transaction) {
        throw new Error('Failed to retrieve created transaction');
      }
      
      const formattedTransaction = this.formatTransactionDates(transaction);
      
      // Emit transaction changed event for real-time budget updates
      emitTransactionChanged({
        type: 'created',
        transactionId: formattedTransaction.id,
        categoryId: formattedTransaction.category_id,
        amount: formattedTransaction.amount
      });
      
      return formattedTransaction;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw ErrorHandlingService.processError(error, 'Transaction Creation');
    }
  }

  /**
   * Create transaction with form data validation
   */
  async createTransactionWithValidation(formData: TransactionFormData): Promise<Transaction> {
    if (!this.db) throw new Error('Database not connected');
    
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

      // Transform data for database storage (dollars to cents)
      const dbData: CreateTransactionRequest = {
        amount: Math.round(sanitizedData.amount * 100), // Convert to cents
        description: sanitizedData.description,
        category_id: sanitizedData.category_id,
        transaction_type: sanitizedData.transaction_type || 'expense',
        date: sanitizedData.date instanceof Date 
          ? sanitizedData.date
          : new Date(sanitizedData.date)
      };

      // Execute database operation with transaction management
      return await this.executeTransaction(async () => {
        const insertResult = await this.db!.runAsync(
          'INSERT INTO transactions (amount, description, category_id, transaction_type, date) VALUES (?, ?, ?, ?, ?)',
          [
            dbData.amount, 
            dbData.description, 
            dbData.category_id, 
            dbData.transaction_type, 
            dbData.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
          ]
        );

        const transaction = await this.db!.getFirstAsync<Transaction>(
          'SELECT * FROM transactions WHERE id = ?',
          [insertResult.lastInsertRowId]
        );

        if (!transaction) {
          throw new Error('Failed to retrieve created transaction');
        }

        const formattedTransaction = this.formatTransactionDates(transaction);
        
        // Emit transaction changed event for real-time budget updates
        emitTransactionChanged({
          type: 'created',
          transactionId: formattedTransaction.id,
          categoryId: formattedTransaction.category_id,
          amount: formattedTransaction.amount
        });
        
        return formattedTransaction;
      });
      
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      let query = 'SELECT * FROM transactions WHERE 1=1';
      const params: any[] = [];
      
      if (categoryId) {
        query += ' AND category_id = ?';
        params.push(categoryId);
      }
      
      if (transactionType) {
        query += ' AND transaction_type = ?';
        params.push(transactionType);
      }
      
      if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate.toISOString().split('T')[0]);
      }
      
      query += ' ORDER BY date DESC, created_at DESC';
      
      const transactions = await this.db.getAllAsync<Transaction>(query, params);
      return transactions.map(this.formatTransactionDates);
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      let query = `
        SELECT 
          t.id,
          t.amount,
          t.description,
          t.category_id,
          t.transaction_type,
          t.date,
          t.created_at,
          t.updated_at,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (categoryId) {
        query += ' AND t.category_id = ?';
        params.push(categoryId);
      }
      
      if (transactionType) {
        query += ' AND t.transaction_type = ?';
        params.push(transactionType);
      }
      
      if (startDate) {
        query += ' AND t.date >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        query += ' AND t.date <= ?';
        params.push(endDate.toISOString().split('T')[0]);
      }
      
      query += ' ORDER BY t.date DESC, t.created_at DESC';
      
      const results = await this.db.getAllAsync<any>(query, params);
      
      return results.map(row => ({
        id: row.id,
        amount: row.amount,
        description: row.description,
        category_id: row.category_id,
        transaction_type: row.transaction_type,
        date: new Date(row.date),
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        category_name: row.category_name,
        category_color: row.category_color,
        category_icon: row.category_icon,
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const transaction = await this.db.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );
      
      return transaction ? this.formatTransactionDates(transaction) : null;
    } catch (error) {
      console.error('Failed to get transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: number, updateData: UpdateTransactionRequest): Promise<Transaction> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const updates: string[] = [];
      const params: any[] = [];
      
      if (updateData.amount !== undefined) {
        updates.push('amount = ?');
        params.push(updateData.amount);
      }
      
      if (updateData.description !== undefined) {
        updates.push('description = ?');
        params.push(updateData.description);
      }
      
      if (updateData.category_id !== undefined) {
        updates.push('category_id = ?');
        params.push(updateData.category_id);
      }
      
      if (updateData.transaction_type !== undefined) {
        updates.push('transaction_type = ?');
        params.push(updateData.transaction_type);
      }
      
      if (updateData.date !== undefined) {
        updates.push('date = ?');
        params.push(updateData.date.toISOString().split('T')[0]);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      params.push(id);
      
      await this.db.runAsync(
        `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      // Get transaction data before deleting for event emission
      const transaction = await this.getTransactionById(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      const result = await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Transaction not found');
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const result = await this.db.runAsync(
        'INSERT INTO budgets (category_id, amount, period_start, period_end) VALUES (?, ?, ?, ?)',
        [
          budgetData.category_id,
          budgetData.amount,
          budgetData.period_start.toISOString().split('T')[0],
          budgetData.period_end.toISOString().split('T')[0]
        ]
      );
      
      const budget = await this.db.getFirstAsync<Budget>(
        'SELECT * FROM budgets WHERE id = ?',
        [result.lastInsertRowId]
      );
      
      if (!budget) {
        throw new Error('Failed to retrieve created budget');
      }
      
      return this.formatBudgetDates(budget);
    } catch (error) {
      console.error('Failed to create budget:', error);
      throw error;
    }
  }

  /**
   * Get all budgets with category information
   */
  async getBudgets(): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const budgets = await this.db.getAllAsync<Budget>('SELECT * FROM budgets ORDER BY period_start DESC');
      return budgets.map(this.formatBudgetDates);
    } catch (error) {
      console.error('Failed to get budgets:', error);
      throw error;
    }
  }

  /**
   * Get budgets by category
   */
  async getBudgetsByCategory(categoryId: number): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const budgets = await this.db.getAllAsync<Budget>(
        'SELECT * FROM budgets WHERE category_id = ? ORDER BY period_start DESC',
        [categoryId]
      );
      return budgets.map(this.formatBudgetDates);
    } catch (error) {
      console.error('Failed to get budgets by category:', error);
      throw error;
    }
  }

  /**
   * Get budget for specific period
   */
  async getBudgetForPeriod(categoryId: number, periodStart: Date, periodEnd: Date): Promise<Budget | null> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const budget = await this.db.getFirstAsync<Budget>(
        'SELECT * FROM budgets WHERE category_id = ? AND period_start = ? AND period_end = ?',
        [categoryId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
      );
      
      return budget ? this.formatBudgetDates(budget) : null;
    } catch (error) {
      console.error('Failed to get budget for period:', error);
      throw error;
    }
  }

  /**
   * Update budget
   */
  async updateBudget(id: number, budgetData: Partial<CreateBudgetRequest>): Promise<Budget> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const updates: string[] = [];
      const params: any[] = [];
      
      if (budgetData.amount !== undefined) {
        updates.push('amount = ?');
        params.push(budgetData.amount);
      }
      
      if (budgetData.category_id !== undefined) {
        updates.push('category_id = ?');
        params.push(budgetData.category_id);
      }
      
      if (budgetData.period_start !== undefined) {
        updates.push('period_start = ?');
        params.push(budgetData.period_start.toISOString().split('T')[0]);
      }
      
      if (budgetData.period_end !== undefined) {
        updates.push('period_end = ?');
        params.push(budgetData.period_end.toISOString().split('T')[0]);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      params.push(id);
      
      await this.db.runAsync(
        `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      const budget = await this.db.getFirstAsync<Budget>(
        'SELECT * FROM budgets WHERE id = ?',
        [id]
      );
      
      if (!budget) {
        throw new Error('Failed to retrieve updated budget');
      }
      
      return this.formatBudgetDates(budget);
    } catch (error) {
      console.error('Failed to update budget:', error);
      throw error;
    }
  }

  /**
   * Delete budget
   */
  async deleteBudget(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const result = await this.db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error('Budget not found');
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const query = `
        SELECT 
          b.id,
          b.category_id,
          b.amount,
          b.period_start,
          b.period_end,
          b.created_at,
          b.updated_at,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          COALESCE(SUM(t.amount), 0) as spent_amount
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON t.category_id = b.category_id 
          AND t.transaction_type = 'expense'
          AND t.date >= b.period_start 
          AND t.date <= b.period_end
        GROUP BY b.id, b.category_id, b.amount, b.period_start, b.period_end, 
                 b.created_at, b.updated_at, c.name, c.color, c.icon
        ORDER BY b.period_start DESC
      `;
      
      const results = await this.db.getAllAsync<any>(query);
      
      return results.map(row => ({
        id: row.id,
        category_id: row.category_id,
        amount: row.amount,
        period_start: new Date(row.period_start),
        period_end: new Date(row.period_end),
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        category_name: row.category_name,
        category_color: row.category_color,
        category_icon: row.category_icon,
        spent_amount: row.spent_amount || 0,
        percentage: row.amount > 0 ? Math.round((row.spent_amount / row.amount) * 100) : 0
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const result = await this.db.runAsync(
        'INSERT INTO goals (name, target_amount, target_date, description) VALUES (?, ?, ?, ?)',
        [
          goalData.name,
          goalData.target_amount,
          goalData.target_date ? goalData.target_date.toISOString().split('T')[0] : null,
          goalData.description
        ]
      );
      
      const goal = await this.db.getFirstAsync<Goal>(
        'SELECT * FROM goals WHERE id = ?',
        [result.lastInsertRowId]
      );
      
      if (!goal) {
        throw new Error('Failed to retrieve created goal');
      }
      
      return this.formatGoalDates(goal);
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw error;
    }
  }

  /**
   * Get all goals
   */
  async getGoals(): Promise<Goal[]> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      const goals = await this.db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY created_at DESC');
      return goals.map(this.formatGoalDates);
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

  // ========== UTILITY METHODS ==========

  /**
   * Format category dates from string to Date objects
   */
  private formatCategoryDates(category: any): Category {
    return {
      ...category,
      created_at: new Date(category.created_at),
      updated_at: new Date(category.updated_at),
      is_default: Boolean(category.is_default),
      is_hidden: Boolean(category.is_hidden)
    };
  }

  /**
   * Format transaction dates from string to Date objects
   */
  private formatTransactionDates(transaction: any): Transaction {
    return {
      ...transaction,
      date: new Date(transaction.date),
      created_at: new Date(transaction.created_at),
      updated_at: new Date(transaction.updated_at)
    };
  }

  /**
   * Format transaction with category dates from string to Date objects
   */
  private formatTransactionWithCategoryDates(transaction: any): TransactionWithCategory {
    return {
      ...transaction,
      date: new Date(transaction.date),
      created_at: new Date(transaction.created_at),
      updated_at: new Date(transaction.updated_at)
    };
  }

  /**
   * Format budget dates from string to Date objects
   */
  private formatBudgetDates(budget: any): Budget {
    return {
      ...budget,
      period_start: new Date(budget.period_start),
      period_end: new Date(budget.period_end),
      created_at: new Date(budget.created_at),
      updated_at: new Date(budget.updated_at)
    };
  }

  /**
   * Format goal dates from string to Date objects
   */
  private formatGoalDates(goal: any): Goal {
    return {
      ...goal,
      target_date: goal.target_date ? new Date(goal.target_date) : null,
      created_at: new Date(goal.created_at),
      updated_at: new Date(goal.updated_at),
      is_completed: Boolean(goal.is_completed)
    };
  }

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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      let query = `
        SELECT 
          t.id,
          t.amount,
          t.description,
          t.category_id,
          t.transaction_type,
          t.date,
          t.created_at,
          t.updated_at,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (categoryId) {
        query += ' AND t.category_id = ?';
        params.push(categoryId);
      }
      
      if (transactionType) {
        query += ' AND t.transaction_type = ?';
        params.push(transactionType);
      }
      
      if (startDate) {
        query += ' AND t.date >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        query += ' AND t.date <= ?';
        params.push(endDate.toISOString().split('T')[0]);
      }
      
      query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const results = await this.db.getAllAsync<any>(query, params);
      
      return results.map(this.formatTransactionWithCategoryDates);
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      let query = `
        SELECT 
          t.id,
          t.amount,
          t.description,
          t.category_id,
          t.transaction_type,
          t.date,
          t.created_at,
          t.updated_at,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (searchTerm) {
        query += ' AND (t.description LIKE ? OR c.name LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern);
      }
      
      if (categoryId) {
        query += ' AND t.category_id = ?';
        params.push(categoryId);
      }
      
      if (transactionType) {
        query += ' AND t.transaction_type = ?';
        params.push(transactionType);
      }
      
      if (startDate) {
        query += ' AND t.date >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        query += ' AND t.date <= ?';
        params.push(endDate.toISOString().split('T')[0]);
      }
      
      query += ' ORDER BY t.date DESC, t.created_at DESC';
      
      const results = await this.db.getAllAsync<any>(query, params);
      
      return results.map(this.formatTransactionWithCategoryDates);
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (searchTerm) {
        query += ' AND (t.description LIKE ? OR c.name LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern);
      }
      
      if (categoryId) {
        query += ' AND t.category_id = ?';
        params.push(categoryId);
      }
      
      if (transactionType) {
        query += ' AND t.transaction_type = ?';
        params.push(transactionType);
      }
      
      if (startDate) {
        query += ' AND t.date >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        query += ' AND t.date <= ?';
        params.push(endDate.toISOString().split('T')[0]);
      }
      
      const result = await this.db.getFirstAsync<{ count: number }>(query, params);
      return result?.count ?? 0;
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      await this.db.execAsync('BEGIN TRANSACTION;');
      const result = await callback();
      await this.db.execAsync('COMMIT;');
      return result;
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  /**
   * Execute a query and return the first result
   * Safe wrapper for analytics and other services
   */
  async getQuery<T>(query: string, params: any[] = []): Promise<T | null> {
    if (!this.db) throw new Error('Database not connected');
    
    try {
      await this.initialize();
      const result = await this.db.getFirstAsync<T>(query, params);
      return result || null;
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
    if (!this.db) throw new Error('Database not connected');
    
    try {
      await this.initialize();
      const results = await this.db.getAllAsync<T>(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Database query failed:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}