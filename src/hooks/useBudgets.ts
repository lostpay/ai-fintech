import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabaseService } from './useDatabaseService';
import { BudgetRolloverService } from '../services/BudgetRolloverService';
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
  rolloverBudgets: () => Promise<number>;
}

export const useBudgets = (): UseBudgetsReturn => {
  const databaseService = useDatabaseService();
  const rolloverService = new BudgetRolloverService(databaseService);
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rolloverChecked = useRef(false);

  const initializeDatabase = useCallback(async () => {
    try {
      if (!databaseService['isInitialized']) {
        await databaseService.initialize();
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError('Failed to initialize database');
    }
  }, [databaseService]);

  const rolloverBudgets = useCallback(async (): Promise<number> => {
    try {
      await initializeDatabase();
      const count = await rolloverService.checkAndRolloverBudgets();
      return count;
    } catch (err: any) {
      console.error('Failed to rollover budgets:', err);
      throw err;
    }
  }, [initializeDatabase]);

  const loadBudgets = useCallback(async () => {
    try {
      await initializeDatabase();

      // Check and rollover budgets automatically on first load
      if (!rolloverChecked.current) {
        try {
          const rolledOverCount = await rolloverService.checkAndRolloverBudgets();
          if (rolledOverCount > 0) {
            console.log(`Auto-rolled over ${rolledOverCount} budgets to current month`);
          }
          rolloverChecked.current = true;
        } catch (rolloverErr) {
          console.error('Failed to auto-rollover budgets:', rolloverErr);
          // Continue loading budgets even if rollover fails
        }
      }

      const budgetDetails = await databaseService.getBudgetsWithDetails();
      setBudgets(budgetDetails);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load budgets:', err);
      setError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [initializeDatabase, rolloverService, databaseService]);

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
  }, [initializeDatabase, loadBudgets, databaseService]);

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
  }, [initializeDatabase, loadBudgets, databaseService]);

  const deleteBudget = useCallback(async (id: number) => {
    try {
      await initializeDatabase();
      await databaseService.deleteBudget(id);
      await loadBudgets(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete budget:', err);
      throw err;
    }
  }, [initializeDatabase, loadBudgets, databaseService]);

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
    rolloverBudgets,
  };
};