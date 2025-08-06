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

/**
 * Format month with year for dashboard header
 * @param date Date object to format
 * @returns Formatted month string (e.g., "January 2025")
 */
export const formatMonth = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/**
 * Get current month period for budget creation
 * @returns Object with start and end dates for current month
 */
export const getCurrentMonthPeriod = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
};

/**
 * Get month period for specific date
 * @param date Date to get month period for
 * @returns Object with start and end dates for the month
 */
export const getMonthPeriod = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

/**
 * Check if two date ranges overlap
 * @param start1 Start date of first range
 * @param end1 End date of first range
 * @param start2 Start date of second range
 * @param end2 End date of second range
 * @returns True if ranges overlap
 */
export const doPeriadsOverlap = (
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean => {
  return start1 <= end2 && end1 >= start2;
};

/**
 * Validate that period end is after period start
 * @param startDate Period start date
 * @param endDate Period end date
 * @returns True if valid period
 */
export const isValidPeriod = (startDate: Date, endDate: Date): boolean => {
  return endDate > startDate;
};