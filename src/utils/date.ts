/**
 * Date formatting utilities for user-friendly date display
 */

/**
 * Format date to user-friendly format
 * @param date Date object to format
 * @returns Formatted date string (e.g., "Dec 3, 2024")
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format date with relative time for recent dates
 * @param date Date object to format
 * @returns Formatted date string with relative time (e.g., "Today", "Yesterday", "Dec 3, 2024")
 */
export const formatDateWithRelative = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - inputDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Format date for database storage (YYYY-MM-DD)
 * @param date Date object to format
 * @returns ISO date string for database storage
 */
export const formatDateForStorage = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse date string from database format
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object
 */
export const parseDateFromStorage = (dateString: string): Date => {
  return new Date(dateString + 'T00:00:00.000Z');
};