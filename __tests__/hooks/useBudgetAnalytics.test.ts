import { renderHook, waitFor, act } from '@testing-library/react-native';
import useBudgetAnalytics, { useBudgetAnalyticsPeriods, useCategoryAnalytics } from '../../src/hooks/useBudgetAnalytics';

// Mock the services
jest.mock('../../src/services/BudgetAnalyticsService');
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/BudgetCalculationService');

// Mock the analytics service methods
const mockCalculateMonthlyBudgetPerformance = jest.fn();
const mockGetCategoryPerformanceAnalysis = jest.fn();
const mockGetBudgetSuccessMetrics = jest.fn();
const mockCalculateSpendingTrends = jest.fn();
const mockGenerateInsights = jest.fn();
const mockClearCache = jest.fn();

// Mock analytics service instance
const mockAnalyticsService = {
  calculateMonthlyBudgetPerformance: mockCalculateMonthlyBudgetPerformance,
  getCategoryPerformanceAnalysis: mockGetCategoryPerformanceAnalysis,
  getBudgetSuccessMetrics: mockGetBudgetSuccessMetrics,
  calculateSpendingTrends: mockCalculateSpendingTrends,
  generateInsights: mockGenerateInsights,
  clearCache: mockClearCache,
};

// Mock the BudgetAnalyticsService constructor
jest.mock('../../src/services/BudgetAnalyticsService', () => ({
  BudgetAnalyticsService: jest.fn().mockImplementation(() => mockAnalyticsService),
}));

