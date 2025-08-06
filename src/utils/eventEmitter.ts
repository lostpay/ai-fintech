/**
 * Simple event emitter for real-time budget updates
 * Handles communication between transaction operations and budget progress displays
 */

type EventCallback = (data?: any) => void;

class EventEmitter {
  private listeners = new Map<string, EventCallback[]>();

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners for all events
   */
  removeAll(): void {
    this.listeners.clear();
  }

  /**
   * Get list of events that have listeners
   */
  getEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get number of listeners for an event
   */
  getListenerCount(event: string): number {
    const callbacks = this.listeners.get(event);
    return callbacks ? callbacks.length : 0;
  }
}

// Create singleton instance
export const eventEmitter = new EventEmitter();

// Event types for type safety
export const BUDGET_EVENTS = {
  TRANSACTION_CHANGED: 'transactionChanged',
  BUDGET_CHANGED: 'budgetChanged',
  CATEGORY_CHANGED: 'categoryChanged',
} as const;

// Event data interfaces
export interface TransactionChangedData {
  type: 'created' | 'updated' | 'deleted';
  transactionId?: number;
  categoryId: number;
  amount?: number;
  previousAmount?: number;
}

export interface BudgetChangedData {
  type: 'created' | 'updated' | 'deleted';
  budgetId?: number;
  categoryId: number;
  amount?: number;
}

export interface CategoryChangedData {
  type: 'created' | 'updated' | 'deleted' | 'hidden' | 'shown';
  categoryId: number;
  category?: any; // Full category data for real-time updates
}

// Helper functions for emitting specific events
export const emitTransactionChanged = (data: TransactionChangedData): void => {
  eventEmitter.emit(BUDGET_EVENTS.TRANSACTION_CHANGED, data);
};

export const emitBudgetChanged = (data: BudgetChangedData): void => {
  eventEmitter.emit(BUDGET_EVENTS.BUDGET_CHANGED, data);
};

export const emitCategoryChanged = (data: CategoryChangedData): void => {
  eventEmitter.emit(BUDGET_EVENTS.CATEGORY_CHANGED, data);
};

// Helper functions for subscribing to specific events with type safety
export const onTransactionChanged = (callback: (data: TransactionChangedData) => void): void => {
  eventEmitter.on(BUDGET_EVENTS.TRANSACTION_CHANGED, callback);
};

export const onBudgetChanged = (callback: (data: BudgetChangedData) => void): void => {
  eventEmitter.on(BUDGET_EVENTS.BUDGET_CHANGED, callback);
};

export const onCategoryChanged = (callback: (data: CategoryChangedData) => void): void => {
  eventEmitter.on(BUDGET_EVENTS.CATEGORY_CHANGED, callback);
};

// Helper functions for unsubscribing
export const offTransactionChanged = (callback: (data: TransactionChangedData) => void): void => {
  eventEmitter.off(BUDGET_EVENTS.TRANSACTION_CHANGED, callback);
};

export const offBudgetChanged = (callback: (data: BudgetChangedData) => void): void => {
  eventEmitter.off(BUDGET_EVENTS.BUDGET_CHANGED, callback);
};

export const offCategoryChanged = (callback: (data: CategoryChangedData) => void): void => {
  eventEmitter.off(BUDGET_EVENTS.CATEGORY_CHANGED, callback);
};

export default eventEmitter;