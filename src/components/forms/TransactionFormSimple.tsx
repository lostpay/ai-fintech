import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, TextInput, TouchableOpacity, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Category } from '../../types/Category';
import { CreateTransactionRequest } from '../../types/Transaction';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';

interface TransactionFormProps {
  onSubmit: (success: boolean) => void;
}

interface FormData {
  amount: string;
  description: string;
  category_id: number | null;
  date: Date;
}

interface FormErrors {
  amount?: string;
  description?: string;
  category_id?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit }) => {
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const { addTransaction, loading: submitting } = useTransactions();
  
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    description: '',
    category_id: null,
    date: new Date(),
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (categoriesError) {
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    }
  }, [categoriesError]);

  const validateAmount = (amount: string): string | undefined => {
    if (!amount.trim()) {
      return 'Amount is required';
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return 'Amount must be a positive number';
    }
    
    const decimalPlaces = (amount.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return 'Amount cannot have more than 2 decimal places';
    }
    
    return undefined;
  };

  const validateDescription = (description: string): string | undefined => {
    if (!description.trim()) {
      return 'Description is required';
    }
    
    if (description.length > 200) {
      return 'Description cannot exceed 200 characters';
    }
    
    return undefined;
  };

  const validateCategory = (category_id: number | null): string | undefined => {
    if (!category_id) {
      return 'Category is required';
    }
    
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    newErrors.amount = validateAmount(formData.amount);
    newErrors.description = validateDescription(formData.description);
    newErrors.category_id = validateCategory(formData.category_id);
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, amount: sanitized }));
    
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  const handleCategoryChange = (value: number) => {
    setFormData(prev => ({ ...prev, category_id: value }));
    
    if (errors.category_id) {
      setErrors(prev => ({ ...prev, category_id: undefined }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const amountInCents = Math.round(parseFloat(formData.amount) * 100);
      
      const transactionData: CreateTransactionRequest = {
        amount: amountInCents,
        description: formData.description.trim(),
        category_id: formData.category_id!,
        transaction_type: 'expense',
        date: formData.date,
      };

      await addTransaction(transactionData);
      
      setFormData({
        amount: '',
        description: '',
        category_id: null,
        date: new Date(),
      });
      setErrors({});
      
      Alert.alert('Success', 'Expense added successfully!');
      onSubmit(true);
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
      onSubmit(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  if (categoriesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Amount Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={[styles.input, errors.amount ? styles.inputError : null]}
          placeholder="0.00"
          value={formData.amount}
          onChangeText={handleAmountChange}
          keyboardType="numeric"
          testID="amount-input"
        />
        {errors.amount && (
          <Text style={styles.errorText}>{errors.amount}</Text>
        )}
      </View>

      {/* Description Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, errors.description ? styles.inputError : null]}
          placeholder="Enter expense description"
          value={formData.description}
          onChangeText={handleDescriptionChange}
          maxLength={200}
          testID="description-input"
        />
        {errors.description && (
          <Text style={styles.errorText}>{errors.description}</Text>
        )}
      </View>

      {/* Category Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Category</Text>
        <View style={[styles.pickerWrapper, errors.category_id ? styles.inputError : null]}>
          <Picker
            selectedValue={formData.category_id ?? undefined}
            onValueChange={handleCategoryChange}
            testID="category-picker"
            style={styles.picker}
          >
            <Picker.Item label="Select a category" value={null} />
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

      {/* Date Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          testID="date-picker-button"
        >
          <Text style={styles.dateButtonText}>{formatDate(formData.date)}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          testID="date-picker"
          value={formData.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
        onPress={handleSubmit}
        disabled={submitting}
        testID="submit-button"
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Saving...' : 'Save Expense'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff190c',
  },
  errorText: {
    color: '#ff190c',
    fontSize: 12,
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TransactionForm;