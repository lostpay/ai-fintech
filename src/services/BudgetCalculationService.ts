import { DatabaseService } from './DatabaseService';
import { BudgetProgress, UnbudgetedSpending, BudgetStatus } from '../types/Budget';
import { getCurrentMonthPeriod, getMonthPeriod } from '../utils/date';

export class BudgetCalculationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private databaseService: DatabaseService) {}

  /**
   * Calculate budget progress for current month
   */
  async getCurrentMonthBudgetProgress(): Promise<BudgetProgress[]> {
    const { start, end } = getCurrentMonthPeriod();
    return this.calculateBudgetProgress(start, end);
  }

  /**
   * Calculate budget progress for specific period
   */
  async calculateBudgetProgress(periodStart?: Date, periodEnd?: Date): Promise<BudgetProgress[]> {
    const cacheKey = this.getCacheKey('calculateBudgetProgress', [periodStart, periodEnd]);
    const cached = this.getCachedResult<BudgetProgress[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      await this.databaseService.initialize();

      // Get all budgets and categories
      const budgets = await this.databaseService.getBudgets();
      const categories = await this.databaseService.getCategories();
      
      // Filter budgets by period if specified
      const filteredBudgets = budgets.filter(budget => {
        if (periodStart && budget.period_end < periodStart) return false;
        if (periodEnd && budget.period_start > periodEnd) return false;
        return true;
      });

      // Calculate progress for each budget
      const budgetProgressPromises = filteredBudgets.map(async (budget) => {
        const category = categories.find(c => c.id === budget.category_id);
        
        // Get transactions for this category within the budget period
        const transactions = await this.databaseService.getTransactions(
          budget.category_id,
          'expense',
          budget.period_start,
          budget.period_end
        );
        
        const spent_amount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const transaction_count = transactions.length;
        
        return {
          budget_id: budget.id,
          category_id: budget.category_id,
          budgeted_amount: budget.amount,
          period_start: budget.period_start,
          period_end: budget.period_end,
          category_name: category?.name || 'Unknown Category',
          category_color: category?.color || '#757575',
          spent_amount,
          transaction_count
        };
      });

      const results = await Promise.all(budgetProgressPromises);
      
      // Sort by category name
      results.sort((a, b) => a.category_name.localeCompare(b.category_name));

      const budgetProgress = results.map(row => this.mapToBudgetProgress(row));
      
      this.setCachedResult(cacheKey, budgetProgress);
      return budgetProgress;
    } catch (error) {
      console.error('Failed to calculate budget progress:', error);
      throw error;
    }
  }

  /**
   * Get unbudgeted spending for specific period
   */
  async getUnbudgetedSpending(periodStart: Date, periodEnd: Date): Promise<UnbudgetedSpending[]> {
    const cacheKey = this.getCacheKey('getUnbudgetedSpending', [periodStart, periodEnd]);
    const cached = this.getCachedResult<UnbudgetedSpending[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      await this.databaseService.initialize();

      // Get all categories, budgets, and transactions
      const categories = await this.databaseService.getCategories();
      const budgets = await this.databaseService.getBudgets();
      const transactions = await this.databaseService.getTransactions(
        undefined, // all categories
        'expense',  // only expense transactions
        periodStart,
        periodEnd
      );

      // Group transactions by category
      const transactionsByCategory = transactions.reduce((acc, transaction) => {
        if (!acc[transaction.category_id]) {
          acc[transaction.category_id] = [];
        }
        acc[transaction.category_id].push(transaction);
        return acc;
      }, {} as Record<number, typeof transactions>);

      // Find categories with spending that don't have budgets in this period
      const unbudgetedSpending: UnbudgetedSpending[] = [];

      for (const categoryId of Object.keys(transactionsByCategory)) {
        const categoryTransactions = transactionsByCategory[Number(categoryId)];
        const category = categories.find(c => c.id === Number(categoryId));
        
        if (!category || !categoryTransactions.length) continue;

        // Check if this category has a budget that covers this period
        const hasBudget = budgets.some(budget => 
          budget.category_id === Number(categoryId) &&
          budget.period_start <= periodEnd &&
          budget.period_end >= periodStart
        );

        if (!hasBudget) {
          const spent_amount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
          const transaction_count = categoryTransactions.length;

          if (spent_amount > 0) {
            unbudgetedSpending.push({
              category_id: Number(categoryId),
              category_name: category.name,
              category_color: category.color,
              spent_amount,
              transaction_count
            });
          }
        }
      }

      // Sort by spent amount descending
      unbudgetedSpending.sort((a, b) => b.spent_amount - a.spent_amount);

      this.setCachedResult(cacheKey, unbudgetedSpending);
      return unbudgetedSpending;
    } catch (error) {
      console.error('Failed to get unbudgeted spending:', error);
      throw error;
    }
  }

  /**
   * Get budget progress for specific budget
   */
  async getBudgetProgress(budgetId: number): Promise<BudgetProgress | null> {
    try {
      const allProgress = await this.calculateBudgetProgress();
      return allProgress.find(bp => bp.budget_id === budgetId) || null;
    } catch (error) {
      console.error('Failed to get budget progress:', error);
      throw error;
    }
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for transaction-related queries (call when transactions change)
   */
  clearTransactionCache(): void {
    for (const key of this.cache.keys()) {
      if (key.includes('calculateBudgetProgress') || key.includes('getUnbudgetedSpending')) {
        this.cache.delete(key);
      }
    }
  }

  // Private helper methods

  private getCacheKey(method: string, params: any[]): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedResult<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private mapToBudgetProgress(row: any): BudgetProgress {
    const budgeted_amount = row.budgeted_amount || 0;
    const spent_amount = row.spent_amount || 0;
    const remaining_amount = budgeted_amount - spent_amount;
    const percentage_used = budgeted_amount > 0 ? Math.round((spent_amount / budgeted_amount) * 100) : 0;
    const status = this.calculateBudgetStatus(percentage_used);

    return {
      budget_id: row.budget_id,
      category_id: row.category_id,
      category_name: row.category_name || 'Unknown Category',
      category_color: row.category_color || '#757575',
      budgeted_amount,
      spent_amount,
      remaining_amount,
      percentage_used,
      status,
      period_start: new Date(row.period_start),
      period_end: new Date(row.period_end)
    };
  }

  private calculateBudgetStatus(percentageUsed: number): BudgetStatus {
    if (percentageUsed < 75) return 'under';
    if (percentageUsed <= 100) return 'approaching';
    return 'over';
  }

  /**
   * Get current month date range
   */
  getCurrentMonthDateRange(): { start: Date; end: Date } {
    return getCurrentMonthPeriod();
  }

  /**
   * Get month date range for specific date
   */
  getMonthDateRange(date: Date): { start: Date; end: Date } {
    return getMonthPeriod(date);
  }
}