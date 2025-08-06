import { useState, useEffect, useCallback, useMemo } from 'react';
import { BudgetProgress, UnbudgetedSpending } from '../types/Budget';
import { BudgetCalculationService } from '../services/BudgetCalculationService';
import { databaseService } from '../services';
import { 
  onTransactionChanged, 
  onBudgetChanged, 
  offTransactionChanged, 
  offBudgetChanged,
  TransactionChangedData,
  BudgetChangedData
} from '../utils/eventEmitter';

interface UseBudgetProgressReturn {
  budgetProgress: BudgetProgress[];
  unbudgetedSpending: UnbudgetedSpending[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshBudgetProgress: () => Promise<void>;
  clearCache: () => void;
}

export const useBudgetProgress = (): UseBudgetProgressReturn => {
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [unbudgetedSpending, setUnbudgetedSpending] = useState<UnbudgetedSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Create service instance (memoized to avoid recreation)
  const budgetCalculationService = useMemo(
    () => new BudgetCalculationService(databaseService),
    []
  );

  // Main function to refresh budget progress
  const refreshBudgetProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current month date range
      const dateRange = budgetCalculationService.getCurrentMonthDateRange();
      
      // Load budget progress and unbudgeted spending in parallel
      const [progress, unbudgeted] = await Promise.all([
        budgetCalculationService.getCurrentMonthBudgetProgress(),
        budgetCalculationService.getUnbudgetedSpending(dateRange.start, dateRange.end),
      ]);
      
      setBudgetProgress(progress);
      setUnbudgetedSpending(unbudgeted);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load budget progress';
      console.error('Failed to refresh budget progress:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [budgetCalculationService]);

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(refreshBudgetProgress, 500);
    };
  }, [refreshBudgetProgress]);

  // Handle transaction changes
  const handleTransactionChanged = useCallback((data: TransactionChangedData) => {
    console.log('Transaction changed, refreshing budget progress:', data);
    // Clear transaction-related cache
    budgetCalculationService.clearTransactionCache();
    // Debounced refresh to prevent excessive updates
    debouncedRefresh();
  }, [budgetCalculationService, debouncedRefresh]);

  // Handle budget changes
  const handleBudgetChanged = useCallback((data: BudgetChangedData) => {
    console.log('Budget changed, refreshing budget progress:', data);
    // Clear all cache when budgets change
    budgetCalculationService.clearCache();
    // Immediate refresh for budget changes
    refreshBudgetProgress();
  }, [budgetCalculationService, refreshBudgetProgress]);

  // Clear cache function
  const clearCache = useCallback(() => {
    budgetCalculationService.clearCache();
  }, [budgetCalculationService]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    onTransactionChanged(handleTransactionChanged);
    onBudgetChanged(handleBudgetChanged);

    // Cleanup event listeners
    return () => {
      offTransactionChanged(handleTransactionChanged);
      offBudgetChanged(handleBudgetChanged);
    };
  }, [handleTransactionChanged, handleBudgetChanged]);

  // Initial load
  useEffect(() => {
    refreshBudgetProgress();
  }, [refreshBudgetProgress]);

  // Auto-refresh every 5 minutes when component is active
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh if we're not currently loading and no error
      if (!loading && !error) {
        refreshBudgetProgress();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [loading, error, refreshBudgetProgress]);

  return {
    budgetProgress,
    unbudgetedSpending,
    loading,
    error,
    lastUpdated,
    refreshBudgetProgress,
    clearCache,
  };
};

// Hook for specific budget progress
interface UseSpecificBudgetProgressReturn {
  budgetProgress: BudgetProgress | null;
  loading: boolean;
  error: string | null;
  refreshBudgetProgress: () => Promise<void>;
}

export const useSpecificBudgetProgress = (budgetId: number): UseSpecificBudgetProgressReturn => {
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const budgetCalculationService = useMemo(
    () => new BudgetCalculationService(databaseService),
    []
  );

  const refreshBudgetProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const progress = await budgetCalculationService.getBudgetProgress(budgetId);
      setBudgetProgress(progress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load budget progress';
      console.error('Failed to refresh specific budget progress:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [budgetCalculationService, budgetId]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    const handleChange = () => {
      budgetCalculationService.clearCache();
      refreshBudgetProgress();
    };

    onTransactionChanged(handleChange);
    onBudgetChanged(handleChange);

    return () => {
      offTransactionChanged(handleChange);
      offBudgetChanged(handleChange);
    };
  }, [budgetCalculationService, refreshBudgetProgress]);

  // Initial load
  useEffect(() => {
    refreshBudgetProgress();
  }, [refreshBudgetProgress]);

  return {
    budgetProgress,
    loading,
    error,
    refreshBudgetProgress,
  };
};