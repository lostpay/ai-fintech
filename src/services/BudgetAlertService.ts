import { DatabaseService } from './DatabaseService';
import { BudgetCalculationService } from './BudgetCalculationService';
import { 
  BudgetAlert, 
  BudgetImpact, 
  AlertType, 
  AlertSeverity, 
  BudgetStatusType 
} from '../types/BudgetAlert';
import { formatCurrency } from '../utils/currency';
import { Transaction } from '../types/Transaction';
import { 
  generateLocalizedAlertMessage, 
  getLocalizedSuggestedActions, 
  getCurrentLanguage 
} from '../utils/alertMessages';

export class BudgetAlertService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private calculationCache = new Map<string, BudgetImpact>();
  private alertGenerationQueue = new Map<number, NodeJS.Timeout>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(
    private databaseService: DatabaseService,
    private budgetCalculationService: BudgetCalculationService
  ) {}

  /**
   * Calculate budget impact for a transaction
   */
  async calculateBudgetImpact(transactionId: number): Promise<BudgetImpact | null> {
    const cacheKey = `impact_${transactionId}`;
    const cached = this.calculationCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      await this.databaseService.initialize();

      // Get transaction details
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction || transaction.transaction_type !== 'expense') {
        return null;
      }

      // Calculate budget status before and after this transaction
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const relevantBudget = budgetProgress.find(bp => bp.category_id === transaction.category_id);
      
      if (!relevantBudget) {
        return null; // No budget for this category
      }

      // Calculate impact
      const budgetBefore = {
        spent: relevantBudget.spent_amount - transaction.amount,
        remaining: relevantBudget.remaining_amount + transaction.amount,
        percentage: ((relevantBudget.spent_amount - transaction.amount) / relevantBudget.budgeted_amount) * 100,
        status: this.calculateBudgetStatus(((relevantBudget.spent_amount - transaction.amount) / relevantBudget.budgeted_amount) * 100),
      };

      const budgetAfter = {
        spent: relevantBudget.spent_amount,
        remaining: relevantBudget.remaining_amount,
        percentage: relevantBudget.percentage_used,
        status: relevantBudget.status as BudgetStatusType,
      };

      // Generate alerts if thresholds were crossed
      const alertsTriggered = await this.checkBudgetThresholds(
        transaction.category_id,
        relevantBudget.spent_amount,
        transactionId
      );

      const impact: BudgetImpact = {
        transaction_id: transactionId,
        category_id: transaction.category_id,
        category_name: transaction.category_name || 'Unknown Category',
        budget_before: budgetBefore,
        budget_after: budgetAfter,
        alerts_triggered: alertsTriggered,
      };

      // Cache result
      this.calculationCache.set(cacheKey, impact);
      setTimeout(() => this.calculationCache.delete(cacheKey), this.CACHE_TTL);

      return impact;
    } catch (error) {
      console.error('Failed to calculate budget impact:', error);
      throw error;
    }
  }

  /**
   * Check budget thresholds and generate alerts
   */
  async checkBudgetThresholds(
    categoryId: number, 
    currentSpentAmount: number,
    transactionId?: number
  ): Promise<BudgetAlert[]> {
    try {
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const budgetForCategory = budgetProgress.find(bp => bp.category_id === categoryId);
      
      if (!budgetForCategory) {
        return []; // No budget for this category
      }

      const alerts: BudgetAlert[] = [];
      const percentageUsed = budgetForCategory.percentage_used;

      // Check for alert conditions
      if (percentageUsed > 100) {
        // Over budget
        alerts.push(await this.createAlert(
          budgetForCategory,
          'over_budget',
          'error',
          transactionId
        ));
      } else if (percentageUsed === 100) {
        // At budget limit
        alerts.push(await this.createAlert(
          budgetForCategory,
          'at_limit',
          'warning',
          transactionId
        ));
      } else if (percentageUsed >= 75) {
        // Approaching budget limit
        alerts.push(await this.createAlert(
          budgetForCategory,
          'approaching',
          'warning',
          transactionId
        ));
      }

      return alerts;
    } catch (error) {
      console.error('Failed to check budget thresholds:', error);
      return [];
    }
  }

  /**
   * Generate alerts for a transaction (with debouncing)
   */
  async generateAlertsForTransaction(transactionId: number): Promise<BudgetAlert[]> {
    const transaction = await this.getTransactionById(transactionId);
    if (!transaction || transaction.transaction_type !== 'expense') {
      return [];
    }

    // Clear existing timeout for this category
    const existingTimeout = this.alertGenerationQueue.get(transaction.category_id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for debounced processing
    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        try {
          const alerts = await this.checkBudgetThresholds(transaction.category_id, 0, transactionId);
          this.alertGenerationQueue.delete(transaction.category_id);
          resolve(alerts);
        } catch (error) {
          console.error('Failed to generate alerts for transaction:', error);
          this.alertGenerationQueue.delete(transaction.category_id);
          resolve([]);
        }
      }, 500); // 500ms debounce

      this.alertGenerationQueue.set(transaction.category_id, timeout);
    });
  }

  /**
   * Get active alerts that haven't been acknowledged
   */
  async getActiveAlerts(): Promise<BudgetAlert[]> {
    try {
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const alerts: BudgetAlert[] = [];

      for (const budget of budgetProgress) {
        const percentageUsed = budget.percentage_used;

        if (percentageUsed > 100) {
          // Over budget
          alerts.push(await this.createAlert(budget, 'over_budget', 'error'));
        } else if (percentageUsed === 100) {
          // At budget limit  
          alerts.push(await this.createAlert(budget, 'at_limit', 'warning'));
        } else if (percentageUsed >= 75) {
          // Approaching budget limit
          alerts.push(await this.createAlert(budget, 'approaching', 'warning'));
        }
      }

      return alerts.filter(alert => !alert.acknowledged);
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      // For now, we'll handle acknowledgment in memory
      // In a full implementation, this would persist to database
      console.log(`Alert ${alertId} acknowledged`);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Generate contextual alert message with localization support
   */
  generateAlertMessage(alert: BudgetAlert): string {
    const currentLanguage = getCurrentLanguage();
    return generateLocalizedAlertMessage(alert, currentLanguage);
  }

  /**
   * Get suggested actions for an alert with localization support
   */
  getSuggestedActions(alert: BudgetAlert): string[] {
    const currentLanguage = getCurrentLanguage();
    return getLocalizedSuggestedActions(alert, currentLanguage);
  }

  /**
   * Get all over-budget categories with detailed information
   */
  async getOverBudgetCategories(): Promise<BudgetAlert[]> {
    try {
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const overBudgetAlerts: BudgetAlert[] = [];

      for (const budget of budgetProgress) {
        if (budget.percentage_used > 100) {
          const alert = await this.createAlert(budget, 'over_budget', 'error');
          overBudgetAlerts.push(alert);
        }
      }

      return overBudgetAlerts.sort((a, b) => b.percentage_used - a.percentage_used);
    } catch (error) {
      console.error('Failed to get over-budget categories:', error);
      return [];
    }
  }

  /**
   * Generate spending reduction suggestions for over-budget categories
   */
  async generateSpendingReductionSuggestions(categoryId: number): Promise<string[]> {
    try {
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const budget = budgetProgress.find(bp => bp.category_id === categoryId);
      
      if (!budget || budget.percentage_used <= 100) {
        return [];
      }

      const overAmount = budget.spent_amount - budget.budgeted_amount;
      const suggestions: string[] = [];

      // Calculate target reduction amounts
      const dailyOverage = overAmount / 30; // Rough daily overage
      const weeklyOverage = overAmount / 4; // Rough weekly overage

      suggestions.push(`Reduce ${budget.category_name} spending by ${formatCurrency(overAmount)} this month`);
      suggestions.push(`Cut back ${formatCurrency(weeklyOverage)} per week in ${budget.category_name}`);
      suggestions.push(`Limit ${budget.category_name} to ${formatCurrency(dailyOverage)} less per day`);
      
      // Category-specific suggestions
      switch (budget.category_name.toLowerCase()) {
        case 'dining':
        case 'food':
          suggestions.push('Cook more meals at home');
          suggestions.push('Limit restaurant visits to weekends');
          suggestions.push('Pack lunch for work');
          break;
        case 'entertainment':
        case 'leisure':
          suggestions.push('Choose free entertainment options');
          suggestions.push('Limit streaming subscriptions');
          suggestions.push('Find budget-friendly activities');
          break;
        case 'shopping':
        case 'retail':
          suggestions.push('Implement a 48-hour wait rule before purchases');
          suggestions.push('Use shopping lists to avoid impulse buying');
          suggestions.push('Compare prices before purchasing');
          break;
        case 'transportation':
        case 'gas':
          suggestions.push('Combine errands into single trips');
          suggestions.push('Consider carpooling or public transit');
          suggestions.push('Walk or bike for short distances');
          break;
        default:
          suggestions.push('Review recent transactions for unnecessary expenses');
          suggestions.push('Look for subscription services to cancel');
          break;
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate spending reduction suggestions:', error);
      return [];
    }
  }

  /**
   * Get recovery tracking progress for over-budget categories
   */
  async getRecoveryProgress(categoryId: number): Promise<{
    currentOverage: number;
    targetReduction: number;
    progressPercentage: number;
    daysRemaining: number;
    recommendedDailySpending: number;
  } | null> {
    try {
      const budgetProgress = await this.budgetCalculationService.getCurrentMonthBudgetProgress();
      const budget = budgetProgress.find(bp => bp.category_id === categoryId);
      
      if (!budget || budget.percentage_used <= 100) {
        return null;
      }

      const currentOverage = budget.spent_amount - budget.budgeted_amount;
      const now = new Date();
      const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
      
      // Calculate recommended daily spending to stay within budget for the rest of the month
      const remainingBudget = Math.max(0, budget.budgeted_amount - budget.spent_amount);
      const recommendedDailySpending = remainingBudget / Math.max(1, daysRemaining);

      return {
        currentOverage,
        targetReduction: currentOverage,
        progressPercentage: 0, // This would be calculated based on historical overage reduction
        daysRemaining,
        recommendedDailySpending,
      };
    } catch (error) {
      console.error('Failed to get recovery progress:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.calculationCache.clear();
  }

  // Private helper methods

  private async createAlert(
    budgetProgress: any,
    alertType: AlertType,
    severity: AlertSeverity,
    transactionId?: number
  ): Promise<BudgetAlert> {
    const alert: BudgetAlert = {
      id: this.createAlertId(),
      budget_id: budgetProgress.budget_id,
      category_name: budgetProgress.category_name,
      category_color: budgetProgress.category_color,
      alert_type: alertType,
      severity,
      message: '',
      suggested_actions: [],
      budget_amount: budgetProgress.budgeted_amount,
      spent_amount: budgetProgress.spent_amount,
      remaining_amount: budgetProgress.remaining_amount,
      percentage_used: budgetProgress.percentage_used,
      transaction_id: transactionId,
      created_at: new Date(),
      acknowledged: false,
    };

    alert.message = this.generateAlertMessage(alert);
    alert.suggested_actions = this.getSuggestedActions(alert);

    return alert;
  }

  private createAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateBudgetStatus(percentageUsed: number): BudgetStatusType {
    if (percentageUsed < 75) return 'under';
    if (percentageUsed <= 100) return 'approaching';
    return 'over';
  }

  private async getTransactionById(transactionId: number): Promise<Transaction | null> {
    try {
      await this.databaseService.initialize();
      
      const query = `
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `;

      const result = await this.databaseService['db']?.getFirstAsync<any>(query, [transactionId]);
      
      if (!result) {
        return null;
      }

      return {
        id: result.id,
        amount: result.amount,
        description: result.description,
        category_id: result.category_id,
        category_name: result.category_name,
        category_color: result.category_color,
        transaction_type: result.transaction_type as 'income' | 'expense',
        date: new Date(result.date),
        voice_note_path: result.voice_note_path,
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at)
      };
    } catch (error) {
      console.error('Failed to get transaction by ID:', error);
      return null;
    }
  }
}