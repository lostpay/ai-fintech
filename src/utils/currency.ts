/**
 * Currency formatting utilities for monetary values
 * Handles conversion from cents to dollars with proper formatting
 */

/**
 * Format currency amount from cents to localized currency string
 * @param amountInCents Amount in cents (e.g., 2550 for $25.50)
 * @returns Formatted currency string (e.g., "$25.50")
 */
export const formatCurrency = (amountInCents: number): string => {
  // Convert cents to dollars
  const dollars = amountInCents / 100;
  
  // Format with proper currency symbol and locale
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
};

/**
 * Parse currency string to cents
 * @param currencyString Formatted currency string (e.g., "$25.50")
 * @returns Amount in cents (e.g., 2550)
 */
export const parseCurrencyToCents = (currencyString: string): number => {
  // Remove currency symbols and non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^0-9.-]/g, '');
  const dollars = parseFloat(numericString);
  
  if (isNaN(dollars)) {
    throw new Error('Invalid currency format');
  }
  
  // Convert to cents and round to avoid floating-point issues
  return Math.round(dollars * 100);
};

/**
 * Format currency amount with sign for income/expense display
 * @param amountInCents Amount in cents
 * @param transactionType Type of transaction ('income' or 'expense')
 * @returns Formatted currency string with appropriate sign
 */
export const formatCurrencyWithSign = (
  amountInCents: number, 
  transactionType: 'income' | 'expense'
): string => {
  const formattedAmount = formatCurrency(Math.abs(amountInCents));
  return transactionType === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
};