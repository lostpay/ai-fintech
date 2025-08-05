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
    
    // Check for reasonable currency format (max 2 decimal places)
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
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, amount: sanitized }));
    
    // Clear amount error if exists
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
    
    // Clear description error if exists
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  const handleCategoryChange = (value: number) => {
    setFormData(prev => ({ ...prev, category_id: value }));
    
    // Clear category error if exists
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
      // Convert amount to cents for database storage
      const amountInCents = Math.round(parseFloat(formData.amount) * 100);
      
      const transactionData: CreateTransactionRequest = {
        amount: amountInCents,
        description: formData.description.trim(),
        category_id: formData.category_id!,
        transaction_type: 'expense',
        date: formData.date,
      };

      await addTransaction(transactionData);
      
      // Clear form after successful submission
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
        <Text>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Input
        label="Amount"
        placeholder="0.00"
        value={formData.amount}
        onChangeText={handleAmountChange}
        keyboardType="numeric"
        leftIcon={{ name: 'attach-money', color: '#2196F3' }}
        errorMessage={errors.amount}
        testID="amount-input"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Description"
        placeholder="Enter expense description"
        value={formData.description}
        onChangeText={handleDescriptionChange}
        leftIcon={{ name: 'description', color: '#2196F3' }}
        errorMessage={errors.description}
        testID="description-input"
        containerStyle={styles.inputContainer}
        maxLength={200}
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Category</Text>
        <View style={styles.pickerWrapper}>
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

      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Date</Text>
        <Button
          title={formatDate(formData.date)}
          onPress={() => setShowDatePicker(true)}
          buttonStyle={styles.dateButton}
          titleStyle={styles.dateButtonText}
          testID="date-picker-button"
        />
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

      <Button
        title="Save Expense"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        buttonStyle={styles.submitButton}
        testID="submit-button"
      />
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
  inputContainer: {
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#86939e',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#ff190c',
    fontSize: 12,
    marginLeft: 10,
    marginTop: 5,
  },
  dateContainer: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    borderColor: '#86939e',
    borderWidth: 1,
    borderRadius: 4,
  },
  dateButtonText: {
    color: '#333',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 12,
  },
});

export default TransactionForm;