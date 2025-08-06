import { BudgetAnalyticsService } from '../../src/services/BudgetAnalyticsService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { BudgetCalculationService } from '../../src/services/BudgetCalculationService';

// Mock dependencies
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/BudgetCalculationService');

describe('BudgetAnalyticsService', () => {
  let budgetAnalyticsService: BudgetAnalyticsService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockBudgetCalculationService: jest.Mocked<BudgetCalculationService>;

  beforeEach(() => {
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockBudgetCalculationService = new BudgetCalculationService(mockDatabaseService) as jest.Mocked<BudgetCalculationService>;
    budgetAnalyticsService = new BudgetAnalyticsService(mockDatabaseService, mockBudgetCalculationService);

    // Setup common mocks
    mockDatabaseService.initialize = jest.fn().mockResolvedValue(undefined);
    mockDatabaseService['db'] = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMonthlyBudgetPerformance', () => {
    it('should calculate monthly budget performance correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');
      
      // Mock database responses
      const mockBudgets = [
        {
          id: 1,
          category_id: 1,
          amount: 50000, // $500 in cents
          category_name: 'Groceries',
          category_color: '#4CAF50',
          category_icon: 'shopping-cart',
        }
      ];

      const mockSpentResult = { spent_amount: 45000 }; // $450 in cents

      mockDatabaseService['db']!.getAllAsync = jest.fn()
        .mockResolvedValue(mockBudgets);
      mockDatabaseService['db']!.getFirstAsync = jest.fn()
        .mockResolvedValue(mockSpentResult);

      const result = await budgetAnalyticsService.calculateMonthlyBudgetPerformance(startDate, endDate);

      expect(result).toHaveLength(3); // 3 months
      expect(result[0]).toMatchObject({
        month: '2024-01',
        total_budgeted: 50000,
        total_spent: 45000,
        budget_utilization: 90,
        budgets_met: 1,
        total_budgets: 1,
        success_rate: 100,
        categories: expect.arrayContaining([
          expect.objectContaining({
            category_id: 1,
            category_name: 'Groceries',
            budgeted_amount: 50000,
            spent_amount: 45000,
            utilization_percentage: 90,
            status: 'under',
          })
        ])
      });
    });

    it('should handle empty budget data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDatabaseService['db']!.getAllAsync = jest.fn().mockResolvedValue([]);

      const result = await budgetAnalyticsService.calculateMonthlyBudgetPerformance(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        month: '2024-01',
        total_budgeted: 0,
        total_spent: 0,
        budget_utilization: 0,
        budgets_met: 0,
        total_budgets: 0,
        success_rate: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDatabaseService['db']!.getAllAsync = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        budgetAnalyticsService.calculateMonthlyBudgetPerformance(startDate, endDate)
      ).rejects.toThrow('Database error');
    });
  });

  describe('calculateSpendingTrends', () => {
    it('should calculate overall spending trends', async () => {
      const mockSpendingData = [
        { total: 100000 }, // $1000
        { total: 120000 }, // $1200
        { total: 110000 }, // $1100
      ];

      mockDatabaseService['db']!.getFirstAsync = jest.fn()
        .mockResolvedValueOnce(mockSpendingData[0])
        .mockResolvedValueOnce(mockSpendingData[1])
        .mockResolvedValueOnce(mockSpendingData[2]);

      const result = await budgetAnalyticsService.calculateSpendingTrends(undefined, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        amount: 100000,
        change_from_previous: 0,
        change_percentage: 0,
        trend_direction: 'stable',
      });
      expect(result[1]).toMatchObject({
        amount: 120000,
        change_from_previous: 20000,
        change_percentage: 20,
        trend_direction: 'up',
      });
      expect(result[2]).toMatchObject({
        amount: 110000,
        change_from_previous: -10000,
        change_percentage: expect.any(Number),
        trend_direction: 'down',
      });
    });

    it('should calculate category-specific spending trends', async () => {
      const categoryId = 1;
      const mockSpendingData = [
        { total: 50000 }, // $500
        { total: 55000 }, // $550
      ];

      mockDatabaseService['db']!.getFirstAsync = jest.fn()
        .mockResolvedValueOnce(mockSpendingData[0])
        .mockResolvedValueOnce(mockSpendingData[1]);

      const result = await budgetAnalyticsService.calculateSpendingTrends(categoryId, 2);

      expect(result).toHaveLength(2);
      expect(mockDatabaseService['db']!.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('category_id = ?'),
        expect.arrayContaining([categoryId])
      );
    });
  });

  describe('getBudgetSuccessMetrics', () => {
    it('should calculate success metrics correctly', async () => {
      // Mock the calculateMonthlyBudgetPerformance method
      const mockMonthlyPerformance = [
        {
          month: '2024-01',
          success_rate: 80,
          total_budgets: 5,
          budgets_met: 4,
          total_budgeted: 100000,
          total_spent: 95000,
          categories: [],
        },
        {
          month: '2024-02',
          success_rate: 60,
          total_budgets: 5,
          budgets_met: 3,
          total_budgeted: 100000,
          total_spent: 105000,
          categories: [],
        },
      ];

      const mockCategoryPerformance = [
        {
          category_id: 1,
          category_name: 'Groceries',
          utilization_percentage: 75,
          status: 'under' as const,
        },
        {
          category_id: 2,
          category_name: 'Entertainment',
          utilization_percentage: 120,
          status: 'over' as const,
        },
      ];

      jest.spyOn(budgetAnalyticsService, 'calculateMonthlyBudgetPerformance')
        .mockResolvedValue(mockMonthlyPerformance as any);
      jest.spyOn(budgetAnalyticsService, 'getCategoryPerformanceAnalysis')
        .mockResolvedValue(mockCategoryPerformance as any);

      const result = await budgetAnalyticsService.getBudgetSuccessMetrics(12);

      expect(result.overall_success_rate).toBeCloseTo(70); // (4+3)/(5+5) * 100
      expect(result.most_successful_category).toMatchObject({
        category_name: 'Groceries',
        status: 'under',
      });
      expect(result.most_challenging_category).toMatchObject({
        category_name: 'Entertainment',
        status: 'over',
      });
    });
  });

  describe('generateInsights', () => {
    it('should generate relevant insights based on performance data', async () => {
      const mockPerformance = [
        {
          month: '2024-01',
          success_rate: 60,
          budget_utilization: 110,
          categories: [
            {
              category_name: 'Entertainment',
              status: 'over' as const,
              utilization_percentage: 150,
            }
          ],
        },
        {
          month: '2024-02',
          success_rate: 80,
          budget_utilization: 95,
          categories: [
            {
              category_name: 'Groceries',
              status: 'under' as const,
              consistency_score: 0.9,
            }
          ],
        },
      ];

      const insights = await budgetAnalyticsService.generateInsights(mockPerformance as any);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(insight => 
        insight.includes('improvement') || insight.includes('increased')
      )).toBe(true);
    });

    it('should return empty insights for insufficient data', async () => {
      const mockPerformance = [{
        month: '2024-01',
        success_rate: 80,
        categories: [],
      }];

      const insights = await budgetAnalyticsService.generateInsights(mockPerformance as any);

      expect(insights).toEqual([]);
    });
  });

  describe('getCategoryPerformanceAnalysis', () => {
    it('should aggregate category performance across months', async () => {
      const mockMonthlyPerformance = [
        {
          categories: [
            {
              category_id: 1,
              category_name: 'Groceries',
              budgeted_amount: 50000,
              spent_amount: 45000,
            }
          ]
        },
        {
          categories: [
            {
              category_id: 1,
              category_name: 'Groceries',
              budgeted_amount: 50000,
              spent_amount: 55000,
            }
          ]
        }
      ];

      jest.spyOn(budgetAnalyticsService, 'calculateMonthlyBudgetPerformance')
        .mockResolvedValue(mockMonthlyPerformance as any);

      const result = await budgetAnalyticsService.getCategoryPerformanceAnalysis(6);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        category_id: 1,
        category_name: 'Groceries',
        budgeted_amount: 100000, // Aggregated
        spent_amount: 100000, // Aggregated
        utilization_percentage: 100,
        status: 'on_track',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the internal cache', () => {
      // Add some data to cache first (by calling a method)
      budgetAnalyticsService.clearCache();
      
      // Cache should be cleared (we can't directly test this, but ensure no errors)
      expect(() => budgetAnalyticsService.clearCache()).not.toThrow();
    });
  });
});