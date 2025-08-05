/**
 * @jest-environment jsdom
 */

import { 
  formatRelativeDate, 
  formatDateGroupHeader,
  groupTransactionsByDate,
  isSameDay 
} from '../../src/utils/dateFormatting';

describe('dateFormatting utilities', () => {
  const mockDate2024 = new Date('2024-01-15T10:00:00Z');

  beforeAll(() => {
    // Mock current date to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(mockDate2024);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatRelativeDate', () => {
    it('should return "Today" for current date', () => {
      const today = new Date('2024-01-15T14:00:00Z');
      expect(formatRelativeDate(today)).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      const yesterday = new Date('2024-01-14T14:00:00Z');
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });

    it('should return weekday for dates within a week', () => {
      const threeDaysAgo = new Date('2024-01-12T14:00:00Z');
      const result = formatRelativeDate(threeDaysAgo);
      expect(result).toBe('Friday'); // Jan 12, 2024 was a Friday
    });

    it('should return abbreviated date for older dates', () => {
      const lastMonth = new Date('2023-12-15T14:00:00Z');
      const result = formatRelativeDate(lastMonth);
      expect(result).toBe('Dec 15');
    });

    it('should include year for dates from previous year', () => {
      const lastYear = new Date('2023-01-15T14:00:00Z');
      const result = formatRelativeDate(lastYear);
      expect(result).toBe('Jan 15, 2023');
    });
  });

  describe('formatDateGroupHeader', () => {
    it('should return "Today" for current date', () => {
      const today = new Date('2024-01-15T14:00:00Z');
      expect(formatDateGroupHeader(today)).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      const yesterday = new Date('2024-01-14T14:00:00Z');
      expect(formatDateGroupHeader(yesterday)).toBe('Yesterday');
    });

    it('should return full date format for older dates', () => {
      const threeDaysAgo = new Date('2024-01-12T14:00:00Z');
      const result = formatDateGroupHeader(threeDaysAgo);
      expect(result).toBe('Friday, January 12');
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day at different times', () => {
      const date1 = new Date('2024-01-15T09:00:00Z');
      const date2 = new Date('2024-01-15T18:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15T09:00:00Z');
      const date2 = new Date('2024-01-16T09:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('groupTransactionsByDate', () => {
    const mockTransactions = [
      {
        id: 1,
        date: new Date('2024-01-15T10:00:00Z'),
        description: 'Coffee',
        amount: 500,
      },
      {
        id: 2,
        date: new Date('2024-01-15T14:00:00Z'),
        description: 'Lunch',
        amount: 1200,
      },
      {
        id: 3,
        date: new Date('2024-01-14T10:00:00Z'),
        description: 'Bus fare',
        amount: 250,
      },
    ];

    it('should group transactions by date', () => {
      const grouped = groupTransactionsByDate(mockTransactions);
      
      expect(grouped).toHaveLength(2);
      expect(grouped[0].title).toBe('Today');
      expect(grouped[0].data).toHaveLength(2);
      expect(grouped[1].title).toBe('Yesterday');
      expect(grouped[1].data).toHaveLength(1);
    });

    it('should sort groups by date descending', () => {
      const grouped = groupTransactionsByDate(mockTransactions);
      
      // Today should come first, then yesterday
      expect(grouped[0].date.getTime()).toBeGreaterThan(grouped[1].date.getTime());
    });

    it('should handle empty transaction array', () => {
      const grouped = groupTransactionsByDate([]);
      expect(grouped).toEqual([]);
    });
  });
});