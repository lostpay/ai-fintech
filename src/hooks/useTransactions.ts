import { useState, useEffect, useCallback } from 'react';
import { Transaction, CreateTransactionRequest, UpdateTransactionRequest } from '../types/Transaction';
import { databaseService } from '../services';

interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshTransactions: () => Promise<void>;
  addTransaction: (transactionData: CreateTransactionRequest) => Promise<Transaction>;
  updateTransaction: (id: number, updateData: UpdateTransactionRequest) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;
  getTransactionsByFilter: (
    categoryId?: number,
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ) => Promise<Transaction[]>;
}

export const useTransactions = (): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const transactionsData = await databaseService.getTransactions();
      setTransactions(transactionsData);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  const addTransaction = useCallback(async (transactionData: CreateTransactionRequest): Promise<Transaction> => {
    try {
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const newTransaction = await databaseService.createTransaction(transactionData);
      
      // Update local state - add to beginning since we order by date DESC
      setTransactions(prev => [newTransaction, ...prev]);
      
      return newTransaction;
    } catch (err) {
      console.error('Error adding transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateTransaction = useCallback(async (id: number, updateData: UpdateTransactionRequest): Promise<Transaction> => {
    try {
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const updatedTransaction = await databaseService.updateTransaction(id, updateData);
      
      // Update local state
      setTransactions(prev => 
        prev.map(transaction => 
          transaction.id === id ? updatedTransaction : transaction
        )
      );
      
      return updatedTransaction;
    } catch (err) {
      console.error('Error updating transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteTransaction = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      await databaseService.deleteTransaction(id);
      
      // Update local state
      setTransactions(prev => prev.filter(transaction => transaction.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getTransactionsByFilter = useCallback(async (
    categoryId?: number,
    transactionType?: 'expense' | 'income',
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> => {
    try {
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const filteredTransactions = await databaseService.getTransactions(
        categoryId,
        transactionType,
        startDate,
        endDate
      );
      
      return filteredTransactions;
    } catch (err) {
      console.error('Error filtering transactions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter transactions';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    refreshTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsByFilter,
  };
};