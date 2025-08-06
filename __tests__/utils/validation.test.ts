/**
 * Comprehensive test suite for validation utilities
 * Tests all validation scenarios including valid data, invalid data, and edge cases
 */

import {
  validateAmount,
  validateDescription,
  validateCategoryId,
  validateTransactionDate,
  validateCompleteTransaction,
  isValidTransactionData,
  formatValidationErrors,
  TransactionFormData
} from '../../src/utils/validation';
import { Category } from '../../src/types/Category';

// Mock categories for testing
const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Food & Dining',
    color: '#FF5722',
    icon: 'restaurant',
    is_default: true,
    is_hidden: false,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z')
  },
  {
    id: 2,
    name: 'Transportation',
    color: '#2196F3',
    icon: 'directions-car',
    is_default: true,
    is_hidden: false,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z')
  },
  {
    id: 3,
    name: 'Income',
    color: '#8BC34A',
    icon: 'attach-money',
    is_default: true,
    is_hidden: false,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z')
  }
];

describe('Amount Validation', () => {
  describe('Valid amounts', () => {
    it('should accept valid positive numbers', () => {
      const result = validateAmount('25.50');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(25.50);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should accept integers', () => {
      const result = validateAmount('100');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(100);
    });

    it('should accept numbers with currency symbols', () => {
      const result = validateAmount('$25.50');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(25.50);
    });

    it('should accept numbers with commas', () => {
      const result = validateAmount('1,250.75');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(1250.75);
    });

    it('should accept numeric input', () => {
      const result = validateAmount(50.25);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(50.25);
    });

    it('should round to 2 decimal places', () => {
      const result = validateAmount('25.999');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount cannot have more than 2 decimal places');
    });
  });

  describe('Invalid amounts', () => {
    it('should reject empty string', () => {
      const result = validateAmount('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount is required');
    });

    it('should reject null/undefined', () => {
      const result = validateAmount('   ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount is required');
    });

    it('should reject non-numeric strings', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount must be a valid number');
    });

    it('should reject negative numbers', () => {
      const result = validateAmount('-25.50');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount must be greater than zero');
    });

    it('should reject zero', () => {
      const result = validateAmount('0');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount must be greater than zero');
    });

    it('should reject amounts over maximum', () => {
      const result = validateAmount('1000000');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Amount cannot exceed $999,999.99');
    });
  });
});

describe('Description Validation', () => {
  describe('Valid descriptions', () => {
    it('should accept valid description', () => {
      const result = validateDescription('Lunch at restaurant');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Lunch at restaurant');
    });

    it('should trim whitespace', () => {
      const result = validateDescription('  Lunch  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Lunch');
    });

    it('should accept single character', () => {
      const result = validateDescription('A');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('A');
    });

    it('should accept maximum length description', () => {
      const longDescription = 'A'.repeat(200);
      const result = validateDescription(longDescription);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(longDescription);
    });
  });

  describe('Invalid descriptions', () => {
    it('should reject empty string', () => {
      const result = validateDescription('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Description is required');
    });

    it('should reject whitespace only', () => {
      const result = validateDescription('   ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Description is required');
    });

    it('should reject descriptions over 200 characters', () => {
      const longDescription = 'A'.repeat(201);
      const result = validateDescription(longDescription);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Description cannot exceed 200 characters');
    });
  });
});

