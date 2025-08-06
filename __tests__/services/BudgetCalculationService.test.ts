import { BudgetCalculationService } from '../../src/services/BudgetCalculationService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { getCurrentMonthPeriod } from '../../src/utils/date';
import { BudgetProgress, UnbudgetedSpending } from '../../src/types/Budget';

// Mock the DatabaseService
jest.mock('../../src/services/DatabaseService');

describe('BudgetCalculationService', () => {
  let budgetCalculationService: BudgetCalculationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    budgetCalculationService = new BudgetCalculationService(mockDatabaseService);
    jest.clearAllMocks();
  });

  describe('calculateBudgetProgress', () => {
    it('should calculate budget progress correctly for under budget scenario', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000, // $500
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 25000, // $250 spent
          transaction_count: 5,
        },
      ];

      // Mock database service methods
      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const result = await budgetCalculationService.calculateBudgetProgress();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        budget_id: 1,
        category_id: 1,
        category_name: 'Dining',
        category_color: '#FF5722',
        budgeted_amount: 50000,
        spent_amount: 25000,
        remaining_amount: 25000,
        percentage_used: 50,
        status: 'under',
      });
    });

    it('should handle over budget scenario with negative remaining amount', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000, // $500
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 60000, // $600 spent, over budget
          transaction_count: 8,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const result = await budgetCalculationService.calculateBudgetProgress();

      expect(result[0]).toMatchObject({
        spent_amount: 60000,
        remaining_amount: -10000, // $100 over budget
        percentage_used: 120,
        status: 'over',
      });
    });

    it('should handle approaching budget scenario', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000, // $500
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 40000, // $400 spent (80% of budget)
          transaction_count: 6,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const result = await budgetCalculationService.calculateBudgetProgress();

      expect(result[0]).toMatchObject({
        spent_amount: 40000,
        remaining_amount: 10000,
        percentage_used: 80,
        status: 'approaching',
      });
    });

    it('should handle empty budget data', async () => {
      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue([]),
      } as any;

      const result = await budgetCalculationService.calculateBudgetProgress();

      expect(result).toEqual([]);
    });

    it('should handle null/undefined values gracefully', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: null, // Null category name
          category_color: null, // Null category color
          spent_amount: null, // Null spent amount
          transaction_count: 0,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const result = await budgetCalculationService.calculateBudgetProgress();

      expect(result[0]).toMatchObject({
        category_name: 'Unknown Category',
        category_color: '#757575',
        spent_amount: 0,
        remaining_amount: 50000,
        percentage_used: 0,
        status: 'under',
      });
    });
  });

  describe('getUnbudgetedSpending', () => {
    it('should calculate unbudgeted spending correctly', async () => {
      const mockDbData = [
        {
          category_id: 2,
          category_name: 'Entertainment',
          category_color: '#9C27B0',
          spent_amount: 15000, // $150
          transaction_count: 3,
        },
        {
          category_id: 3,
          category_name: 'Transportation',
          category_color: '#2196F3',
          spent_amount: 8000, // $80
          transaction_count: 2,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const { start, end } = getCurrentMonthPeriod();
      const result = await budgetCalculationService.getUnbudgetedSpending(start, end);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category_id: 2,
        category_name: 'Entertainment',
        category_color: '#9C27B0',
        spent_amount: 15000,
        transaction_count: 3,
      });
    });

    it('should return empty array when no unbudgeted spending', async () => {
      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue([]),
      } as any;

      const { start, end } = getCurrentMonthPeriod();
      const result = await budgetCalculationService.getUnbudgetedSpending(start, end);

      expect(result).toEqual([]);
    });
  });

  describe('getBudgetProgress', () => {
    it('should return specific budget progress', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 25000,
          transaction_count: 5,
        },
        {
          budget_id: 2,
          category_id: 2,
          budgeted_amount: 30000,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Entertainment',
          category_color: '#9C27B0',
          spent_amount: 15000,
          transaction_count: 3,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue(mockDbData),
      } as any;

      const result = await budgetCalculationService.getBudgetProgress(1);

      expect(result).toMatchObject({
        budget_id: 1,
        category_name: 'Dining',
        budgeted_amount: 50000,
        spent_amount: 25000,
      });
    });

    it('should return null for non-existent budget', async () => {
      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockResolvedValue([]),
      } as any;

      const result = await budgetCalculationService.getBudgetProgress(999);

      expect(result).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache budget progress results', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 25000,
          transaction_count: 5,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      const getAllAsyncMock = jest.fn().mockResolvedValue(mockDbData);
      mockDatabaseService['db'] = {
        getAllAsync: getAllAsyncMock,
      } as any;

      // Call twice
      await budgetCalculationService.calculateBudgetProgress();
      await budgetCalculationService.calculateBudgetProgress();

      // Database should only be called once due to caching
      expect(getAllAsyncMock).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockDbData = [
        {
          budget_id: 1,
          category_id: 1,
          budgeted_amount: 50000,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          category_name: 'Dining',
          category_color: '#FF5722',
          spent_amount: 25000,
          transaction_count: 5,
        },
      ];

      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      const getAllAsyncMock = jest.fn().mockResolvedValue(mockDbData);
      mockDatabaseService['db'] = {
        getAllAsync: getAllAsyncMock,
      } as any;

      // Call, clear cache, call again
      await budgetCalculationService.calculateBudgetProgress();
      budgetCalculationService.clearCache();
      await budgetCalculationService.calculateBudgetProgress();

      // Database should be called twice
      expect(getAllAsyncMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
      mockDatabaseService['db'] = {
        getAllAsync: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any;

      await expect(budgetCalculationService.calculateBudgetProgress()).rejects.toThrow('Database error');
    });

    it('should handle initialization errors', async () => {
      mockDatabaseService.initialize = jest.fn().mockRejectedValue(new Error('Init error'));

      await expect(budgetCalculationService.calculateBudgetProgress()).rejects.toThrow('Init error');
    });
  });
});