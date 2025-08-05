import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTransactions } from '../../src/hooks/useTransactions';
import { DatabaseService } from '../../src/services/DatabaseService';

// Mock the DatabaseService
jest.mock('../../src/services/DatabaseService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

const mockTransactions = [
  {
    id: 1,
    amount: 2550, // $25.50 in cents
    description: 'Lunch',
    category_id: 1,
    transaction_type: 'expense' as const,
    date: new Date('2025-01-05'),
    created_at: new Date('2025-01-05T10:00:00Z'),
    updated_at: new Date('2025-01-05T10:00:00Z'),
  },
  {
    id: 2,
    amount: 5000, // $50.00 in cents
    description: 'Gas',
    category_id: 2,
    transaction_type: 'expense' as const,
    date: new Date('2025-01-04'),
    created_at: new Date('2025-01-04T15:30:00Z'),
    updated_at: new Date('2025-01-04T15:30:00Z'),
  },
];

describe('useTransactions', () => {
  let mockDatabaseInstance: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseInstance = {
      initialize: jest.fn(),
      getTransactions: jest.fn(),
      createTransaction: jest.fn(),
      updateTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
      close: jest.fn(),
    } as any;

    MockedDatabaseService.mockImplementation(() => mockDatabaseInstance);
  });

  it('initializes with empty state', () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useTransactions());

    expect(result.current.loading).toBe(false); // Note: transactions hook starts with loading: false
    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('loads transactions successfully', async () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useTransactions());

    // Hook loads transactions on mount
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toEqual(mockTransactions);
    expect(result.current.error).toBe(null);
    expect(mockDatabaseInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockDatabaseInstance.getTransactions).toHaveBeenCalledTimes(1);
  });

  it('handles loading error', async () => {
    const errorMessage = 'Failed to load transactions';
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('refreshes transactions', async () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions
      .mockResolvedValueOnce(mockTransactions.slice(0, 1))
      .mockResolvedValueOnce(mockTransactions);

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1);
    });

    // Refresh transactions
    await act(async () => {
      await result.current.refreshTransactions();
    });

    expect(result.current.transactions).toHaveLength(2);
    expect(mockDatabaseInstance.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('adds a new transaction', async () => {
    const newTransactionData = {
      amount: 1500, // $15.00 in cents
      description: 'Coffee',
      category_id: 1,
      transaction_type: 'expense' as const,
      date: new Date('2025-01-06'),
    };

    const newTransaction = {
      id: 3,
      ...newTransactionData,
      created_at: new Date('2025-01-06T09:00:00Z'),
      updated_at: new Date('2025-01-06T09:00:00Z'),
    };

    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.createTransaction.mockResolvedValue(newTransaction);

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Add new transaction
    let addedTransaction: any;
    await act(async () => {
      addedTransaction = await result.current.addTransaction(newTransactionData);
    });

    expect(addedTransaction).toEqual(newTransaction);
    expect(result.current.transactions).toHaveLength(3);
    expect(result.current.transactions[0]).toEqual(newTransaction); // Should be first (newest)
    expect(mockDatabaseInstance.createTransaction).toHaveBeenCalledWith(newTransactionData);
  });

  it('handles add transaction error', async () => {
    const newTransactionData = {
      amount: 1500,
      description: 'Coffee',
      category_id: 1,
      transaction_type: 'expense' as const,
      date: new Date('2025-01-06'),
    };

    const errorMessage = 'Failed to create transaction';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.createTransaction.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Try to add transaction (should fail)
    await act(async () => {
      try {
        await result.current.addTransaction(newTransactionData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.transactions).toHaveLength(2); // Should remain unchanged
  });

  it('updates a transaction', async () => {
    const updateData = {
      amount: 3000, // Updated amount
      description: 'Updated lunch',
    };

    const updatedTransaction = {
      ...mockTransactions[0],
      ...updateData,
      updated_at: new Date('2025-01-06T12:00:00Z'),
    };

    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.updateTransaction.mockResolvedValue(updatedTransaction);

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Update transaction
    let updated: any;
    await act(async () => {
      updated = await result.current.updateTransaction(1, updateData);
    });

    expect(updated).toEqual(updatedTransaction);
    expect(result.current.transactions[0]).toEqual(updatedTransaction);
    expect(mockDatabaseInstance.updateTransaction).toHaveBeenCalledWith(1, updateData);
  });

  it('deletes a transaction', async () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.deleteTransaction.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Delete transaction
    await act(async () => {
      await result.current.deleteTransaction(1);
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions.find(t => t.id === 1)).toBeUndefined();
    expect(mockDatabaseInstance.deleteTransaction).toHaveBeenCalledWith(1);
  });

  it('filters transactions', async () => {
    const filteredTransactions = [mockTransactions[0]]; // Only first transaction
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions
      .mockResolvedValueOnce(mockTransactions) // Initial load
      .mockResolvedValueOnce(filteredTransactions); // Filtered results

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Filter transactions
    let filteredResults: any;
    await act(async () => {
      filteredResults = await result.current.getTransactionsByFilter(
        1, // category_id
        'expense',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
    });

    expect(filteredResults).toEqual(filteredTransactions);
    expect(mockDatabaseInstance.getTransactions).toHaveBeenCalledWith(
      1,
      'expense',
      new Date('2025-01-01'),
      new Date('2025-01-31')
    );
  });

  it('handles update error', async () => {
    const updateData = { amount: 3000 };
    const errorMessage = 'Failed to update transaction';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.updateTransaction.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Try to update transaction (should fail)
    await act(async () => {
      try {
        await result.current.updateTransaction(1, updateData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('handles delete error', async () => {
    const errorMessage = 'Failed to delete transaction';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions.mockResolvedValue(mockTransactions);
    mockDatabaseInstance.deleteTransaction.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTransactions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    // Try to delete transaction (should fail)
    await act(async () => {
      try {
        await result.current.deleteTransaction(1);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.transactions).toHaveLength(2); // Should remain unchanged
  });

  it('clears error on successful operations', async () => {
    const errorMessage = 'Initial error';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getTransactions
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockTransactions);

    const { result } = renderHook(() => useTransactions());

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    // Refresh should clear error
    await act(async () => {
      await result.current.refreshTransactions();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.transactions).toEqual(mockTransactions);
  });
});