/**
 * Form Validation Utilities for Expense Form
 * Implements Story 2.3 requirements for comprehensive form validation
 */

export interface ExpenseFormData {
  amount: number; // in cents
  description: string;
  categoryId: number;
  date: Date;
}

export interface FormErrors {
  amount?: string;
  description?: string;
  categoryId?: string;
  date?: string;
}

/**
 * Validate amount field
 */
export const validateAmount = (amount: number): string | undefined => {
  if (!amount || amount <= 0) {
    return 'Please enter a valid amount';
  }
  
  if (amount > 100000000) { // $1M limit (in cents)
    return 'Amount too large (max $1,000,000)';
  }
  
  return undefined;
};

/**
 * Validate description field
 */
export const validateDescription = (description: string): string | undefined => {
  if (!description || description.trim().length === 0) {
    return 'Description is required';
  }
  
  if (description.length > 100) {
    return 'Description too long (max 100 characters)';
  }
  
  if (description.trim().length < 3) {
    return 'Description too short (min 3 characters)';
  }
  
  return undefined;
};

/**
 * Validate category selection
 */
export const validateCategoryId = (categoryId: number | null | undefined): string | undefined => {
  if (!categoryId || categoryId <= 0) {
    return 'Please select a category';
  }
  
  return undefined;
};

/**
 * Validate date field
 */
export const validateDate = (date: Date): string | undefined => {
  if (!date) {
    return 'Please select a date';
  }
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (date > today) {
    return 'Date cannot be in the future';
  }
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0); // Start of day one year ago
  
  if (date < oneYearAgo) {
    return 'Date cannot be more than 1 year ago';
  }
  
  return undefined;
};

/**
 * Validate complete expense form
 */
export const validateExpenseForm = (data: Partial<ExpenseFormData>): FormErrors => {
  const errors: FormErrors = {};
  
  // Validate amount
  if (data.amount !== undefined) {
    const amountError = validateAmount(data.amount);
    if (amountError) {
      errors.amount = amountError;
    }
  } else {
    errors.amount = 'Amount is required';
  }
  
  // Validate description
  if (data.description !== undefined) {
    const descriptionError = validateDescription(data.description);
    if (descriptionError) {
      errors.description = descriptionError;
    }
  } else {
    errors.description = 'Description is required';
  }
  
  // Validate category
  if (data.categoryId !== undefined) {
    const categoryError = validateCategoryId(data.categoryId);
    if (categoryError) {
      errors.categoryId = categoryError;
    }
  } else {
    errors.categoryId = 'Category is required';
  }
  
  // Validate date
  if (data.date !== undefined) {
    const dateError = validateDate(data.date);
    if (dateError) {
      errors.date = dateError;
    }
  } else {
    errors.date = 'Date is required';
  }
  
  return errors;
};

/**
 * Check if form has any validation errors
 */
export const hasValidationErrors = (errors: FormErrors): boolean => {
  return Object.values(errors).some(error => error !== undefined);
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: FormErrors): string => {
  const errorMessages = Object.values(errors).filter(error => error !== undefined);
  
  if (errorMessages.length === 0) {
    return '';
  }
  
  if (errorMessages.length === 1) {
    return errorMessages[0]!;
  }
  
  return `Please fix the following errors:\n• ${errorMessages.join('\n• ')}`;
};