describe('Category ID Validation', () => {
  describe('Valid category IDs', () => {
    it('should accept valid category ID as number', () => {
      const result = validateCategoryId(1, mockCategories);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(1);
    });

    it('should accept valid category ID as string', () => {
      const result = validateCategoryId('2', mockCategories);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(2);
    });

    it('should accept all available categories', () => {
      mockCategories.forEach(category => {
        const result = validateCategoryId(category.id, mockCategories);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(category.id);
      });
    });
  });

  describe('Invalid category IDs', () => {
    it('should reject null', () => {
      const result = validateCategoryId(null as any, mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Category selection is required');
    });

    it('should reject undefined', () => {
      const result = validateCategoryId(undefined as any, mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Category selection is required');
    });

    it('should reject empty string', () => {
      const result = validateCategoryId('', mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Category selection is required');
    });

    it('should reject non-numeric string', () => {
      const result = validateCategoryId('abc', mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid category selection');
    });

    it('should reject non-existent category ID', () => {
      const result = validateCategoryId(999, mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Selected category is not valid');
    });
  });
});

describe('Transaction Date Validation', () => {
  const now = new Date();
  
  describe('Valid dates', () => {
    it('should accept current date', () => {
      const result = validateTransactionDate(now);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toEqual(now);
    });

    it('should accept date string', () => {
      const dateString = '2024-06-15';
      const result = validateTransactionDate(dateString);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toEqual(new Date(dateString));
    });

    it('should accept recent past date', () => {
      const pastDate = new Date(now);
      pastDate.setMonth(now.getMonth() - 3);
      const result = validateTransactionDate(pastDate);
      expect(result.isValid).toBe(true);
    });

    it('should accept near future date', () => {
      const futureDate = new Date(now);
      futureDate.setMonth(now.getMonth() + 3);
      const result = validateTransactionDate(futureDate);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid dates', () => {
    it('should reject invalid date string', () => {
      const result = validateTransactionDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid date format');
    });

    it('should reject date too far in past', () => {
      const oldDate = new Date(now);
      oldDate.setFullYear(now.getFullYear() - 2);
      const result = validateTransactionDate(oldDate);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Date cannot be more than one year in the past');
    });

    it('should reject date too far in future', () => {
      const futureDate = new Date(now);
      futureDate.setFullYear(now.getFullYear() + 2);
      const result = validateTransactionDate(futureDate);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Date cannot be more than one year in the future');
    });
  });
});

describe('Type Guard Validation', () => {
  describe('Valid transaction data', () => {
    it('should accept complete valid data', () => {
      const data = {
        amount: 25.50,
        description: 'Test transaction',
        category_id: 1,
        date: new Date()
      };
      expect(isValidTransactionData(data)).toBe(true);
    });

    it('should accept string amount', () => {
      const data = {
        amount: '25.50',
        description: 'Test transaction',
        category_id: 1,
        date: new Date()
      };
      expect(isValidTransactionData(data)).toBe(true);
    });

    it('should accept string category_id', () => {
      const data = {
        amount: 25.50,
        description: 'Test transaction',
        category_id: '1',
        date: new Date()
      };
      expect(isValidTransactionData(data)).toBe(true);
    });

    it('should accept date string', () => {
      const data = {
        amount: 25.50,
        description: 'Test transaction',
        category_id: 1,
        date: '2024-06-15'
      };
      expect(isValidTransactionData(data)).toBe(true);
    });
  });

  describe('Invalid transaction data', () => {
    it('should reject null data', () => {
      expect(isValidTransactionData(null)).toBe(false);
    });

    it('should reject non-object data', () => {
      expect(isValidTransactionData('string')).toBe(false);
      expect(isValidTransactionData(123)).toBe(false);
    });

    it('should reject missing fields', () => {
      const incompleteData = {
        amount: 25.50,
        description: 'Test'
        // missing category_id and date
      };
      expect(isValidTransactionData(incompleteData)).toBe(false);
    });
  });
});

describe('Complete Transaction Validation', () => {
  const validData: TransactionFormData = {
    amount: 25.50,
    description: 'Lunch at restaurant',
    category_id: 1,
    date: new Date(),
    transaction_type: 'expense'
  };

  describe('Valid complete transactions', () => {
    it('should validate complete valid transaction', () => {
      const result = validateCompleteTransaction(validData, mockCategories);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitizedData).toBeDefined();
      expect(result.sanitizedData?.amount).toBe(25.50);
      expect(result.sanitizedData?.transaction_type).toBe('expense');
    });

    it('should default transaction type to expense', () => {
      const dataWithoutType = { ...validData };
      delete (dataWithoutType as any).transaction_type;
      const result = validateCompleteTransaction(dataWithoutType, mockCategories);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.transaction_type).toBe('expense');
    });

    it('should handle string amounts', () => {
      const dataWithStringAmount = { ...validData, amount: '25.50' };
      const result = validateCompleteTransaction(dataWithStringAmount, mockCategories);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.amount).toBe(25.50);
    });
  });

  describe('Invalid complete transactions', () => {
    it('should collect multiple validation errors', () => {
      const invalidData: TransactionFormData = {
        amount: -10,
        description: '',
        category_id: 999,
        date: new Date('invalid'),
        transaction_type: 'expense'
      };
      
      const result = validateCompleteTransaction(invalidData, mockCategories);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(1);
      expect(result.errors.amount).toBeDefined();
      expect(result.errors.description).toBeDefined();
      expect(result.errors.category_id).toBeDefined();
      expect(result.errors.date).toBeDefined();
    });

    it('should handle invalid data format', () => {
      const result = validateCompleteTransaction(null as any, mockCategories);
      expect(result.isValid).toBe(false);
      expect(result.errors.general).toBe('Invalid transaction data format');
    });
  });
});

describe('Validation Error Formatting', () => {
  it('should format single error', () => {
    const errors = { amount: 'Amount is required' };
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('Amount is required');
  });

  it('should format multiple errors', () => {
    const errors = {
      amount: 'Amount is required',
      description: 'Description is required'
    };
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('Amount is required. Description is required');
  });

  it('should handle empty errors object', () => {
    const errors = {};
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('');
  });
});

describe('Edge Cases and Boundary Tests', () => {
  it('should handle very large amounts at boundary', () => {
    const result = validateAmount('999999.99');
    expect(result.isValid).toBe(true);
    expect(result.sanitizedValue).toBe(999999.99);
  });

  it('should handle amounts just over boundary', () => {
    const result = validateAmount('1000000.00');
    expect(result.isValid).toBe(false);
  });

  it('should handle description at exact character limit', () => {
    const description = 'A'.repeat(200);
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
  });

  it('should handle description just over limit', () => {
    const description = 'A'.repeat(201);
    const result = validateDescription(description);
    expect(result.isValid).toBe(false);
  });

  it('should handle date exactly at boundary', () => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const result = validateTransactionDate(oneYearAgo);
    expect(result.isValid).toBe(true);
  });

  it('should handle special characters in description', () => {
    const description = 'Café & Restaurant - $25.50 (10% tip)';
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedValue).toBe(description);
  });

  it('should handle empty categories array', () => {
    const result = validateCategoryId(1, []);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Selected category is not valid');
  });
});