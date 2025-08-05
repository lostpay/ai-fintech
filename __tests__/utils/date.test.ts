import { formatDate, formatDateWithRelative, formatDateForStorage, parseDateFromStorage } from '../../src/utils/date';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('formats dates in user-friendly format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('handles different months', () => {
      const date = new Date('2024-12-25T10:30:00Z');
      expect(formatDate(date)).toBe('Dec 25, 2024');
    });
  });

  describe('formatDateWithRelative', () => {
    beforeEach(() => {
      // Mock the current date to be consistent for tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows "Today" for current date', () => {
      const today = new Date('2024-01-15T10:30:00Z');
      expect(formatDateWithRelative(today)).toBe('Today');
    });

    it('shows "Yesterday" for previous date', () => {
      const yesterday = new Date('2024-01-14T10:30:00Z');
      expect(formatDateWithRelative(yesterday)).toBe('Yesterday');
    });

    it('shows days ago for recent dates', () => {
      const threeDaysAgo = new Date('2024-01-12T10:30:00Z');
      expect(formatDateWithRelative(threeDaysAgo)).toBe('3 days ago');
    });

    it('shows formatted date for older dates', () => {
      const oldDate = new Date('2024-01-01T10:30:00Z');
      expect(formatDateWithRelative(oldDate)).toBe('Jan 1, 2024');
    });
  });

  describe('formatDateForStorage', () => {
    it('formats date for database storage', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateForStorage(date)).toBe('2024-01-15');
    });
  });

  describe('parseDateFromStorage', () => {
    it('parses date from database format', () => {
      const parsed = parseDateFromStorage('2024-01-15');
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(0); // January is 0
      expect(parsed.getDate()).toBe(15);
    });
  });
});