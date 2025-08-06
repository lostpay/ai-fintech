import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  IconButton,
  HelperText,
  Card
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Category } from '../../types/Category';

interface BudgetFormData {
  category_id: number;
  amount: number;
  period_start: Date;
  period_end: Date;
}

interface BudgetFormProps {
  categories: Category[];
  initialData?: any;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ 
  categories, 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const { theme } = useTheme();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
      const category = categories.find(c => c.id === initialData.category_id);
      setSelectedCategory(category || null);
      setAmount((initialData.amount / 100).toString()); // Convert from cents to dollars
    }
  }, [initialData, categories]);


  // Generate current month period
  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }

    if (!amount.trim()) {
      newErrors.amount = 'Budget amount is required';
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'Please enter a valid amount greater than 0';
      } else if (amountNum > 999999) {
        newErrors.amount = 'Amount cannot exceed $999,999';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { start, end } = getCurrentMonthPeriod();
      const budgetData: BudgetFormData = {
        category_id: selectedCategory!.id,
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        period_start: start,
        period_end: end,
      };

      await onSubmit(budgetData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts[1];
    }
    return cleaned;
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatCurrency(value);
    setAmount(formatted);
    
    // Clear amount error when user starts typing
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    categoryButton: {
      borderWidth: 1,
      borderColor: errors.category ? theme.colors.error : theme.colors.outline,
      borderRadius: 8,
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    categoryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    categoryText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    menuIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 10,
    },
    button: {
      flex: 1,
      marginHorizontal: 8,
    },
    periodInfo: {
      backgroundColor: theme.colors.primaryContainer,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    periodText: {
      fontSize: 14,
      color: theme.colors.onPrimaryContainer,
      textAlign: 'center',
    },
    categoryDropdown: {
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      elevation: 4,
      borderRadius: 8,
      maxHeight: 200,
      zIndex: 3,
      position: 'relative',
    },
    categoryList: {
      paddingVertical: 8,
    },
    categoryDropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    categoryDropdownText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    dropdownOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
    },
  });

  const { start } = getCurrentMonthPeriod();
  const periodText = `${start.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {initialData ? 'Edit Budget' : 'Create Budget'}
        </Text>
        <IconButton
          icon="close"
          size={24}
          onPress={onCancel}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Budget Period Info */}
        <View style={styles.periodInfo}>
          <Text style={styles.periodText}>
            Budget period: {periodText}
          </Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          
          {/* Category Selector Button */}
          <TouchableOpacity
            style={[styles.categoryButton, errors.category ? { borderColor: theme.colors.error } : {}]}
            onPress={() => setCategoryMenuVisible(true)}
          >
            <View style={styles.categoryInfo}>
              {selectedCategory ? (
                <>
                  <View style={[
                    styles.categoryIcon, 
                    { backgroundColor: selectedCategory.color }
                  ]}>
                    <MaterialIcons 
                      name={selectedCategory.icon as any} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <Text style={styles.categoryText}>{selectedCategory.name}</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>Select a category</Text>
              )}
              <MaterialIcons 
                name="expand-more" 
                size={24} 
                color={theme.colors.onSurfaceVariant} 
              />
            </View>
          </TouchableOpacity>

          {/* Category Dropdown */}
          {categoryMenuVisible && (
            <>
              {/* Invisible overlay to dismiss dropdown */}
              <TouchableOpacity
                style={styles.dropdownOverlay}
                onPress={() => setCategoryMenuVisible(false)}
                activeOpacity={1}
              />
              <Card style={styles.categoryDropdown}>
                <ScrollView 
                  style={styles.categoryList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id.toString()}
                      style={styles.categoryDropdownItem}
                      onPress={() => {
                        setSelectedCategory(category);
                        setCategoryMenuVisible(false);
                        if (errors.category) {
                          setErrors(prev => ({ ...prev, category: '' }));
                        }
                      }}
                    >
                      <View style={styles.menuItem}>
                        <View style={[
                          styles.menuIcon, 
                          { backgroundColor: category.color }
                        ]}>
                          <MaterialIcons 
                            name={category.icon as any} 
                            size={12} 
                            color="white" 
                          />
                        </View>
                        <Text style={styles.categoryDropdownText}>{category.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Card>
            </>
          )}
          
          <HelperText type="error" visible={!!errors.category}>
            {errors.category}
          </HelperText>
        </View>

        {/* Budget Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Budget Amount</Text>
          <TextInput
            mode="outlined"
            placeholder="0.00"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon={() => (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>$</Text>
            )} />}
            error={!!errors.amount}
            style={styles.textInput}
          />
          <HelperText type="error" visible={!!errors.amount}>
            {errors.amount}
          </HelperText>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {initialData ? 'Update Budget' : 'Create Budget'}
        </Button>
      </View>
    </SafeAreaView>
  );
};