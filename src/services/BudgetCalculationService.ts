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

      const query = `
        SELECT 
          b.id as budget_id,
          b.category_id,
          b.amount as budgeted_amount,
          b.period_start,
          b.period_end,
          c.name as category_name,
          c.color as category_color,
          COALESCE(SUM(t.amount), 0) as spent_amount,
          COUNT(t.id) as transaction_count
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON t.category_id = b.category_id 
          AND t.transaction_type = 'expense'
          AND t.date >= b.period_start 
          AND t.date <= b.period_end
        WHERE (? IS NULL OR b.period_start <= ?) 
          AND (? IS NULL OR b.period_end >= ?)
        GROUP BY b.id, b.category_id, b.amount, b.period_start, b.period_end, 
                 c.name, c.color
        ORDER BY c.name ASC
      `;

      const params = [
        periodStart?.toISOString().split('T')[0] || null,
        periodEnd?.toISOString().split('T')[0] || null,
        periodEnd?.toISOString().split('T')[0] || null,
        periodStart?.toISOString().split('T')[0] || null
      ];

      const results = await this.databaseService['db']?.getAllAsync<any>(query, params) || [];

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

      const query = `
        SELECT 
          c.id as category_id,
          c.name as category_name,
          c.color as category_color,
          SUM(t.amount) as spent_amount,
          COUNT(t.id) as transaction_count
        FROM categories c
        JOIN transactions t ON t.category_id = c.id
        LEFT JOIN budgets b ON b.category_id = c.id 
          AND t.date >= b.period_start 
          AND t.date <= b.period_end
        WHERE b.id IS NULL
          AND t.date >= ? AND t.date <= ?
          AND t.transaction_type = 'expense'
        GROUP BY c.id, c.name, c.color
        HAVING spent_amount > 0
        ORDER BY spent_amount DESC
      `;

      const params = [
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0]
      ];

      const results = await this.databaseService['db']?.getAllAsync<any>(query, params) || [];

      const unbudgetedSpending = results.map(row => ({
        category_id: row.category_id,
        category_name: row.category_name || 'Unknown Category',
        category_color: row.category_color || '#757575',
        spent_amount: row.spent_amount || 0,
        transaction_count: row.transaction_count || 0
      }));

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