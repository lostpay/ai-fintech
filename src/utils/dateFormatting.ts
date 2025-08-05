/**
 * Advanced date formatting utilities for relative time display
 * Story 2.4: Enhanced date formatting for transaction history
 */

/**
 * Format date as relative time (Today, Yesterday, Dec 3)
 */
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else if (diffInDays < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
};

/**
 * Format date for group headers with full context
 */
export const formatDateGroupHeader = (date: Date): string => {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

/**
 * Get time portion for same-day transactions
 */
export const formatTransactionTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Group transactions by date for section list
 */
export interface TransactionGroup {
  title: string;
  date: Date;
  data: any[];
}

/**
 * Group transactions by date
 */
export const groupTransactionsByDate = <T extends { date: Date }>(
  transactions: T[]
): TransactionGroup[] => {
  const groups = new Map<string, T[]>();
  
  transactions.forEach(transaction => {
    const dateKey = transaction.date.toDateString();
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(transaction);
  });
  
  return Array.from(groups.entries())
    .map(([dateKey, data]) => ({
      title: formatDateGroupHeader(new Date(dateKey)),
      date: new Date(dateKey),
      data,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
};