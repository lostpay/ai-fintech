import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MonthlyBudgetPerformance,
  CategoryPerformance,
  SpendingTrend,
  BudgetSuccessMetrics,
  AnalyticsPeriod
} from '../types/BudgetAnalytics';
import { BudgetAnalyticsService } from '../services/BudgetAnalyticsService';
import { DatabaseService } from '../services/DatabaseService';
import { BudgetCalculationService } from '../services/BudgetCalculationService';
import { emitTransactionChanged, emitBudgetChanged } from '../utils/eventEmitter';

interface UseBudgetAnalyticsOptions {
  period?: '1m' | '3m' | '6m' | '1y';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseBudgetAnalyticsReturn {
  // Data
  monthlyPerformance: MonthlyBudgetPerformance[];
  categoryPerformance: CategoryPerformance[];
  successMetrics: BudgetSuccessMetrics | null;
  spendingTrends: SpendingTrend[];
  insights: string[];
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  refreshAnalytics: () => Promise<void>;
  changePeriod: (newPeriod: '1m' | '3m' | '6m' | '1y') => void;
  clearCache: () => void;
  
  // Computed
  currentPeriod: '1m' | '3m' | '6m' | '1y';
  periodLabel: string;
  isEmpty: boolean;
}

// Singleton instances
const databaseService = DatabaseService.getInstance();
const budgetCalculationService = new BudgetCalculationService(databaseService);
const budgetAnalyticsService = new BudgetAnalyticsService(databaseService, budgetCalculationService);

export const useBudgetAnalytics = (
  options: UseBudgetAnalyticsOptions = {}
): UseBudgetAnalyticsReturn => {
  const {
    period = '6m',
    autoRefresh = true,
    refreshInterval = 300000 // 5 minutes
  } = options;

  // State
  const [currentPeriod, setCurrentPeriod] = useState<'1m' | '3m' | '6m' | '1y'>(period);
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyBudgetPerformance[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [successMetrics, setSuccessMetrics] = useState<BudgetSuccessMetrics | null>(null);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Computed values
  const periodLabel = useMemo(() => {
    const labels: Record<string, string> = {
      '1m': 'Last Month',
      '3m': 'Last 3 Months',
      '6m': 'Last 6 Months',
      '1y': 'Last Year'
    };
    return labels[currentPeriod] || 'Last 6 Months';
  }, [currentPeriod]);

  const isEmpty = useMemo(() => {
    return monthlyPerformance.length === 0 && 
           categoryPerformance.length === 0 && 
           !successMetrics;
  }, [monthlyPerformance, categoryPerformance, successMetrics]);

  // Helper function to get date range for period
  const getDateRange = useCallback((periodValue: string) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (periodValue) {
      case '1m':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    return { startDate, endDate };
  }, []);

  // Main analytics loading function with retry logic
  const loadAnalytics = useCallback(async (showLoading = true, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Ensure database is initialized before proceeding
      await databaseService.initialize();
      
      const { startDate, endDate } = getDateRange(currentPeriod);
      const periodMonths = currentPeriod === '1y' ? 12 : parseInt(currentPeriod);
      
      // Load analytics data with sequential loading to prevent database connection conflicts
      console.log(`Loading analytics for period: ${currentPeriod}`);
      
      const monthlyData = await budgetAnalyticsService.calculateMonthlyBudgetPerformance(startDate, endDate);
      const categoryData = await budgetAnalyticsService.getCategoryPerformanceAnalysis(periodMonths);
      const metricsData = await budgetAnalyticsService.getBudgetSuccessMetrics(periodMonths);
      const trendsData = await budgetAnalyticsService.calculateSpendingTrends(undefined, periodMonths);
      
      // Generate insights based on monthly performance
      const insightsData = await budgetAnalyticsService.generateInsights(monthlyData);
      
      // Update state
      setMonthlyPerformance(monthlyData);
      setCategoryPerformance(categoryData);
      setSuccessMetrics(metricsData);
      setSpendingTrends(trendsData);
      setInsights(insightsData);
      setLastUpdated(new Date());
      
      console.log('Analytics loaded successfully');
      
    } catch (err) {
      console.error('Failed to load budget analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      
      // Retry logic for database connection issues
      if (retryCount < maxRetries && errorMessage.includes('Database')) {
        console.log(`Retrying analytics load after error... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          loadAnalytics(showLoading, retryCount + 1);
        }, retryDelay);
        return;
      }
      
      setError(errorMessage);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [currentPeriod, getDateRange]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(async () => {
    await loadAnalytics(true);
  }, [loadAnalytics]);

  // Change analysis period with debouncing
  const changePeriod = useCallback((newPeriod: '1m' | '3m' | '6m' | '1y') => {
    if (newPeriod !== currentPeriod) {
      // Clear any existing analytics cache when period changes
      budgetAnalyticsService.clearCache();
      setCurrentPeriod(newPeriod);
      setError(null); // Clear any existing errors
    }
  }, [currentPeriod]);

  // Clear analytics cache
  const clearCache = useCallback(() => {
    budgetAnalyticsService.clearCache();
    budgetCalculationService.clearCache();
  }, []);

  // Load analytics on mount and period change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAnalytics(true, 0); // Reset retry count on period change
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentPeriod, getDateRange]); // Include getDateRange for completeness

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadAnalytics(false); // Refresh without showing loading
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, loadAnalytics]);

  // Listen to data changes
  useEffect(() => {
    const handleDataChange = () => {
      // Debounced refresh to prevent excessive recalculations
      const timeoutId = setTimeout(() => {
        loadAnalytics(false);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    };

    // Listen for transaction and budget changes
    const unsubscribeTransaction = () => {
      // In a real implementation, you'd add event listeners here
      // For now, we'll implement a simple polling mechanism
    };
    
    const unsubscribeBudget = () => {
      // In a real implementation, you'd add event listeners here
    };

    return () => {
      unsubscribeTransaction();
      unsubscribeBudget();
    };
  }, [loadAnalytics]);

  // Handle errors with retry mechanism
  useEffect(() => {
    if (error) {
      const retryTimeout = setTimeout(() => {
        console.log('Retrying analytics load after error...');
        loadAnalytics(true);
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(retryTimeout);
    }
  }, [error, loadAnalytics]);

  return {
    // Data
    monthlyPerformance,
    categoryPerformance,
    successMetrics,
    spendingTrends,
    insights,
    
    // State
    loading,
    error,
    lastUpdated,
    
    // Actions
    refreshAnalytics,
    changePeriod,
    clearCache,
    
    // Computed
    currentPeriod,
    periodLabel,
    isEmpty,
  };
};

// Helper hook for period options
export const useBudgetAnalyticsPeriods = (): AnalyticsPeriod[] => {
  return useMemo(() => [
    { label: '1 Month', value: '1m', months: 1 },
    { label: '3 Months', value: '3m', months: 3 },
    { label: '6 Months', value: '6m', months: 6 },
    { label: '1 Year', value: '1y', months: 12 },
  ], []);
};

// Hook for specific category analytics
export const useCategoryAnalytics = (categoryId: number, period: '1m' | '3m' | '6m' | '1y' = '6m') => {
  const [trends, setTrends] = useState<SpendingTrend[]>([]);
  const [performance, setPerformance] = useState<CategoryPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategoryAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const periodMonths = period === '1y' ? 12 : parseInt(period);
      
      const [categoryTrends, allCategoryPerformance] = await Promise.all([
        budgetAnalyticsService.calculateSpendingTrends(categoryId, periodMonths),
        budgetAnalyticsService.getCategoryPerformanceAnalysis(periodMonths),
      ]);

      const categoryPerformance = allCategoryPerformance.find(cp => cp.category_id === categoryId);

      setTrends(categoryTrends);
      setPerformance(categoryPerformance || null);
    } catch (err) {
      console.error('Failed to load category analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load category analytics');
    } finally {
      setLoading(false);
    }
  }, [categoryId, period]);

  useEffect(() => {
    loadCategoryAnalytics();
  }, [loadCategoryAnalytics]);

  return {
    trends,
    performance,
    loading,
    error,
    refresh: loadCategoryAnalytics,
  };
};

export default useBudgetAnalytics;