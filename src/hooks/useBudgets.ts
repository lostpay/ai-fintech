import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import { Budget, CreateBudgetRequest } from '../types/Budget';

interface BudgetWithDetails {
  id: number;
  category_id: number;
  amount: number;
  period_start: Date;
  period_end: Date;
  created_at: Date;
  updated_at: Date;
  category_name: string;
  category_color: string;
  category_icon: string;
  spent_amount: number;
  percentage: number;
}

interface UseBudgetsReturn {
  budgets: BudgetWithDetails[];
  loading: boolean;
  error: string | null;
  createBudget: (budgetData: CreateBudgetRequest) => Promise<void>;
  updateBudget: (id: number, budgetData: Partial<CreateBudgetRequest>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  refreshBudgets: () => Promise<void>;
}

const databaseService = new DatabaseService();

export const useBudgets = (): UseBudgetsReturn => {
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeDatabase = useCallback(async () => {
    try {
      if (!databaseService['isInitialized']) {
        await databaseService.initialize();
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError('Failed to initialize database');
    }
  }, []);

  const loadBudgets = useCallback(async () => {
    try {
      await initializeDatabase();
      const budgetDetails = await databaseService.getBudgetsWithDetails();
      setBudgets(budgetDetails);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load budgets:', err);
      setError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [initializeDatabase]);

  const refreshBudgets = useCallback(async () => {
    setLoading(true);
    await loadBudgets();
  }, [loadBudgets]);

  const createBudget = useCallback(async (budgetData: CreateBudgetRequest) => {
    try {
      await initializeDatabase();
      
      // Check for existing budget in the same period
      const existingBudget = await databaseService.getBudgetForPeriod(
        budgetData.category_id,
        budgetData.period_start,
        budgetData.period_end
      );

      if (existingBudget) {
        throw new Error('A budget already exists for this category and period');
      }

      await databaseService.createBudget(budgetData);
      await loadBudgets(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to create budget:', err);
      
      // Handle unique constraint error
      if (err.message?.includes('UNIQUE constraint failed')) {
        throw new Error('A budget already exists for this category and period');
      }
      
      throw err;
    }
  }, [initializeDatabase, loadBudgets]);

  const updateBudget = useCallback(async (id: number, budgetData: Partial<CreateBudgetRequest>) => {
    try {
      await initializeDatabase();
      await databaseService.updateBudget(id, budgetData);
      await loadBudgets(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update budget:', err);
      
      // Handle unique constraint error
      if (err.message?.includes('UNIQUE constraint failed')) {
        throw new Error('A budget already exists for this category and period');
      }
      
      throw err;
    }
  }, [initializeDatabase, loadBudgets]);

  const deleteBudget = useCallback(async (id: number) => {
    try {
      await initializeDatabase();
      await databaseService.deleteBudget(id);
      await loadBudgets(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete budget:', err);
      throw err;
    }
  }, [initializeDatabase, loadBudgets]);

  // Load budgets on hook initialization
  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  return {
    budgets,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    refreshBudgets,
  };
};