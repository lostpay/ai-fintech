/**
 * Comprehensive validation utilities for transaction data
 * Following TypeScript strict mode and database constraints
 */

import { Category } from '../types/Category';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: any;
}

/**
 * Validates monetary amounts for transactions
 * Requirements: Positive numbers only, proper currency format
 * Converts string to number, validates range
 */
export const validateAmount = (amount: string | number): ValidationResult => {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  
  // Check if empty or null
  if (!amountStr || amountStr.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Amount is required'
    };
  }

  // Remove any currency symbols and whitespace
  const cleanAmount = amountStr.replace(/[$,\s]/g, '');
  
  // Check if it's a valid number
  const numericAmount = parseFloat(cleanAmount);
  if (isNaN(numericAmount)) {
    return {
      isValid: false,
      errorMessage: 'Amount must be a valid number'
    };
  }

  // Check if positive
  if (numericAmount <= 0) {
    return {
      isValid: false,
      errorMessage: 'Amount must be greater than zero'
    };
  }

  // Check reasonable maximum (prevent overflow)
  if (numericAmount > 999999.99) {
    return {
      isValid: false,
      errorMessage: 'Amount cannot exceed $999,999.99'
    };
  }

  // Check decimal places (max 2 for currency)
  const decimalPart = cleanAmount.split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return {
      isValid: false,
      errorMessage: 'Amount cannot have more than 2 decimal places'
    };
  }

  return {
    isValid: true,
    sanitizedValue: Math.round(numericAmount * 100) / 100 // Round to 2 decimal places
  };
};

/**
 * Validates transaction description
 * Requirements: Required field, 1-200 characters per database constraints
 */
export const validateDescription = (description: string): ValidationResult => {
  // Check if empty or null
  if (!description || description.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Description is required'
    };
  }

  const trimmedDescription = description.trim();

  // Check minimum length
  if (trimmedDescription.length < 1) {
    return {
      isValid: false,
      errorMessage: 'Description must be at least 1 character long'
    };
  }

  // Check maximum length (database constraint)
  if (trimmedDescription.length > 200) {
    return {
      isValid: false,
      errorMessage: 'Description cannot exceed 200 characters'
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmedDescription
  };
};

/**
 * Validates category selection
 * Requirements: Must exist in available categories, foreign key integrity
 */
export const validateCategoryId = (categoryId: number | string, categories: Category[]): ValidationResult => {
  // Check if categoryId is provided
  if (categoryId === null || categoryId === undefined || categoryId === '') {
    return {
      isValid: false,
      errorMessage: 'Category selection is required'
    };
  }

  // Convert to number if string
  const numericCategoryId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
  
  // Check if it's a valid number
  if (isNaN(numericCategoryId)) {
    return {
      isValid: false,
      errorMessage: 'Invalid category selection'
    };
  }

  // Check if category exists in available categories
  const categoryExists = categories.some(category => category.id === numericCategoryId);
  if (!categoryExists) {
    return {
      isValid: false,
      errorMessage: 'Selected category is not valid'
    };
  }

  return {
    isValid: true,
    sanitizedValue: numericCategoryId
  };
};

/**
 * Validates transaction date
 * Requirements: Valid date format, reasonable date ranges
 */
export const validateTransactionDate = (date: Date | string): ValidationResult => {
  let dateObj: Date;

  // Convert string to Date if necessary
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Invalid date format'
    };
  }

  // Check reasonable date range (not too far in the past or future)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  if (dateObj < oneYearAgo) {
    return {
      isValid: false,
      errorMessage: 'Date cannot be more than one year in the past'
    };
  }

  if (dateObj > oneYearFromNow) {
    return {
      isValid: false,
      errorMessage: 'Date cannot be more than one year in the future'
    };
  }

  return {
    isValid: true,
    sanitizedValue: dateObj
  };
};

/**
 * TypeScript type guard for Transaction data
 * Validates that an object has all required transaction properties
 */
export const isValidTransactionData = (data: any): data is TransactionFormData => {
  return (
    data &&
    typeof data === 'object' &&
    (typeof data.amount === 'string' || typeof data.amount === 'number') &&
    typeof data.description === 'string' &&
    (typeof data.category_id === 'number' || typeof data.category_id === 'string') &&
    (data.date instanceof Date || typeof data.date === 'string')
  );
};

/**
 * Interface for transaction form data before database storage
 */
export interface TransactionFormData {
  amount: number | string;
  description: string;
  category_id: number | string;
  date: Date | string;
  transaction_type?: 'expense' | 'income';
}

/**
 * Comprehensive validation for complete transaction data
 * Validates all fields and returns combined results
 */
export const validateCompleteTransaction = (
  data: TransactionFormData,
  categories: Category[]
): { isValid: boolean; errors: Record<string, string>; sanitizedData?: any } => {
  const errors: Record<string, string> = {};
  const sanitizedData: any = {};

  // Validate type guard first
  if (!isValidTransactionData(data)) {
    return {
      isValid: false,
      errors: { general: 'Invalid transaction data format' }
    };
  }

  // Validate amount
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.amount = amountValidation.errorMessage!;
  } else {
    sanitizedData.amount = amountValidation.sanitizedValue;
  }

  // Validate description
  const descriptionValidation = validateDescription(data.description);
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.errorMessage!;
  } else {
    sanitizedData.description = descriptionValidation.sanitizedValue;
  }

  // Validate category
  const categoryValidation = validateCategoryId(data.category_id, categories);
  if (!categoryValidation.isValid) {
    errors.category_id = categoryValidation.errorMessage!;
  } else {
    sanitizedData.category_id = categoryValidation.sanitizedValue;
  }

  // Validate date
  const dateValidation = validateTransactionDate(data.date);
  if (!dateValidation.isValid) {
    errors.date = dateValidation.errorMessage!;
  } else {
    sanitizedData.date = dateValidation.sanitizedValue;
  }

  // Set transaction type default
  sanitizedData.transaction_type = data.transaction_type || 'expense';

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitizedData: isValid ? sanitizedData : undefined
  };
};

