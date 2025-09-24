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
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds for testing

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

      // Get all categories to ensure we track spending even without budgets
      const allCategories = await this.databaseService.getCategories();

      for (const month of months) {
        const monthStart = new Date(month + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        // Get all budgets for this month
        const budgets = await this.getBudgetsForMonth(monthStart, monthEnd);

        let totalBudgeted = 0;
        let totalSpent = 0;
        let budgetsMet = 0;
        const categories: CategoryPerformance[] = [];
        const processedCategoryIds = new Set<number>();

        // Process categories with budgets
        for (const budget of budgets) {
          // Calculate actual spending for this category in this month
          const spentAmount = await this.getMonthlySpendingUsingService(budget.category_id, monthStart, monthEnd);
          const utilization = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
          processedCategoryIds.add(budget.category_id);

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

        // Also process categories without budgets but with spending
        for (const category of allCategories) {
          if (!processedCategoryIds.has(category.id)) {
            const spentAmount = await this.getMonthlySpendingUsingService(category.id, monthStart, monthEnd);
            if (spentAmount > 0) {
              totalSpent += spentAmount;

              categories.push({
                category_id: category.id,
                category_name: category.name,
                category_color: category.color,
                category_icon: category.icon || 'help-outline',
                budgeted_amount: 0,
                spent_amount: spentAmount,
                utilization_percentage: 0,
                status: 'over' as const,
                trend: 'stable' as const,
                consistency_score: 0,
                recommendations: [`No budget set for ${category.name}. Consider setting a budget to track spending.`],
              });
            }
          }
        }

        // Include the month even if no budgets exist but there's spending
        if (budgets.length > 0 || categories.length > 0 || totalSpent > 0) {
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

        // Get spending for this month using DatabaseService
        let amount = 0;
        if (categoryId) {
          amount = await this.getMonthlySpendingUsingService(categoryId, monthStart, monthEnd);
        } else {
          // Get all expense transactions for this month
          const transactions = await this.databaseService.getTransactions(
            undefined, // all categories
            'expense',
            monthStart,
            monthEnd
          );
          amount = transactions.reduce((sum, t) => sum + t.amount, 0);
        }

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
    const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0); // Include the end month

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
      this.getMonthlySpendingUsingService(categoryId, twoMonthsAgo),
      this.getMonthlySpendingUsingService(categoryId, previousMonth),
      this.getMonthlySpendingUsingService(categoryId, currentMonth),
    ]);

    const [twoMonthsSpending, lastMonthSpending, currentSpending] = recentSpending;

    // Calculate trend direction
    const trend1 = lastMonthSpending - twoMonthsSpending;
    const trend2 = currentSpending - lastMonthSpending;

    if (trend1 < 0 && trend2 < 0) return 'improving'; // Decreasing spending
    if (trend1 > 0 && trend2 > 0) return 'worsening'; // Increasing spending
    return 'stable';
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
   * Get budgets for a specific month with category information
   * Uses the DatabaseService methods instead of raw SQL
   */
  private async getBudgetsForMonth(monthStart: Date, monthEnd: Date): Promise<any[]> {
    try {
      await this.databaseService.initialize();

      // Get all budgets and categories
      const budgets = await this.databaseService.getBudgets();
      const categories = await this.databaseService.getCategories();

      // Convert dates to ISO string format for comparison
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Filter budgets that overlap with the given period
      const filteredBudgets = budgets.filter(budget => {
        const budgetStart = typeof budget.period_start === 'string'
          ? budget.period_start
          : budget.period_start.toISOString().split('T')[0];
        const budgetEnd = typeof budget.period_end === 'string'
          ? budget.period_end
          : budget.period_end.toISOString().split('T')[0];

        // Check if budget period overlaps with the month
        return budgetStart <= monthEndStr && budgetEnd >= monthStartStr;
      });

      // Join with category information
      return filteredBudgets.map(budget => {
        const category = categories.find(c => c.id === budget.category_id);
        return {
          ...budget,
          category_name: category?.name || 'Unknown Category',
          category_color: category?.color || '#757575',
          category_icon: category?.icon || 'help-outline'
        };
      });
    } catch (error) {
      console.error('Failed to get budgets for month:', error);
      return [];
    }
  }

  /**
   * Get monthly spending for a category using DatabaseService
   */
  private async getMonthlySpendingUsingService(categoryId: number, monthStart: Date, monthEnd?: Date): Promise<number> {
    try {
      if (!monthEnd) {
        const month = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
        monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        monthStart = month;
      }

      const transactions = await this.databaseService.getTransactions(
        categoryId,
        'expense',
        monthStart,
        monthEnd
      );

      const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      return total;
    } catch (error) {
      console.error('Failed to get monthly spending:', error);
      return 0;
    }
  }
}