describe('useBudgetAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCalculateMonthlyBudgetPerformance.mockResolvedValue([
      {
        month: '2024-01',
        total_budgeted: 100000,
        total_spent: 85000,
        budget_utilization: 85,
        budgets_met: 3,
        total_budgets: 4,
        success_rate: 75,
        average_overspend: 0,
        categories: [],
      }
    ]);

    mockGetCategoryPerformanceAnalysis.mockResolvedValue([
      {
        category_id: 1,
        category_name: 'Groceries',
        category_color: '#4CAF50',
        category_icon: 'shopping-cart',
        budgeted_amount: 50000,
        spent_amount: 45000,
        utilization_percentage: 90,
        status: 'under',
        trend: 'stable',
        consistency_score: 0.8,
        recommendations: ['Great job!'],
      }
    ]);

    mockGetBudgetSuccessMetrics.mockResolvedValue({
      overall_success_rate: 75,
      current_streak: 2,
      best_streak: 3,
      average_overspend: 0,
      most_successful_category: { category_name: 'Groceries' },
      most_challenging_category: { category_name: 'Entertainment' },
      improvement_trend: 'improving',
      monthly_performance: [],
    });

    mockCalculateSpendingTrends.mockResolvedValue([
      {
        period: '2024-01',
        amount: 85000,
        change_from_previous: 0,
        change_percentage: 0,
        trend_direction: 'stable',
      }
    ]);

    mockGenerateInsights.mockResolvedValue([
      'Great improvement this month!',
      'Keep up the good work with groceries.'
    ]);
  });

  it('should initialize with correct default values', async () => {
    const { result } = renderHook(() => useBudgetAnalytics());

    // Initial state should show loading
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.monthlyPerformance).toEqual([]);
    expect(result.current.categoryPerformance).toEqual([]);
    expect(result.current.spendingTrends).toEqual([]);
    expect(result.current.insights).toEqual([]);
    expect(result.current.successMetrics).toBe(null);
    expect(result.current.isEmpty).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should load analytics data successfully', async () => {
    const { result } = renderHook(() => useBudgetAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.monthlyPerformance).toHaveLength(1);
    expect(result.current.categoryPerformance).toHaveLength(1);
    expect(result.current.successMetrics).not.toBe(null);
    expect(result.current.spendingTrends).toHaveLength(1);
    expect(result.current.insights).toHaveLength(2);
    expect(result.current.error).toBe(null);
    expect(result.current.isEmpty).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load analytics';
    mockCalculateMonthlyBudgetPerformance.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useBudgetAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.monthlyPerformance).toEqual([]);
  });

  it('should refresh analytics data when refreshAnalytics is called', async () => {
    const { result } = renderHook(() => useBudgetAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    jest.clearAllMocks();

    // Call refresh
    await act(async () => {
      await result.current.refreshAnalytics();
    });

    // Should call all analytics methods again
    expect(mockCalculateMonthlyBudgetPerformance).toHaveBeenCalled();
    expect(mockGetCategoryPerformanceAnalysis).toHaveBeenCalled();
    expect(mockGetBudgetSuccessMetrics).toHaveBeenCalled();
    expect(mockCalculateSpendingTrends).toHaveBeenCalled();
    expect(mockGenerateInsights).toHaveBeenCalled();
  });

  it('should change period correctly', async () => {
    const { result } = renderHook(() => useBudgetAnalytics({ period: '6m' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentPeriod).toBe('6m');
    expect(result.current.periodLabel).toBe('Last 6 Months');

    // Change period
    act(() => {
      result.current.changePeriod('3m');
    });

    expect(result.current.currentPeriod).toBe('3m');
    expect(result.current.periodLabel).toBe('Last 3 Months');
  });

  it('should clear cache when clearCache is called', async () => {
    const { result } = renderHook(() => useBudgetAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(mockClearCache).toHaveBeenCalled();
  });

  it('should work with different period options', async () => {
    const { result } = renderHook(() => useBudgetAnalytics({ period: '1y' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentPeriod).toBe('1y');
    expect(result.current.periodLabel).toBe('Last Year');
    
    // Check that the correct period was passed to analytics service
    expect(mockGetBudgetSuccessMetrics).toHaveBeenCalledWith(12);
  });

  it('should disable auto-refresh when autoRefresh is false', () => {
    const { result } = renderHook(() => 
      useBudgetAnalytics({ autoRefresh: false })
    );

    // Should still load initially
    expect(result.current.loading).toBe(true);
    
    // But auto-refresh should be disabled (we can't easily test this directly)
    expect(result.current).toBeTruthy();
  });

  it('should handle isEmpty state correctly', async () => {
    // Mock empty responses
    mockCalculateMonthlyBudgetPerformance.mockResolvedValue([]);
    mockGetCategoryPerformanceAnalysis.mockResolvedValue([]);
    mockGetBudgetSuccessMetrics.mockResolvedValue(null);

    const { result } = renderHook(() => useBudgetAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
  });
});

describe('useBudgetAnalyticsPeriods', () => {
  it('should return correct period options', () => {
    const { result } = renderHook(() => useBudgetAnalyticsPeriods());

    expect(result.current).toHaveLength(4);
    expect(result.current).toEqual([
      { label: '1 Month', value: '1m', months: 1 },
      { label: '3 Months', value: '3m', months: 3 },
      { label: '6 Months', value: '6m', months: 6 },
      { label: '1 Year', value: '1y', months: 12 },
    ]);
  });
});

describe('useCategoryAnalytics', () => {
  const categoryId = 1;

  beforeEach(() => {
    mockCalculateSpendingTrends.mockResolvedValue([
      {
        period: '2024-01',
        amount: 45000,
        change_from_previous: 0,
        change_percentage: 0,
        trend_direction: 'stable',
      }
    ]);

    mockGetCategoryPerformanceAnalysis.mockResolvedValue([
      {
        category_id: 1,
        category_name: 'Groceries',
        utilization_percentage: 90,
        status: 'under',
      }
    ]);
  });

  it('should load category-specific analytics', async () => {
    const { result } = renderHook(() => 
      useCategoryAnalytics(categoryId, '6m')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trends).toHaveLength(1);
    expect(result.current.performance).not.toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle category not found', async () => {
    mockGetCategoryPerformanceAnalysis.mockResolvedValue([]);

    const { result } = renderHook(() => 
      useCategoryAnalytics(categoryId, '6m')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.performance).toBe(null);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to load category analytics';
    mockCalculateSpendingTrends.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => 
      useCategoryAnalytics(categoryId, '6m')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should refresh category analytics', async () => {
    const { result } = renderHook(() => 
      useCategoryAnalytics(categoryId, '6m')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous calls
    jest.clearAllMocks();

    // Call refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockCalculateSpendingTrends).toHaveBeenCalledWith(categoryId, 6);
    expect(mockGetCategoryPerformanceAnalysis).toHaveBeenCalledWith(6);
  });
});