/**
 * Utility function to format validation errors for display
 */
export const formatValidationErrors = (errors: Record<string, string>): string => {
  const errorMessages = Object.values(errors);
  if (errorMessages.length === 1) {
    return errorMessages[0];
  }
  return errorMessages.join('. ');
};

// ========== BUDGET VALIDATION UTILITIES ==========

/**
 * Interface for budget form data before database storage
 */
export interface BudgetFormData {
  category_id: number | string;
  amount: number | string;
  period_start: Date | string;
  period_end: Date | string;
}

/**
 * Validates budget amount
 * Requirements: Positive numbers only, reasonable limits for budgets
 */
export const validateBudgetAmount = (amount: string | number): ValidationResult => {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  
  // Check if empty or null
  if (!amountStr || amountStr.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Budget amount is required'
    };
  }

  // Remove any currency symbols and whitespace
  const cleanAmount = amountStr.replace(/[$,\s]/g, '');
  
  // Check if it's a valid number
  const numericAmount = parseFloat(cleanAmount);
  if (isNaN(numericAmount)) {
    return {
      isValid: false,
      errorMessage: 'Budget amount must be a valid number'
    };
  }

  // Check if positive
  if (numericAmount <= 0) {
    return {
      isValid: false,
      errorMessage: 'Budget amount must be greater than zero'
    };
  }

  // Check reasonable maximum for budgets
  if (numericAmount > 999999.99) {
    return {
      isValid: false,
      errorMessage: 'Budget amount cannot exceed $999,999.99'
    };
  }

  // Check decimal places (max 2 for currency)
  const decimalPart = cleanAmount.split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return {
      isValid: false,
      errorMessage: 'Budget amount cannot have more than 2 decimal places'
    };
  }

  return {
    isValid: true,
    sanitizedValue: Math.round(numericAmount * 100) / 100 // Round to 2 decimal places
  };
};

/**
 * Validates budget period dates
 * Requirements: period_end must be after period_start, reasonable date ranges
 */
export const validateBudgetPeriod = (startDate: Date | string, endDate: Date | string): ValidationResult => {
  let startDateObj: Date;
  let endDateObj: Date;

  // Convert strings to Date if necessary
  if (typeof startDate === 'string') {
    startDateObj = new Date(startDate);
  } else {
    startDateObj = startDate;
  }

  if (typeof endDate === 'string') {
    endDateObj = new Date(endDate);
  } else {
    endDateObj = endDate;
  }

  // Check if valid dates
  if (isNaN(startDateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Invalid start date format'
    };
  }

  if (isNaN(endDateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Invalid end date format'
    };
  }

  // Check that end date is after start date
  if (endDateObj <= startDateObj) {
    return {
      isValid: false,
      errorMessage: 'End date must be after start date'
    };
  }

  // Check reasonable date range (not too far in the past or future)
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

  if (startDateObj < twoYearsAgo || endDateObj < twoYearsAgo) {
    return {
      isValid: false,
      errorMessage: 'Budget dates cannot be more than two years in the past'
    };
  }

  if (startDateObj > twoYearsFromNow || endDateObj > twoYearsFromNow) {
    return {
      isValid: false,
      errorMessage: 'Budget dates cannot be more than two years in the future'
    };
  }

  return {
    isValid: true,
    sanitizedValue: { startDate: startDateObj, endDate: endDateObj }
  };
};

/**
 * TypeScript type guard for Budget data
 */
export const isValidBudgetData = (data: any): data is BudgetFormData => {
  return (
    data &&
    typeof data === 'object' &&
    (typeof data.amount === 'string' || typeof data.amount === 'number') &&
    (typeof data.category_id === 'number' || typeof data.category_id === 'string') &&
    (data.period_start instanceof Date || typeof data.period_start === 'string') &&
    (data.period_end instanceof Date || typeof data.period_end === 'string')
  );
};

/**
 * Comprehensive validation for complete budget data
 */
export const validateCompleteBudget = (
  data: BudgetFormData,
  categories: Category[]
): { isValid: boolean; errors: Record<string, string>; sanitizedData?: any } => {
  const errors: Record<string, string> = {};
  const sanitizedData: any = {};

  // Validate type guard first
  if (!isValidBudgetData(data)) {
    return {
      isValid: false,
      errors: { general: 'Invalid budget data format' }
    };
  }

  // Validate amount
  const amountValidation = validateBudgetAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.amount = amountValidation.errorMessage!;
  } else {
    sanitizedData.amount = amountValidation.sanitizedValue;
  }

  // Validate category
  const categoryValidation = validateCategoryId(data.category_id, categories);
  if (!categoryValidation.isValid) {
    errors.category_id = categoryValidation.errorMessage!;
  } else {
    sanitizedData.category_id = categoryValidation.sanitizedValue;
  }

  // Validate period
  const periodValidation = validateBudgetPeriod(data.period_start, data.period_end);
  if (!periodValidation.isValid) {
    errors.period = periodValidation.errorMessage!;
  } else {
    sanitizedData.period_start = periodValidation.sanitizedValue!.startDate;
    sanitizedData.period_end = periodValidation.sanitizedValue!.endDate;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitizedData: isValid ? sanitizedData : undefined
  };
};