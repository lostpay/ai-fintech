import { useState, useCallback, useEffect } from 'react';
import { TransactionWithCategory } from '../types/Transaction';
import { DatabaseService } from '../services/DatabaseService';
import { formatCurrency } from '../utils/currency';

export interface DashboardData {
  totalSpentThisMonth: number;     // Sum of current month expenses in cents
  recentTransactions: TransactionWithCategory[]; // Last 5 transactions
  weeklySpending: number;          // Last 7 days spending in cents
  currentMonth: string;            // Formatted month name
  transactionCount: number;        // Total transactions this month
}

export interface DashboardStats {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  loadDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

export const useDashboardStats = (): DashboardStats => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const databaseService = DatabaseService.getInstance();

  const calculateDashboardMetrics = async (): Promise<DashboardData> => {
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all transactions for calculations
    const [monthlyTransactions, weeklyTransactions, recentTransactions] = await Promise.all([
      databaseService.getTransactions(undefined, 'expense', monthStart, currentDate),
      databaseService.getTransactions(undefined, 'expense', weekStart, currentDate),
      databaseService.getTransactionsWithCategories(undefined, undefined, undefined, undefined)
    ]);

    // Calculate monthly spending
    const totalSpentThisMonth = monthlyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Calculate weekly spending
    const weeklySpending = weeklyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Get last 5 transactions (all types)
    const recentTransactionsList = recentTransactions.slice(0, 5);

    // Format current month
    const currentMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(monthStart);

    return {
      totalSpentThisMonth,
      recentTransactions: recentTransactionsList,
      weeklySpending,
      currentMonth,
      transactionCount: monthlyTransactions.length,
    };
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize database if needed
      await databaseService.initialize();
      
      const data = await calculateDashboardMetrics();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const data = await calculateDashboardMetrics();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
    
    // Note: No cleanup needed for singleton database service
  }, [loadDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    refreshing,
    loadDashboard: loadDashboardData,
    refreshDashboard,
  };
};