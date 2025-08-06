import { useState, useEffect, useCallback } from 'react';
import { budgetAlertService } from '../services';
import { BudgetAlert } from '../types/BudgetAlert';
import { onBudgetAlertsUpdated, onTransactionChanged, offBudgetAlertsUpdated, offTransactionChanged, emitBudgetAlertsUpdated } from '../utils/eventEmitter';

export const useBudgetAlerts = () => {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeAlerts = await budgetAlertService.getActiveAlerts();
      setAlerts(activeAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await budgetAlertService.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  }, []);

  // Listen for new budget alerts from event system
  useEffect(() => {
    const handleBudgetAlertsUpdated = (data: { alerts: any[] }) => {
      setAlerts(prev => {
        // Merge new alerts, avoiding duplicates
        const alertIds = new Set(prev.map(a => a.id));
        const uniqueNewAlerts = data.alerts.filter((a: BudgetAlert) => !alertIds.has(a.id));
        return [...prev, ...uniqueNewAlerts];
      });
    };

    onBudgetAlertsUpdated(handleBudgetAlertsUpdated);
    return () => offBudgetAlertsUpdated(handleBudgetAlertsUpdated);
  }, []);

  // Listen for transaction changes and generate alerts automatically
  useEffect(() => {
    const handleTransactionChanged = async (data: any) => {
      // Only process expense transactions that were created
      if (data.type === 'created' && data.transactionId) {
        try {
          // Generate alerts for the new transaction
          const newAlerts = await budgetAlertService.generateAlertsForTransaction(data.transactionId);
          
          if (newAlerts.length > 0) {
            // Emit alerts update event for other components to listen to
            emitBudgetAlertsUpdated({
              alerts: newAlerts,
              transactionId: data.transactionId,
              categoryId: data.categoryId
            });
          }
        } catch (err) {
          console.error('Failed to generate alerts for transaction:', err);
        }
      }
    };

    onTransactionChanged(handleTransactionChanged);
    return () => offTransactionChanged(handleTransactionChanged);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return {
    alerts,
    loading,
    error,
    acknowledgeAlert,
    refreshAlerts: loadAlerts,
  };
};