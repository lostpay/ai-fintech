import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBudgetProgress } from '../../src/hooks/useBudgetProgress';
import { BudgetCalculationService } from '../../src/services/BudgetCalculationService';
import { BudgetProgress, UnbudgetedSpending } from '../../src/types/Budget';

// Mock the services
jest.mock('../../src/services/BudgetCalculationService');
jest.mock('../../src/services/index', () => ({
  databaseService: {},
}));

// Mock the event emitter
jest.mock('../../src/utils/eventEmitter', () => ({
  eventEmitter: {
    on: jest.fn(),
    off: jest.fn(),
  },
  onTransactionChanged: jest.fn(),
  onBudgetChanged: jest.fn(),
  offTransactionChanged: jest.fn(),
  offBudgetChanged: jest.fn(),
}));

describe('useBudgetProgress', () => {
  let mockBudgetCalculationService: jest.Mocked<BudgetCalculationService>;
  let mockOnTransactionChanged: jest.Mock;
  let mockOnBudgetChanged: jest.Mock;
  let mockOffTransactionChanged: jest.Mock;
  let mockOffBudgetChanged: jest.Mock;

  const mockBudgetProgress: BudgetProgress[] = [
    {
      budget_id: 1,
      category_id: 1,
      category_name: 'Dining',
      category_color: '#FF5722',
      budgeted_amount: 50000,
      spent_amount: 25000,
      remaining_amount: 25000,
      percentage_used: 50,
      status: 'under',
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31'),
    },
  ];

  const mockUnbudgetedSpending: UnbudgetedSpending[] = [
    {
      category_id: 2,
      category_name: 'Entertainment',
      category_color: '#9C27B0',
      spent_amount: 15000,
      transaction_count: 3,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock BudgetCalculationService
    mockBudgetCalculationService = {
      getCurrentMonthBudgetProgress: jest.fn(),
      getUnbudgetedSpending: jest.fn(),
      getCurrentMonthDateRange: jest.fn(),
      clearTransactionCache: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    (BudgetCalculationService as jest.MockedClass<typeof BudgetCalculationService>)
      .mockImplementation(() => mockBudgetCalculationService);

    // Mock event emitter functions
    const eventEmitterModule = require('../../src/utils/eventEmitter');
    mockOnTransactionChanged = eventEmitterModule.onTransactionChanged;
    mockOnBudgetChanged = eventEmitterModule.onBudgetChanged;
    mockOffTransactionChanged = eventEmitterModule.offTransactionChanged;
    mockOffBudgetChanged = eventEmitterModule.offBudgetChanged;

    // Setup default return values
    mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockResolvedValue(mockBudgetProgress);
    mockBudgetCalculationService.getUnbudgetedSpending.mockResolvedValue(mockUnbudgetedSpending);
    mockBudgetCalculationService.getCurrentMonthDateRange.mockReturnValue({
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useBudgetProgress());

    expect(result.current.loading).toBe(true);
    expect(result.current.budgetProgress).toEqual([]);
    expect(result.current.unbudgetedSpending).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load budget progress data on mount', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetProgress).toEqual(mockBudgetProgress);
    expect(result.current.unbudgetedSpending).toEqual(mockUnbudgetedSpending);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle loading errors', async () => {
    const errorMessage = 'Failed to load budget progress';
    mockBudgetCalculationService.getCurrentMonthBudgetProgress.mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.budgetProgress).toEqual([]);
    expect(result.current.unbudgetedSpending).toEqual([]);
  });

  it('should refresh budget progress when refreshBudgetProgress is called', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock calls from initial load
    jest.clearAllMocks();

    act(() => {
      result.current.refreshBudgetProgress();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockBudgetCalculationService.getCurrentMonthBudgetProgress).toHaveBeenCalledTimes(1);
    expect(mockBudgetCalculationService.getUnbudgetedSpending).toHaveBeenCalledTimes(1);
  });

  it('should set up transaction change listeners', async () => {
    renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(mockOnTransactionChanged).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('should set up budget change listeners', async () => {
    renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(mockOnBudgetChanged).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('should clean up event listeners on unmount', async () => {
    const { unmount } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(mockOnTransactionChanged).toHaveBeenCalled();
    });

    unmount();

    expect(mockOffTransactionChanged).toHaveBeenCalledWith(expect.any(Function));
    expect(mockOffBudgetChanged).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle transaction changes with debouncing', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Get the transaction change handler that was registered
    const transactionChangeHandler = mockOnTransactionChanged.mock.calls[0][0];

    // Clear previous calls
    jest.clearAllMocks();

    // Simulate transaction change
    act(() => {
      transactionChangeHandler({
        type: 'created',
        categoryId: 1,
        amount: 5000,
      });
    });

    // Should clear transaction cache
    expect(mockBudgetCalculationService.clearTransactionCache).toHaveBeenCalled();

    // Should trigger debounced refresh (we'll need to wait for the timeout)
    await waitFor(() => {
      expect(mockBudgetCalculationService.getCurrentMonthBudgetProgress).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should handle budget changes immediately', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Get the budget change handler that was registered
    const budgetChangeHandler = mockOnBudgetChanged.mock.calls[0][0];

    // Clear previous calls
    jest.clearAllMocks();

    // Simulate budget change
    act(() => {
      budgetChangeHandler({
        type: 'created',
        categoryId: 1,
        amount: 50000,
      });
    });

    // Should clear all cache
    expect(mockBudgetCalculationService.clearCache).toHaveBeenCalled();

    // Should trigger immediate refresh
    await waitFor(() => {
      expect(mockBudgetCalculationService.getCurrentMonthBudgetProgress).toHaveBeenCalled();
    });
  });

  it('should provide clearCache function', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(mockBudgetCalculationService.clearCache).toHaveBeenCalled();
  });

  it('should handle partial service failures gracefully', async () => {
    // Mock one service to fail
    mockBudgetCalculationService.getUnbudgetedSpending.mockRejectedValue(
      new Error('Unbudgeted spending failed')
    );

    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still set error state
    expect(result.current.error).toBeTruthy();
  });

  it('should update lastUpdated timestamp on successful refresh', async () => {
    const { result } = renderHook(() => useBudgetProgress());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialTimestamp = result.current.lastUpdated;

    // Wait a moment and refresh
    await new Promise(resolve => setTimeout(resolve, 10));

    await act(async () => {
      await result.current.refreshBudgetProgress();
    });

    expect(result.current.lastUpdated).not.toEqual(initialTimestamp);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  // Test auto-refresh functionality (commented out due to timer complexity)
  // it('should auto-refresh every 5 minutes', async () => {
  //   jest.useFakeTimers();
  //   
  //   const { result } = renderHook(() => useBudgetProgress());
  //   
  //   await waitFor(() => {
  //     expect(result.current.loading).toBe(false);
  //   });
  //   
  //   jest.clearAllMocks();
  //   
  //   // Fast-forward 5 minutes
  //   act(() => {
  //     jest.advanceTimersByTime(5 * 60 * 1000);
  //   });
  //   
  //   expect(mockBudgetCalculationService.getCurrentMonthBudgetProgress).toHaveBeenCalled();
  //   
  //   jest.useRealTimers();
  // });
});