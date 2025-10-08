/**
 * useExpenseForm Hook
 * Manages form state, validation, and submission for expense/income transactions.
 * Provides real-time validation and automatic form reset after successful submission.
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
  isEditMode?: boolean;
  transactionId?: number;
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
  setFormData: (data: Partial<ExpenseFormData>) => void;
}

export const useExpenseForm = (options: UseExpenseFormOptions = {}): UseExpenseFormReturn => {
  const { onSuccess, onError, isEditMode = false, transactionId } = options;

  const [formData, setFormData] = useState<Partial<ExpenseFormData>>({
    date: new Date(),
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const databaseService = DatabaseService.getInstance();

  // Run validation whenever form data changes
  useEffect(() => {
    if (Object.keys(formData).length > 1) {
      const validationErrors = validateExpenseForm(formData);
      setErrors(validationErrors);
    }
  }, [formData]);

  // Form is valid when all required fields are present and no validation errors exist
  const isValid = !hasValidationErrors(errors) &&
                 formData.amount !== undefined &&
                 formData.description !== undefined &&
                 formData.categoryId !== undefined &&
                 formData.date !== undefined;

  // Clear form and reset to initial state
  const resetForm = useCallback(() => {
    setFormData({ date: new Date() });
    setErrors({});
  }, []);

  // Update a single form field and clear its error
  const updateField = useCallback((field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Trigger full form validation and return whether valid
  const validateForm = useCallback((): boolean => {
    const validationErrors = validateExpenseForm(formData);
    setErrors(validationErrors);
    return !hasValidationErrors(validationErrors);
  }, [formData]);

  // Bulk update form data (typically used in edit mode)
  const setFormDataDirectly = useCallback((data: Partial<ExpenseFormData>) => {
    setFormData(data);
  }, []);

  // Validate and submit form data to database
  const submitForm = useCallback(async (): Promise<boolean> => {
    if (!validateForm()) {
      onError?.('Please correct the errors before submitting');
      return false;
    }

    setLoading(true);

    try {
      await databaseService.initialize();

      const transactionData = {
        amount: formData.amount!,
        description: formData.description!.trim(),
        category_id: formData.categoryId!,
        transaction_type: 'expense' as const,
        date: formData.date!,
      };

      let transaction;
      let eventType: 'created' | 'updated';
      let successMessage: string;

      if (isEditMode && transactionId) {
        transaction = await databaseService.updateTransaction(transactionId, transactionData);
        eventType = 'updated';
        successMessage = 'Transaction updated successfully!';
      } else {
        transaction = await databaseService.createTransaction(transactionData);
        eventType = 'created';
        successMessage = 'Expense added successfully!';
      }

      // Notify other components that transaction data has changed
      emitTransactionChanged({
        type: eventType,
        transactionId: transaction.id,
        categoryId: transactionData.category_id,
        amount: transactionData.amount
      });

      if (!isEditMode) {
        resetForm();
      }

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
  }, [formData, validateForm, onSuccess, onError, databaseService, resetForm, isEditMode, transactionId]);

  return {
    formData,
    errors,
    loading,
    isValid,
    updateField,
    submitForm,
    resetForm,
    validateForm,
    setFormData: setFormDataDirectly,
  };
};