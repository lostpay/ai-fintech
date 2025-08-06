import { DatabaseService } from './DatabaseService';
import { BudgetCalculationService } from './BudgetCalculationService';
import {
  MonthlyBudgetPerformance,
  CategoryPerformance,
  SpendingTrend,
  BudgetSuccessMetrics,
  AnalyticsInsight
} from '../types/BudgetAnalytics';

export class BudgetAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private databaseService: DatabaseService,
    private budgetCalculationService: BudgetCalculationService
  ) {}

  /**
   * Calculate monthly budget performance for date range
   */
  async calculateMonthlyBudgetPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyBudgetPerformance[]> {
    const cacheKey = this.getCacheKey('monthlyPerformance', [startDate, endDate]);
    const cached = this.getCachedResult<MonthlyBudgetPerformance[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const months = this.getMonthsInRange(startDate, endDate);
      const results: MonthlyBudgetPerformance[] = [];

      for (const month of months) {
        const monthStart = new Date(month + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        // Get all budgets for this month - use proper database service method
        const budgets = await this.getBudgetsForMonth(monthStart, monthEnd);

        let totalBudgeted = 0;
        let totalSpent = 0;
        let budgetsMet = 0;
        const categories: CategoryPerformance[] = [];

        for (const budget of budgets) {
          // Calculate actual spending for this category in this month
          const spentAmount = await this.getMonthlySpending(budget.category_id, monthStart, monthEnd);
          const utilization = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

          totalBudgeted += budget.amount;
          totalSpent += spentAmount;
          
          if (spentAmount <= budget.amount) {
            budgetsMet++;
          }

          // Calculate trend and consistency
          const trend = await this.calculateCategoryTrend(budget.category_id, monthStart);
          const consistencyScore = await this.calculateConsistencyScore([spentAmount], budget.amount);

          categories.push({
            category_id: budget.category_id,
            category_name: budget.category_name,
            category_color: budget.category_color,
            category_icon: budget.category_icon || 'help-outline',
            budgeted_amount: budget.amount,
            spent_amount: spentAmount,
            utilization_percentage: utilization,
            status: utilization <= 90 ? 'under' : utilization <= 100 ? 'on_track' : 'over',
            trend,
            consistency_score: consistencyScore,
            recommendations: await this.generateCategoryRecommendations({
              category_id: budget.category_id,
              category_name: budget.category_name,
              utilization_percentage: utilization,
              status: utilization <= 90 ? 'under' : utilization <= 100 ? 'on_track' : 'over',
            } as CategoryPerformance),
          });
        }

        const budgetUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
        const successRate = budgets.length > 0 ? (budgetsMet / budgets.length) * 100 : 0;
        const averageOverspend = totalSpent > totalBudgeted ? 
          (totalSpent - totalBudgeted) / Math.max(budgets.length - budgetsMet, 1) : 0;

        results.push({
          month,
          total_budgeted: totalBudgeted,
          total_spent: totalSpent,
          budget_utilization: budgetUtilization,
          budgets_met: budgetsMet,
          total_budgets: budgets.length,
          success_rate: successRate,
          average_overspend: averageOverspend,
          categories,
        });
      }

      this.setCachedResult(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Failed to calculate monthly budget performance:', error);
      throw error;
    }
  }

  /**
   * Calculate spending trends for category or overall
   */
  async calculateSpendingTrends(
    categoryId?: number,
    periodMonths: number = 6
  ): Promise<SpendingTrend[]> {
    const cacheKey = this.getCacheKey('spendingTrends', [categoryId, periodMonths]);
    const cached = this.getCachedResult<SpendingTrend[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - periodMonths);

      const months = this.getMonthsInRange(startDate, endDate);
      const trends: SpendingTrend[] = [];

      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const monthStart = new Date(month + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        // Get spending for this month
        const query = categoryId 
          ? `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
             WHERE category_id = ? AND date >= ? AND date <= ? AND transaction_type = 'expense'`
          : `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
             WHERE date >= ? AND date <= ? AND transaction_type = 'expense'`;
        
        const params = categoryId 
          ? [categoryId, monthStart.toISOString(), monthEnd.toISOString()]
          : [monthStart.toISOString(), monthEnd.toISOString()];

        const result = await this.executeQuery<{ total: number }>(query, params, 'first') as { total: number } | null;
        const amount = result?.total || 0;

        // Calculate change from previous month
        let changeFromPrevious = 0;
        let changePercentage = 0;
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';

        if (i > 0) {
          const previousAmount = trends[i - 1].amount;
          changeFromPrevious = amount - previousAmount;
          changePercentage = previousAmount > 0 ? (changeFromPrevious / previousAmount) * 100 : 0;
          
          if (Math.abs(changePercentage) < 5) {
            trendDirection = 'stable';
          } else {
            trendDirection = changeFromPrevious > 0 ? 'up' : 'down';
          }
        }

        trends.push({
          period: month,
          amount,
          change_from_previous: changeFromPrevious,
          change_percentage: changePercentage,
          trend_direction: trendDirection,
        });
      }

      this.setCachedResult(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Failed to calculate spending trends:', error);
      throw error;
    }
  }

  /**
   * Get budget success metrics
   */
  async getBudgetSuccessMetrics(periodMonths: number = 12): Promise<BudgetSuccessMetrics> {
    const cacheKey = this.getCacheKey('successMetrics', [periodMonths]);
    const cached = this.getCachedResult<BudgetSuccessMetrics>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - periodMonths);

      const monthlyPerformance = await this.calculateMonthlyBudgetPerformance(startDate, endDate);
      const categoryPerformance = await this.getCategoryPerformanceAnalysis(periodMonths);

      // Calculate overall success rate
      const totalBudgets = monthlyPerformance.reduce((sum, month) => sum + month.total_budgets, 0);
      const totalBudgetsMet = monthlyPerformance.reduce((sum, month) => sum + month.budgets_met, 0);
      const overallSuccessRate = totalBudgets > 0 ? (totalBudgetsMet / totalBudgets) * 100 : 0;

      // Calculate streaks
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;

      for (let i = monthlyPerformance.length - 1; i >= 0; i--) {
        const month = monthlyPerformance[i];
        const monthSuccess = month.success_rate >= 80; // 80% success rate threshold
        
        if (monthSuccess) {
          tempStreak++;
          if (i === monthlyPerformance.length - 1) {
            currentStreak = tempStreak;
          }
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);

      // Calculate average overspend
      const totalOverspend = monthlyPerformance.reduce((sum, month) => {
        return sum + Math.max(0, month.total_spent - month.total_budgeted);
      }, 0);
      const averageOverspend = monthlyPerformance.length > 0 ? totalOverspend / monthlyPerformance.length : 0;

      // Find best and worst performing categories
      const sortedCategories = [...categoryPerformance].sort((a, b) => a.utilization_percentage - b.utilization_percentage);
      const mostSuccessfulCategory = sortedCategories.find(c => c.status !== 'over') || sortedCategories[0];
      const mostChallengingCategory = sortedCategories.reverse()[0];

      // Calculate improvement trend
      let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (monthlyPerformance.length >= 3) {
        const recent3Months = monthlyPerformance.slice(-3);
        const first = recent3Months[0].success_rate;
        const last = recent3Months[recent3Months.length - 1].success_rate;
        const change = last - first;
        
        if (change > 10) improvementTrend = 'improving';
        else if (change < -10) improvementTrend = 'declining';
      }

      const metrics: BudgetSuccessMetrics = {
        overall_success_rate: overallSuccessRate,
        current_streak: currentStreak,
        best_streak: bestStreak,
        average_overspend: averageOverspend,
        most_successful_category: mostSuccessfulCategory,
        most_challenging_category: mostChallengingCategory,
        improvement_trend: improvementTrend,
        monthly_performance: monthlyPerformance,
      };

      this.setCachedResult(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get budget success metrics:', error);
      throw error;
    }
  }

  /**
   * Get category performance analysis
   */
  async getCategoryPerformanceAnalysis(periodMonths: number = 6): Promise<CategoryPerformance[]> {
    const cacheKey = this.getCacheKey('categoryPerformance', [periodMonths]);
    const cached = this.getCachedResult<CategoryPerformance[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - periodMonths);

      const monthlyPerformance = await this.calculateMonthlyBudgetPerformance(startDate, endDate);
      
      // Aggregate category performance across all months
      const categoryMap = new Map<number, CategoryPerformance>();

      for (const month of monthlyPerformance) {
        for (const category of month.categories) {
          if (categoryMap.has(category.category_id)) {
            const existing = categoryMap.get(category.category_id)!;
            existing.budgeted_amount += category.budgeted_amount;
            existing.spent_amount += category.spent_amount;
            existing.utilization_percentage = existing.budgeted_amount > 0 
              ? (existing.spent_amount / existing.budgeted_amount) * 100 : 0;
          } else {
            categoryMap.set(category.category_id, { ...category });
          }
        }
      }

      // Update status and generate recommendations for aggregated data
      const categories = Array.from(categoryMap.values());
      for (const category of categories) {
        const utilization = category.utilization_percentage;
        category.status = utilization <= 90 ? 'under' : utilization <= 100 ? 'on_track' : 'over';
        category.recommendations = await this.generateCategoryRecommendations(category);
      }

      this.setCachedResult(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error('Failed to get category performance analysis:', error);
      throw error;
    }
  }

  /**
   * Generate insights and recommendations
   */
  async generateInsights(performance: MonthlyBudgetPerformance[]): Promise<string[]> {
    const insights: string[] = [];
    
    if (performance.length < 2) return insights;

    // Trend analysis
    const latestMonth = performance[performance.length - 1];
    const previousMonth = performance[performance.length - 2];
    
    const successRateChange = latestMonth.success_rate - previousMonth.success_rate;
    if (successRateChange > 10) {
      insights.push(`Great improvement! Your budget success rate increased by ${successRateChange.toFixed(0)}% this month.`);
    } else if (successRateChange < -10) {
      insights.push(`Your budget success rate decreased by ${Math.abs(successRateChange).toFixed(0)}% this month. Consider reviewing your spending patterns.`);
    }

    // Spending pattern analysis
    const avgUtilization = performance.reduce((sum, p) => sum + p.budget_utilization, 0) / performance.length;
    if (avgUtilization < 80) {
      insights.push(`You typically use ${avgUtilization.toFixed(0)}% of your budgets. Consider adjusting budget amounts to better match your spending.`);
    } else if (avgUtilization > 105) {
      insights.push(`You're averaging ${avgUtilization.toFixed(0)}% of your budgets. Consider increasing budget amounts or focusing on spending reduction.`);
    }

    // Category analysis
    const categoryIssues = latestMonth.categories.filter(c => c.status === 'over');
    if (categoryIssues.length > 0) {
      const worstCategory = categoryIssues.reduce((worst, current) => 
        current.utilization_percentage > worst.utilization_percentage ? current : worst
      );
      insights.push(`${worstCategory.category_name} is your most challenging category at ${worstCategory.utilization_percentage.toFixed(0)}% of budget.`);
    }

    // Success pattern recognition
    const consistentSuccesses = latestMonth.categories.filter(c => c.consistency_score > 0.8 && c.status !== 'over');
    if (consistentSuccesses.length > 0) {
      insights.push(`You're consistently managing your ${consistentSuccesses[0].category_name} budget well. Apply similar strategies to other categories.`);
    }

    return insights;
  }

  /**
   * Clear all cached analytics data
   */
  clearCache(): void {
    this.cache.clear();
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

  private getMonthsInRange(startDate: Date, endDate: Date): string[] {
    const months: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private async calculateCategoryTrend(categoryId: number, currentMonth: Date): Promise<'improving' | 'stable' | 'worsening'> {
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 2, 1);

    // Get spending for last 3 months
    const recentSpending = await Promise.all([
      this.getMonthlySpending(categoryId, twoMonthsAgo),
      this.getMonthlySpending(categoryId, previousMonth),
      this.getMonthlySpending(categoryId, currentMonth),
    ]);

    const [twoMonthsSpending, lastMonthSpending, currentSpending] = recentSpending;

    // Calculate trend direction
    const trend1 = lastMonthSpending - twoMonthsSpending;
    const trend2 = currentSpending - lastMonthSpending;

    if (trend1 < 0 && trend2 < 0) return 'improving'; // Decreasing spending
    if (trend1 > 0 && trend2 > 0) return 'worsening'; // Increasing spending
    return 'stable';
  }

  private async getMonthlySpending(categoryId: number, monthStart: Date, monthEnd?: Date): Promise<number> {
    // If monthEnd is not provided, calculate it from monthStart
    if (!monthEnd) {
      const month = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
      monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      monthStart = month;
    }

    const result = await this.executeQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE category_id = ? AND date >= ? AND date <= ? AND transaction_type = 'expense'`,
      [categoryId, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]],
      'first'
    ) as { total: number } | null;

    return result?.total || 0;
  }

  private async calculateConsistencyScore(categorySpending: number[], budgetAmount: number): Promise<number> {
    if (categorySpending.length === 0 || budgetAmount === 0) return 0;

    // Calculate coefficient of variation (std dev / mean)
    const mean = categorySpending.reduce((sum, val) => sum + val, 0) / categorySpending.length;
    const variance = categorySpending.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / categorySpending.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Convert to score (lower CV = higher consistency)
    return Math.max(0, 1 - cv);
  }

  private async generateCategoryRecommendations(category: CategoryPerformance): Promise<string[]> {
    const recommendations: string[] = [];

    if (category.status === 'over') {
      if (category.utilization_percentage > 150) {
        recommendations.push('Consider significantly increasing your budget or reviewing spending habits');
      } else {
        recommendations.push('You\'re over budget - try to reduce spending in this category');
      }
    } else if (category.status === 'under' && category.utilization_percentage < 50) {
      recommendations.push('You\'re well under budget - consider reallocating funds to other categories');
    } else if (category.status === 'on_track') {
      recommendations.push('Great job staying on track with this budget');
    }

    if (category.trend === 'worsening') {
      recommendations.push('Spending is increasing - consider setting alerts or reviewing recent transactions');
    } else if (category.trend === 'improving') {
      recommendations.push('Great improvement in spending control!');
    }

    if (category.consistency_score < 0.3) {
      recommendations.push('Spending varies significantly - try to establish more consistent habits');
    }

    return recommendations;
  }

  // ========== DATABASE HELPER METHODS ==========

  /**
   * Execute database queries safely with proper error handling and retry logic
   */
  private async executeQuery<T>(
    query: string, 
    params: any[], 
    type: 'first' | 'all' = 'all',
    retryCount = 0
  ): Promise<T | T[] | null> {
    const maxRetries = 3;
    const baseDelay = 200;
    
    try {
      // Ensure database is initialized before each query
      await this.databaseService.initialize();
      
      // Add a small delay to prevent rapid consecutive calls
      if (retryCount > 0) {
        const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (type === 'first') {
        return await this.databaseService.getQuery<T>(query, params);
      } else {
        return await this.databaseService.getAllQuery<T>(query, params);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database query failed:', errorMessage);
      
      // Retry for connection-related errors
      if (retryCount < maxRetries && (
        errorMessage.includes('NullPointerException') ||
        errorMessage.includes('prepareAsync') ||
        errorMessage.includes('Database not connected') ||
        errorMessage.includes('connection')
      )) {
        console.log(`Retrying database query... (attempt ${retryCount + 1}/${maxRetries})`);
        return this.executeQuery<T>(query, params, type, retryCount + 1);
      }
      
      throw new Error(`Database query failed: ${errorMessage}`);
    }
  }

  /**
   * Get budgets for a specific month with category information
   */
  private async getBudgetsForMonth(monthStart: Date, monthEnd: Date): Promise<any[]> {
    const budgets = await this.executeQuery<any>(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.period_start <= ? AND b.period_end >= ?`,
      [monthEnd.toISOString().split('T')[0], monthStart.toISOString().split('T')[0]],
      'all'
    );

    return Array.isArray(budgets) ? budgets : [];
  }
}