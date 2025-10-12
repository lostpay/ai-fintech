import { DatabaseService } from './DatabaseService';
import { Budget, CreateBudgetRequest } from '../types/Budget';
import { getCurrentMonthPeriod, getMonthPeriod } from '../utils/date';

export class BudgetRolloverService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Check if budgets need to be rolled over and create them if needed
   * @returns Number of budgets created
   */
  async checkAndRolloverBudgets(): Promise<number> {
    try {
      await this.databaseService.initialize();

      const currentPeriod = getCurrentMonthPeriod();
      const previousMonthDate = new Date(
        currentPeriod.start.getFullYear(),
        currentPeriod.start.getMonth() - 1,
        1
      );
      const previousPeriod = getMonthPeriod(previousMonthDate);

      // Check if budgets exist for current month
      const currentBudgets = await this.getBudgetsForPeriod(
        currentPeriod.start,
        currentPeriod.end
      );

      // If current month already has budgets, no rollover needed
      if (currentBudgets.length > 0) {
        console.log('Current month already has budgets, no rollover needed');
        return 0;
      }

      // Get previous month's budgets
      const previousBudgets = await this.getBudgetsForPeriod(
        previousPeriod.start,
        previousPeriod.end
      );

      // If no previous budgets, nothing to rollover
      if (previousBudgets.length === 0) {
        console.log('No previous month budgets found to rollover');
        return 0;
      }

      // Create new budgets for current month based on previous month
      const createdCount = await this.rolloverBudgets(
        previousBudgets,
        currentPeriod.start,
        currentPeriod.end
      );

      console.log(`Successfully rolled over ${createdCount} budgets to current month`);
      return createdCount;
    } catch (error) {
      console.error('Failed to check and rollover budgets:', error);
      throw error;
    }
  }

  /**
   * Manually rollover specific budgets to a new period
   * @param budgetIds Array of budget IDs to rollover
   * @param periodStart Start date of new period
   * @param periodEnd End date of new period
   * @returns Number of budgets created
   */
  async rolloverSpecificBudgets(
    budgetIds: number[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    try {
      await this.databaseService.initialize();

      const allBudgets = await this.databaseService.getBudgets();
      const budgetsToRollover = allBudgets.filter(b => budgetIds.includes(b.id));

      if (budgetsToRollover.length === 0) {
        console.log('No budgets found to rollover');
        return 0;
      }

      const createdCount = await this.rolloverBudgets(
        budgetsToRollover,
        periodStart,
        periodEnd
      );

      console.log(`Successfully rolled over ${createdCount} specific budgets`);
      return createdCount;
    } catch (error) {
      console.error('Failed to rollover specific budgets:', error);
      throw error;
    }
  }

  /**
   * Get all budgets that existed in the previous month
   * @returns Array of previous month budgets
   */
  async getPreviousMonthBudgets(): Promise<Budget[]> {
    try {
      await this.databaseService.initialize();

      const currentPeriod = getCurrentMonthPeriod();
      const previousMonthDate = new Date(
        currentPeriod.start.getFullYear(),
        currentPeriod.start.getMonth() - 1,
        1
      );
      const previousPeriod = getMonthPeriod(previousMonthDate);

      return await this.getBudgetsForPeriod(
        previousPeriod.start,
        previousPeriod.end
      );
    } catch (error) {
      console.error('Failed to get previous month budgets:', error);
      throw error;
    }
  }

  /**
   * Check if current month has any budgets
   * @returns True if current month has budgets
   */
  async hasCurrentMonthBudgets(): Promise<boolean> {
    try {
      await this.databaseService.initialize();

      const currentPeriod = getCurrentMonthPeriod();
      const currentBudgets = await this.getBudgetsForPeriod(
        currentPeriod.start,
        currentPeriod.end
      );

      return currentBudgets.length > 0;
    } catch (error) {
      console.error('Failed to check current month budgets:', error);
      return false;
    }
  }

  /**
   * Private helper: Get budgets for a specific period
   */
  private async getBudgetsForPeriod(
    periodStart: Date,
    periodEnd: Date
  ): Promise<Budget[]> {
    const allBudgets = await this.databaseService.getBudgets();

    return allBudgets.filter(budget => {
      // Check if budget period matches exactly
      return (
        budget.period_start.getTime() === periodStart.getTime() &&
        budget.period_end.getTime() === periodEnd.getTime()
      );
    });
  }

  /**
   * Private helper: Create new budgets based on existing ones
   */
  private async rolloverBudgets(
    budgets: Budget[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    let createdCount = 0;

    for (const budget of budgets) {
      try {
        // Check if budget already exists for this category in the new period
        const existingBudget = await this.databaseService.getBudgetForPeriod(
          budget.category_id,
          periodStart,
          periodEnd
        );

        if (existingBudget) {
          console.log(
            `Budget already exists for category ${budget.category_id} in the new period, skipping`
          );
          continue;
        }

        // Create new budget with same amount and category
        const newBudgetData: CreateBudgetRequest = {
          category_id: budget.category_id,
          amount: budget.amount,
          period_start: periodStart,
          period_end: periodEnd,
        };

        await this.databaseService.createBudget(newBudgetData);
        createdCount++;

        console.log(
          `Rolled over budget for category ${budget.category_id}: $${budget.amount / 100}`
        );
      } catch (error) {
        console.error(
          `Failed to rollover budget for category ${budget.category_id}:`,
          error
        );
        // Continue with other budgets even if one fails
      }
    }

    return createdCount;
  }

  /**
   * Get budgets that can be rolled over from previous month
   * @returns Array of budgets available for rollover
   */
  async getAvailableBudgetsForRollover(): Promise<Budget[]> {
    try {
      await this.databaseService.initialize();

      const previousMonthBudgets = await this.getPreviousMonthBudgets();
      const currentPeriod = getCurrentMonthPeriod();

      // Filter out budgets that already exist in current month
      const availableBudgets: Budget[] = [];

      for (const budget of previousMonthBudgets) {
        const existingBudget = await this.databaseService.getBudgetForPeriod(
          budget.category_id,
          currentPeriod.start,
          currentPeriod.end
        );

        if (!existingBudget) {
          availableBudgets.push(budget);
        }
      }

      return availableBudgets;
    } catch (error) {
      console.error('Failed to get available budgets for rollover:', error);
      throw error;
    }
  }
}
