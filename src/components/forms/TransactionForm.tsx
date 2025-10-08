/**
 * TransactionForm Component
 * Provides comprehensive form validation with real-time feedback.
 * Validates amount, description, category, and date fields with detailed error messages.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Platform, 
  TextInput, 
  TouchableOpacity, 
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  validateCompleteTransaction, 
  TransactionFormData,
  formatValidationErrors
} from '../../utils/validation';
import { 
  ValidationError,
  isAppError
} from '../../services/ErrorHandlingService';
import { DatabaseService } from '../../services/DatabaseService';
import { Category } from '../../types/Category';

interface TransactionFormProps {
  onSubmit: (success: boolean, message?: string) => void;
  initialData?: Partial<TransactionFormData>;
  submitButtonText?: string;
}

interface FormData {
  amount: string;
  description: string;
  category_id: number | string;
  date: Date;
  transaction_type: 'expense' | 'income';
}

interface FormErrors {
  amount?: string;
  description?: string;
  category_id?: string;
  date?: string;
  general?: string;
}

interface ValidationState {
  isValidating: boolean;
  hasValidated: boolean;
  isValid: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, 
  initialData,
  submitButtonText = 'Save Expense'
}) => {
  // Services
  const databaseService = DatabaseService.getInstance();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    amount: initialData?.amount?.toString() || '',
    description: initialData?.description || '',
    category_id: initialData?.category_id || '',
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    transaction_type: initialData?.transaction_type || 'expense',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    hasValidated: false,
    isValid: false
  });
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState({ categories: true, submitting: false });

  // Load categories from database on component mount
  useEffect(() => {
    const initializeForm = async () => {
      try {
        await databaseService.initialize();
        const loadedCategories = await databaseService.getCategories();
        setCategories(loadedCategories);
        setLoading(prev => ({ ...prev, categories: false }));
      } catch (error) {
        console.error('Failed to initialize form:', error);
        setLoading(prev => ({ ...prev, categories: false }));
        Alert.alert('Error', 'Failed to load form data. Please restart the app.');
      }
    };

    initializeForm();
  }, []);

  // Validate form data against business rules and constraints
  const performValidation = useCallback(async (data: FormData) => {
    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      const validationData: TransactionFormData = {
        amount: data.amount,
        description: data.description,
        category_id: data.category_id,
        date: data.date,
        transaction_type: data.transaction_type
      };

      const validationResult = validateCompleteTransaction(validationData, categories);

      setErrors(validationResult.errors);
      setValidationState({
        isValidating: false,
        hasValidated: true,
        isValid: validationResult.isValid
      });

    } catch (error) {
      console.error('Validation error:', error);
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        isValid: false
      }));
    }
  }, [categories]);

  // Debounce validation to avoid excessive re-renders on rapid input
  useEffect(() => {
    if (categories.length === 0) return;

    const validationTimeout = setTimeout(() => {
      performValidation(formData);
    }, 300);

    return () => clearTimeout(validationTimeout);
  }, [formData, categories, performValidation]);

  // Sanitize amount input to allow only valid numeric values
  const handleAmountChange = (value: string) => {
    let sanitized = value.replace(/[^0-9.]/g, '');
    const decimalCount = (sanitized.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const parts = sanitized.split('.');
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    setFormData(prev => ({ ...prev, amount: sanitized }));

    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  // Update description and clear validation error
  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));

    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  // Update selected category and clear validation error
  const handleCategoryChange = (value: number | string) => {
    setFormData(prev => ({ ...prev, category_id: value }));

    if (errors.category_id) {
      setErrors(prev => ({ ...prev, category_id: undefined }));
    }
  };

  // Handle date picker selection
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));

      if (errors.date) {
        setErrors(prev => ({ ...prev, date: undefined }));
      }
    }
  };

  // Validate form and submit transaction to database
  const handleSubmit = async () => {
    if (validationState.isValidating) {
      Alert.alert('Please Wait', 'Form validation is in progress...');
      return;
    }

    if (!validationState.isValid || Object.keys(errors).some(key => errors[key as keyof FormErrors])) {
      Alert.alert(
        'Validation Error',
        'Please correct the highlighted errors before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(prev => ({ ...prev, submitting: true }));

    try {
      const transactionData: TransactionFormData = {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category_id: typeof formData.category_id === 'string'
          ? parseInt(formData.category_id, 10)
          : formData.category_id,
        date: formData.date,
        transaction_type: formData.transaction_type
      };

      await databaseService.createTransactionWithValidation(transactionData);

      const successMessage = `${formData.transaction_type === 'expense' ? 'Expense' : 'Income'} added successfully!`;

      setFormData({
        amount: '',
        description: '',
        category_id: '',
        date: new Date(),
        transaction_type: 'expense'
      });
      setErrors({});
      setValidationState({
        isValidating: false,
        hasValidated: false,
        isValid: false
      });

      Alert.alert('Success', successMessage);
      onSubmit(true, successMessage);

    } catch (error) {
      console.error('Error saving transaction:', error);

      let errorMessage = 'Failed to save transaction. Please try again.';

      if (error instanceof ValidationError) {
        setErrors(error.validationErrors);
        errorMessage = formatValidationErrors(error.validationErrors);
      } else if (isAppError(error)) {
        errorMessage = error.error.message;
        if (error.error.code === 'FOREIGN_KEY_ERROR') {
          try {
            const refreshedCategories = await databaseService.getCategories();
            setCategories(refreshedCategories);
          } catch (refreshError) {
            console.error('Failed to refresh categories:', refreshError);
          }
        }
      }

      Alert.alert('Error', errorMessage);
      onSubmit(false, errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Format date to user-friendly string
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate character count and color based on remaining characters
  const getDescriptionInfo = () => {
    const length = formData.description.length;
    const maxLength = 200;
    const remaining = maxLength - length;
    const isNearLimit = remaining <= 20;

    return {
      text: `${length}/${maxLength}`,
      color: isNearLimit ? (remaining < 0 ? '#ff190c' : '#ff9500') : '#86939e'
    };
  };

  if (loading.categories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount *</Text>
          <View style={[
            styles.inputWrapper, 
            errors.amount && styles.inputWrapperError
          ]}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              testID="amount-input"
              placeholderTextColor="#86939e"
            />
          </View>
          {errors.amount && (
            <Text style={styles.errorText}>{errors.amount}</Text>
          )}
          {validationState.isValidating && formData.amount && (
            <Text style={styles.validatingText}>Validating...</Text>
          )}
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[
              styles.textInput, 
              errors.description && styles.textInputError
            ]}
            placeholder="Enter transaction description"
            value={formData.description}
            onChangeText={handleDescriptionChange}
            testID="description-input"
            placeholderTextColor="#86939e"
            maxLength={200}
            multiline
            numberOfLines={2}
          />
          <View style={styles.inputInfo}>
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
            <Text style={[
              styles.characterCount, 
              { color: getDescriptionInfo().color }
            ]}>
              {getDescriptionInfo().text}
            </Text>
          </View>
        </View>

        {/* Category Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Category *</Text>
          <View style={[
            styles.pickerWrapper,
            errors.category_id && styles.pickerWrapperError
          ]}>
            <Picker
              selectedValue={formData.category_id}
              onValueChange={handleCategoryChange}
              testID="category-picker"
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              {categories.map((category: Category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                />
              ))}
            </Picker>
          </View>
          {errors.category_id && (
            <Text style={styles.errorText}>{errors.category_id}</Text>
          )}
        </View>

        {/* Transaction Type Toggle */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.typeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.transaction_type === 'expense' && styles.typeButtonActive
              ]}
              onPress={() => setFormData(prev => ({ ...prev, transaction_type: 'expense' }))}
              testID="expense-toggle"
            >
              <Text style={[
                styles.typeButtonText,
                formData.transaction_type === 'expense' && styles.typeButtonTextActive
              ]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.transaction_type === 'income' && styles.typeButtonActive
              ]}
              onPress={() => setFormData(prev => ({ ...prev, transaction_type: 'income' }))}
              testID="income-toggle"
            >
              <Text style={[
                styles.typeButtonText,
                formData.transaction_type === 'income' && styles.typeButtonTextActive
              ]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.date && styles.dateButtonError
            ]}
            onPress={() => setShowDatePicker(true)}
            testID="date-picker-button"
          >
            <Text style={styles.dateButtonText}>
              {formatDate(formData.date)}
            </Text>
          </TouchableOpacity>
          {errors.date && (
            <Text style={styles.errorText}>{errors.date}</Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            testID="date-picker"
            value={formData.date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date(new Date().getFullYear() + 1, 11, 31)}
            minimumDate={new Date(new Date().getFullYear() - 1, 0, 1)}
          />
        )}

        {/* General Error */}
        {errors.general && (
          <View style={styles.generalErrorContainer}>
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!validationState.isValid || loading.submitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!validationState.isValid || loading.submitting}
          testID="submit-button"
        >
          {loading.submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{submitButtonText}</Text>
          )}
        </TouchableOpacity>

        {/* Form Status Indicator */}
        {validationState.hasValidated && (
          <View style={styles.statusContainer}>
            <Text style={[
              styles.statusText,
              { color: validationState.isValid ? '#4CAF50' : '#ff190c' }
            ]}>
              {validationState.isValid ? '✓ Form is valid' : '✗ Please fix errors above'}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#86939e',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86939e',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: '#ff190c',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#86939e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#ff190c',
  },
  inputInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#86939e',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerWrapperError: {
    borderColor: '#ff190c',
  },
  picker: {
    height: 50,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#86939e',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#86939e',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  dateButtonError: {
    borderColor: '#ff190c',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#86939e',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff190c',
    fontSize: 12,
    marginTop: 4,
  },
  validatingText: {
    color: '#2196F3',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  generalErrorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff190c',
  },
  generalErrorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TransactionForm;