import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBudgetAlerts } from '../../src/hooks/useBudgetAlerts';
import { BudgetAlertService } from '../../src/services/BudgetAlertService';
import { eventEmitter } from '../../src/utils/eventEmitter';
import { BudgetAlert } from '../../src/types/BudgetAlert';

// Mock the services and utilities
jest.mock('../../src/services/BudgetAlertService');
jest.mock('../../src/services/DatabaseService');
jest.mock('../../src/services/BudgetCalculationService');
jest.mock('../../src/utils/eventEmitter');

const MockedBudgetAlertService = BudgetAlertService as jest.MockedClass<typeof BudgetAlertService>;
const mockEventEmitter = eventEmitter as jest.Mocked<typeof eventEmitter>;

describe('useBudgetAlerts', () => {
  const mockAlerts: BudgetAlert[] = [
    {
      id: 'alert-1',
      budget_id: 1,
      category_name: 'Dining',
      category_color: '#FF9800',
      alert_type: 'approaching',
      severity: 'warning',
      message: 'Approaching budget limit for Dining',
      suggested_actions: ['Review budget', 'Reduce spending'],
      budget_amount: 50000,
      spent_amount: 38000,
      remaining_amount: 12000,
      percentage_used: 76,
      created_at: new Date(),
      acknowledged: false,
    },
    {
      id: 'alert-2',
      budget_id: 2,
      category_name: 'Shopping',
      category_color: '#9C27B0',
      alert_type: 'over_budget',
      severity: 'error',
      message: 'Over budget for Shopping',
      suggested_actions: ['Review overspending', 'Adjust budget'],
      budget_amount: 30000,
      spent_amount: 35000,
      remaining_amount: -5000,
      percentage_used: 117,
      created_at: new Date(),
      acknowledged: false,
    },
  ];

  let mockBudgetAlertService: jest.Mocked<BudgetAlertService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBudgetAlertService = {
      getActiveAlerts: jest.fn().mockResolvedValue(mockAlerts),
      acknowledgeAlert: jest.fn().mockResolvedValue(void 0),
      checkBudgetThresholds: jest.fn(),
      calculateBudgetImpact: jest.fn(),
      generateAlertsForTransaction: jest.fn(),
      generateAlertMessage: jest.fn(),
      getSuggestedActions: jest.fn(),
      getOverBudgetCategories: jest.fn(),
      generateSpendingReductionSuggestions: jest.fn(),
      getRecoveryProgress: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    // Mock the constructor to return our mocked instance
    MockedBudgetAlertService.mockImplementation(() => mockBudgetAlertService);

    // Mock event emitter methods
    mockEventEmitter.on = jest.fn();
    mockEventEmitter.off = jest.fn();
  });

  describe('Initial State', () => {
    it('starts with loading true and empty alerts array', () => {
      const { result } = renderHook(() => useBudgetAlerts());

      expect(result.current.loading).toBe(true);
      expect(result.current.alerts).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading Alerts', () => {
    it('loads alerts successfully on mount', async () => {
      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alerts).toEqual(mockAlerts);
      expect(result.current.error).toBeNull();
      expect(mockBudgetAlertService.getActiveAlerts).toHaveBeenCalledTimes(1);
    });

    it('handles loading errors gracefully', async () => {
      const errorMessage = 'Failed to load alerts';
      mockBudgetAlertService.getActiveAlerts.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alerts).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it('handles non-Error exceptions', async () => {
      mockBudgetAlertService.getActiveAlerts.mockRejectedValue('String error');

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load budget alerts');
    });
  });

  describe('Acknowledging Alerts', () => {
    it('acknowledges alert and removes it from list', async () => {
      const { result } = renderHook(() => useBudgetAlerts());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Acknowledge the first alert
      await act(async () => {
        await result.current.acknowledgeAlert('alert-1');
      });

      expect(mockBudgetAlertService.acknowledgeAlert).toHaveBeenCalledWith('alert-1');
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-2');
    });

    it('handles acknowledge errors gracefully', async () => {
      const errorMessage = 'Failed to acknowledge alert';
      mockBudgetAlertService.acknowledgeAlert.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBudgetAlerts());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.acknowledgeAlert('alert-1');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.alerts).toHaveLength(2); // Should still have all alerts
    });

    it('handles non-Error exceptions in acknowledge', async () => {
      mockBudgetAlertService.acknowledgeAlert.mockRejectedValue('String error');

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.acknowledgeAlert('alert-1');
      });

      expect(result.current.error).toBe('Failed to acknowledge alert');
    });
  });

  describe('Event Listener Integration', () => {
    it('registers event listener on mount', () => {
      renderHook(() => useBudgetAlerts());

      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        'budgetAlertsUpdated',
        expect.any(Function)
      );
    });

    it('unregisters event listener on unmount', () => {
      const { unmount } = renderHook(() => useBudgetAlerts());

      unmount();

      expect(mockEventEmitter.off).toHaveBeenCalledWith(
        'budgetAlertsUpdated',
        expect.any(Function)
      );
    });

    it('updates alerts when budgetAlertsUpdated event is emitted', async () => {
      let eventHandler: Function;
      mockEventEmitter.on.mockImplementation((event, handler) => {
        if (event === 'budgetAlertsUpdated') {
          eventHandler = handler;
        }
      });

      const { result } = renderHook(() => useBudgetAlerts());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newAlert: BudgetAlert = {
        id: 'alert-3',
        budget_id: 3,
        category_name: 'Gas',
        category_color: '#4CAF50',
        alert_type: 'at_limit',
        severity: 'warning',
        message: 'At budget limit for Gas',
        suggested_actions: ['Review budget'],
        budget_amount: 20000,
        spent_amount: 20000,
        remaining_amount: 0,
        percentage_used: 100,
        created_at: new Date(),
        acknowledged: false,
      };

      // Simulate event emission
      act(() => {
        eventHandler!([newAlert]);
      });

      expect(result.current.alerts).toHaveLength(3);
      expect(result.current.alerts[2]).toEqual(newAlert);
    });

    it('avoids duplicate alerts when adding new ones', async () => {
      let eventHandler: Function;
      mockEventEmitter.on.mockImplementation((event, handler) => {
        if (event === 'budgetAlertsUpdated') {
          eventHandler = handler;
        }
      });

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try to add the same alert that already exists
      act(() => {
        eventHandler!([mockAlerts[0]]);
      });

      // Should still have only 2 alerts (no duplicates)
      expect(result.current.alerts).toHaveLength(2);
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes alerts when refreshAlerts is called', async () => {
      const updatedAlerts = [mockAlerts[0]]; // Only one alert
      mockBudgetAlertService.getActiveAlerts
        .mockResolvedValueOnce(mockAlerts) // Initial load
        .mockResolvedValueOnce(updatedAlerts); // Refresh

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alerts).toHaveLength(2);

      // Refresh
      await act(async () => {
        await result.current.refreshAlerts();
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(mockBudgetAlertService.getActiveAlerts).toHaveBeenCalledTimes(2);
    });

    it('handles refresh errors without affecting current state', async () => {
      mockBudgetAlertService.getActiveAlerts
        .mockResolvedValueOnce(mockAlerts) // Initial load succeeds
        .mockRejectedValueOnce(new Error('Refresh failed')); // Refresh fails

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalAlerts = result.current.alerts;

      await act(async () => {
        await result.current.refreshAlerts();
      });

      // Should keep original alerts and set error
      expect(result.current.alerts).toEqual(originalAlerts);
      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('Service Integration', () => {
    it('creates BudgetAlertService with correct dependencies', () => {
      renderHook(() => useBudgetAlerts());

      expect(MockedBudgetAlertService).toHaveBeenCalledWith(
        expect.any(Object), // DatabaseService
        expect.any(Object)  // BudgetCalculationService
      );
    });

    it('memoizes the BudgetAlertService instance', () => {
      const { rerender } = renderHook(() => useBudgetAlerts());

      const firstCallCount = MockedBudgetAlertService.mock.calls.length;

      // Rerender the hook
      rerender();

      // Should not create a new service instance
      expect(MockedBudgetAlertService.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up on unmount', () => {
      const { unmount } = renderHook(() => useBudgetAlerts());

      unmount();

      expect(mockEventEmitter.off).toHaveBeenCalledWith(
        'budgetAlertsUpdated',
        expect.any(Function)
      );
    });

    it('handles concurrent alert updates correctly', async () => {
      let eventHandler: Function;
      mockEventEmitter.on.mockImplementation((event, handler) => {
        if (event === 'budgetAlertsUpdated') {
          eventHandler = handler;
        }
      });

      const { result } = renderHook(() => useBudgetAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newAlert1: BudgetAlert = { ...mockAlerts[0], id: 'new-1' };
      const newAlert2: BudgetAlert = { ...mockAlerts[0], id: 'new-2' };

      // Simulate rapid successive updates
      act(() => {
        eventHandler!([newAlert1]);
        eventHandler!([newAlert2]);
      });

      expect(result.current.alerts).toHaveLength(4); // 2 original + 2 new
    });
  });
});