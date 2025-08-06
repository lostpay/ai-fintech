/**
 * useExpenseForm Hook - Material Design 3 Form State Management
 * Implements Story 2.3 requirements for form state management and submission
 */

import { useState, useCallback, useEffect } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import { 
  ExpenseFormData, 
  FormErrors, 
  validateExpenseForm, 
  hasValidationErrors 
} from '../utils/formValidation';
import { emitTransactionChanged } from '../utils/eventEmitter';

interface UseExpenseFormOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface UseExpenseFormReturn {
  // Form data
  formData: Partial<ExpenseFormData>;
  errors: FormErrors;
  
  // State flags
  loading: boolean;
  isValid: boolean;
  
  // Form methods
  updateField: (field: keyof ExpenseFormData, value: any) => void;
  submitForm: () => Promise<boolean>;
  resetForm: () => void;
  validateForm: () => boolean;
}

export const useExpenseForm = (options: UseExpenseFormOptions = {}): UseExpenseFormReturn => {
  const { onSuccess, onError } = options;
  
  // Form state
  const [formData, setFormData] = useState<Partial<ExpenseFormData>>({
    date: new Date(), // Default to today
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const databaseService = DatabaseService.getInstance();

  // Validate form whenever data changes
  useEffect(() => {
    if (Object.keys(formData).length > 1) { // Only validate if form has data beyond default date
      const validationErrors = validateExpenseForm(formData);
      setErrors(validationErrors);
    }
  }, [formData]);

  // Calculate if form is valid
  const isValid = !hasValidationErrors(errors) && 
                 formData.amount !== undefined && 
                 formData.description !== undefined && 
                 formData.categoryId !== undefined && 
                 formData.date !== undefined;

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({ date: new Date() });
    setErrors({});
  }, []);

  /**
   * Update a single form field
   */
  const updateField = useCallback((field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  /**
   * Validate the complete form
   */
  const validateForm = useCallback((): boolean => {
    const validationErrors = validateExpenseForm(formData);
    setErrors(validationErrors);
    return !hasValidationErrors(validationErrors);
  }, [formData]);

  /**
   * Submit the form
   */
  const submitForm = useCallback(async (): Promise<boolean> => {
    // Validate form before submission
    if (!validateForm()) {
      onError?.('Please correct the errors before submitting');
      return false;
    }

    setLoading(true);

    try {
      // Ensure database is initialized
      await databaseService.initialize();

      // Create transaction with validated data
      const transactionData = {
        amount: formData.amount!,
        description: formData.description!.trim(),
        category_id: formData.categoryId!,
        transaction_type: 'expense' as const,
        date: formData.date!,
      };

      const transaction = await databaseService.createTransaction(transactionData);
      
      // Emit transaction changed event for budget alerts
      emitTransactionChanged({
        type: 'created',
        transactionId: transaction.id,
        categoryId: transactionData.category_id,
        amount: transactionData.amount
      });
      
      // Success - reset form
      resetForm();
      
      const successMessage = 'Expense added successfully! 💰';
      onSuccess?.(successMessage);
      
      return true;
    } catch (error) {
      console.error('Error submitting expense form:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save expense. Please try again.';
      
      onError?.(errorMessage);
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, onSuccess, onError, databaseService, resetForm]);

  return {
    formData,
    errors,
    loading,
    isValid,
    updateField,
    submitForm,
    resetForm,
    validateForm,
  };
};