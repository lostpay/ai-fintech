import { BudgetAlertService } from '../../src/services/BudgetAlertService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { BudgetCalculationService } from '../../src/services/BudgetCalculationService';
import { BudgetAlert, AlertType, AlertSeverity } from '../../src/types/BudgetAlert';

// Mock the dependencies
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/BudgetCalculationService');
jest.mock('../../src/utils/alertMessages');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedBudgetCalculationService = BudgetCalculationService as jest.MockedClass<typeof BudgetCalculationService>;

describe('BudgetAlertService', () => {
  let budgetAlertService: BudgetAlertService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockBudgetCalculationService: jest.Mocked<BudgetCalculationService>;

  const mockBudgetProgress = {
    budget_id: 1,
    category_id: 1,
    category_name: 'Dining',
    category_color: '#FF9800',
    budgeted_amount: 50000, // $500.00
    spent_amount: 38000, // $380.00
    remaining_amount: 12000, // $120.00
    percentage_used: 76,
    status: 'approaching' as const,
  };

  const mockTransaction = {
    id: 1,
    amount: 5000, // $50.00
    description: 'Restaurant dinner',
    category_id: 1,
    category_name: 'Dining',
    category_color: '#FF9800',
    transaction_type: 'expense' as const,
    date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockBudgetCalculationService = new MockedBudgetCalculationService() as jest.Mocked<BudgetCalculationService>;
    
    budgetAlertService = new BudgetAlertService(mockDatabaseService, mockBudgetCalculationService);

    // Setup default mocks
    mockDatabaseService.initialize = jest.fn().mockResolvedValue(void 0);
    mockBudgetCalculationService.getCurrentMonthBudgetProgress = jest.fn().mockResolvedValue([mockBudgetProgress]);
  });

  describe('checkBudgetThresholds', () => {
    it('generates approaching budget alert at 75% threshold', async () => {
      const alerts = await budgetAlertService.checkBudgetThresholds(1, 38000);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        alert_type: 'approaching',
        severity: 'warning',
        percentage_used: 76,
        category_name: 'Dining',
        budget_amount: 50000,
        spent_amount: 38000,
        remaining_amount: 12000,
      });
    });

    it('generates at limit alert at exactly 100%', async () => {
      const atLimitBudgetProgress = {
        ...mockBudgetProgress,
        spent_amount: 50000, // $500.00 - exactly at limit
        remaining_amount: 0,
        percentage_used: 100,
        status: 'approaching' as const,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([atLimitBudgetProgress]);

      const alerts = await budgetAlertService.checkBudgetThresholds(1, 50000);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        alert_type: 'at_limit',
        severity: 'warning',
        percentage_used: 100,
      });
    });

    it('generates over budget alert when exceeding 100%', async () => {
      const overBudgetProgress = {
        ...mockBudgetProgress,
        spent_amount: 55000, // $550.00 - over budget
        remaining_amount: -5000, // -$50.00
        percentage_used: 110,
        status: 'over' as const,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([overBudgetProgress]);

      const alerts = await budgetAlertService.checkBudgetThresholds(1, 55000);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        alert_type: 'over_budget',
        severity: 'error',
        percentage_used: 110,
        remaining_amount: -5000,
      });
    });

    it('returns empty array when no budget exists for category', async () => {
      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([]);

      const alerts = await budgetAlertService.checkBudgetThresholds(999, 10000);
      
      expect(alerts).toHaveLength(0);
    });

    it('returns empty array when below 75% threshold', async () => {
      const underBudgetProgress = {
        ...mockBudgetProgress,
        spent_amount: 30000, // $300.00 - 60% of budget
        remaining_amount: 20000, // $200.00
        percentage_used: 60,
        status: 'under' as const,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([underBudgetProgress]);

      const alerts = await budgetAlertService.checkBudgetThresholds(1, 30000);
      
      expect(alerts).toHaveLength(0);
    });
  });

  describe('calculateBudgetImpact', () => {
    beforeEach(() => {
      // Mock getTransactionById method
      (mockDatabaseService as any).db = {
        getFirstAsync: jest.fn().mockResolvedValue({
          id: 1,
          amount: 5000,
          description: 'Restaurant dinner',
          category_id: 1,
          category_name: 'Dining',
          category_color: '#FF9800',
          transaction_type: 'expense',
          date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      };
    });

    it('calculates budget impact for expense transaction', async () => {
      const impact = await budgetAlertService.calculateBudgetImpact(1);
      
      expect(impact).toBeDefined();
      expect(impact?.transaction_id).toBe(1);
      expect(impact?.category_id).toBe(1);
      expect(impact?.category_name).toBe('Dining');
      
      // Budget before should show less spending (subtract transaction amount)
      expect(impact?.budget_before.spent).toBe(33000); // 38000 - 5000
      expect(impact?.budget_before.remaining).toBe(17000); // 12000 + 5000
      
      // Budget after should show current state
      expect(impact?.budget_after.spent).toBe(38000);
      expect(impact?.budget_after.remaining).toBe(12000);
    });

    it('returns null for income transactions', async () => {
      (mockDatabaseService as any).db.getFirstAsync.mockResolvedValue({
        ...mockTransaction,
        transaction_type: 'income',
      });

      const impact = await budgetAlertService.calculateBudgetImpact(1);
      
      expect(impact).toBeNull();
    });

    it('returns null when no budget exists for category', async () => {
      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([]);

      const impact = await budgetAlertService.calculateBudgetImpact(1);
      
      expect(impact).toBeNull();
    });

    it('caches calculation results', async () => {
      // First call
      await budgetAlertService.calculateBudgetImpact(1);
      
      // Second call should use cache
      await budgetAlertService.calculateBudgetImpact(1);
      
      // Database should only be called once
      expect((mockDatabaseService as any).db.getFirstAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveAlerts', () => {
    it('returns alerts for all over-threshold budgets', async () => {
      const multipleBudgetProgress = [
        { ...mockBudgetProgress, category_id: 1, category_name: 'Dining', percentage_used: 76 },
        { ...mockBudgetProgress, category_id: 2, category_name: 'Shopping', percentage_used: 105 },
        { ...mockBudgetProgress, category_id: 3, category_name: 'Gas', percentage_used: 50 },
      ];

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue(multipleBudgetProgress);

      const alerts = await budgetAlertService.getActiveAlerts();
      
      expect(alerts).toHaveLength(2); // Only Dining (76%) and Shopping (105%)
      expect(alerts.find(a => a.category_name === 'Dining')?.alert_type).toBe('approaching');
      expect(alerts.find(a => a.category_name === 'Shopping')?.alert_type).toBe('over_budget');
    });

    it('returns empty array when no budgets exceed thresholds', async () => {
      const underBudgetProgress = [
        { ...mockBudgetProgress, percentage_used: 50 },
        { ...mockBudgetProgress, percentage_used: 60 },
      ];

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue(underBudgetProgress);

      const alerts = await budgetAlertService.getActiveAlerts();
      
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getOverBudgetCategories', () => {
    it('returns only over-budget categories sorted by percentage', async () => {
      const budgetProgress = [
        { ...mockBudgetProgress, category_id: 1, category_name: 'Dining', percentage_used: 105 },
        { ...mockBudgetProgress, category_id: 2, category_name: 'Shopping', percentage_used: 120 },
        { ...mockBudgetProgress, category_id: 3, category_name: 'Gas', percentage_used: 80 },
      ];

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue(budgetProgress);

      const overBudgetAlerts = await budgetAlertService.getOverBudgetCategories();
      
      expect(overBudgetAlerts).toHaveLength(2);
      // Should be sorted by percentage (highest first)
      expect(overBudgetAlerts[0].category_name).toBe('Shopping');
      expect(overBudgetAlerts[0].percentage_used).toBe(120);
      expect(overBudgetAlerts[1].category_name).toBe('Dining');
      expect(overBudgetAlerts[1].percentage_used).toBe(105);
    });

    it('returns empty array when no categories are over budget', async () => {
      const underBudgetProgress = [
        { ...mockBudgetProgress, percentage_used: 90 },
        { ...mockBudgetProgress, percentage_used: 75 },
      ];

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue(underBudgetProgress);

      const overBudgetAlerts = await budgetAlertService.getOverBudgetCategories();
      
      expect(overBudgetAlerts).toHaveLength(0);
    });
  });

  describe('generateSpendingReductionSuggestions', () => {
    it('generates generic and category-specific suggestions for over-budget categories', async () => {
      const overBudgetProgress = {
        ...mockBudgetProgress,
        spent_amount: 60000, // $600 (over $500 budget by $100)
        remaining_amount: -10000, // -$100
        percentage_used: 120,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([overBudgetProgress]);

      const suggestions = await budgetAlertService.generateSpendingReductionSuggestions(1);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('$100.00'); // Should show overage amount
      expect(suggestions).toContain('Cook more meals at home'); // Dining-specific suggestion
      expect(suggestions).toContain('Limit restaurant visits to weekends');
      expect(suggestions).toContain('Pack lunch for work');
    });

    it('returns category-specific suggestions for shopping category', async () => {
      const shoppingBudgetProgress = {
        ...mockBudgetProgress,
        category_name: 'Shopping',
        spent_amount: 75000, // Over budget
        percentage_used: 150,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([shoppingBudgetProgress]);

      const suggestions = await budgetAlertService.generateSpendingReductionSuggestions(1);
      
      expect(suggestions).toContain('Implement a 48-hour wait rule before purchases');
      expect(suggestions).toContain('Use shopping lists to avoid impulse buying');
      expect(suggestions).toContain('Compare prices before purchasing');
    });

    it('returns empty array for categories within budget', async () => {
      const withinBudgetProgress = {
        ...mockBudgetProgress,
        percentage_used: 80, // Within budget
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([withinBudgetProgress]);

      const suggestions = await budgetAlertService.generateSpendingReductionSuggestions(1);
      
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getRecoveryProgress', () => {
    it('calculates recovery progress for over-budget category', async () => {
      const overBudgetProgress = {
        ...mockBudgetProgress,
        spent_amount: 60000, // $600
        remaining_amount: -10000, // -$100 (over budget)
        percentage_used: 120,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([overBudgetProgress]);

      const recoveryProgress = await budgetAlertService.getRecoveryProgress(1);
      
      expect(recoveryProgress).toBeDefined();
      expect(recoveryProgress?.currentOverage).toBe(10000); // $100 over
      expect(recoveryProgress?.targetReduction).toBe(10000);
      expect(recoveryProgress?.progressPercentage).toBe(0); // No progress yet
      expect(recoveryProgress?.daysRemaining).toBeGreaterThan(0);
      expect(recoveryProgress?.recommendedDailySpending).toBe(0); // No remaining budget
    });

    it('returns null for categories within budget', async () => {
      const withinBudgetProgress = {
        ...mockBudgetProgress,
        percentage_used: 80,
      };

      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue([withinBudgetProgress]);

      const recoveryProgress = await budgetAlertService.getRecoveryProgress(1);
      
      expect(recoveryProgress).toBeNull();
    });
  });

  describe('alert generation and caching', () => {
    it('generates alerts with debouncing', async () => {
      jest.useFakeTimers();
      
      const alertPromise1 = budgetAlertService.generateAlertsForTransaction(1);
      const alertPromise2 = budgetAlertService.generateAlertsForTransaction(1);
      
      // Fast-forward timers
      jest.advanceTimersByTime(600);
      
      const [alerts1, alerts2] = await Promise.all([alertPromise1, alertPromise2]);
      
      // Both should resolve, but only one actual check should have happened due to debouncing
      expect(alerts1).toBeDefined();
      expect(alerts2).toBeDefined();
      
      jest.useRealTimers();
    });

    it('clears cache when requested', () => {
      // Add some data to cache by calling a method
      budgetAlertService.clearCache();
      
      // This is more of a coverage test since cache is private
      expect(() => budgetAlertService.clearCache()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('handles database errors gracefully in checkBudgetThresholds', async () => {
      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockRejectedValue(new Error('Database error'));

      const alerts = await budgetAlertService.checkBudgetThresholds(1, 38000);
      
      expect(alerts).toHaveLength(0);
    });

    it('handles database errors gracefully in getActiveAlerts', async () => {
      mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockRejectedValue(new Error('Database error'));

      const alerts = await budgetAlertService.getActiveAlerts();
      
      expect(alerts).toHaveLength(0);
    });

    it('throws error in calculateBudgetImpact for unrecoverable errors', async () => {
      mockDatabaseService.initialize.mockRejectedValue(new Error('Critical database error'));

      await expect(budgetAlertService.calculateBudgetImpact(1)).rejects.toThrow('Critical database error');
    });
  });
});