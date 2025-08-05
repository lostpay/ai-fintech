import { formatCurrency, parseCurrencyToCents, formatCurrencyWithSign } from '../../src/utils/currency';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('formats cents to dollars correctly', () => {
      expect(formatCurrency(2550)).toBe('$25.50');
      expect(formatCurrency(100)).toBe('$1.00');
      expect(formatCurrency(5)).toBe('$0.05');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles large amounts', () => {
      expect(formatCurrency(123456789)).toBe('$1,234,567.89');
    });

    it('handles negative amounts', () => {
      expect(formatCurrency(-2550)).toBe('-$25.50');
    });
  });

  describe('parseCurrencyToCents', () => {
    it('parses currency strings to cents', () => {
      expect(parseCurrencyToCents('$25.50')).toBe(2550);
      expect(parseCurrencyToCents('$1.00')).toBe(100);
      expect(parseCurrencyToCents('$0.05')).toBe(5);
      expect(parseCurrencyToCents('$0.00')).toBe(0);
    });

    it('handles amounts without currency symbols', () => {
      expect(parseCurrencyToCents('25.50')).toBe(2550);
      expect(parseCurrencyToCents('1.00')).toBe(100);
    });

    it('throws error for invalid formats', () => {
      expect(() => parseCurrencyToCents('invalid')).toThrow('Invalid currency format');
      expect(() => parseCurrencyToCents('')).toThrow('Invalid currency format');
    });
  });

  describe('formatCurrencyWithSign', () => {
    it('formats income with positive sign', () => {
      expect(formatCurrencyWithSign(2550, 'income')).toBe('+$25.50');
    });

    it('formats expense with negative sign', () => {
      expect(formatCurrencyWithSign(2550, 'expense')).toBe('-$25.50');
    });

    it('handles absolute values correctly', () => {
      expect(formatCurrencyWithSign(-2550, 'income')).toBe('+$25.50');
      expect(formatCurrencyWithSign(-2550, 'expense')).toBe('-$25.50');
    });
  });
});