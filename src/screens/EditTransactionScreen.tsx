import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from 'react-native-elements';

// Form Components
import AmountInput from '../components/forms/AmountInput';
import CategoryChipSelector from '../components/forms/CategoryChipSelector';
import DescriptionInput from '../components/forms/DescriptionInput';
import DatePickerInput from '../components/forms/DatePickerInput';

// Hooks and Services
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useDatabaseService } from '../hooks/useDatabaseService';
import { Category } from '../types/Category';
import { useTheme } from '../context/ThemeContext';

export const EditTransactionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  // Get transaction data from route params
  const transactionData = (route.params as any)?.transaction;

  if (!transactionData) {
    // If no transaction data, go back
    navigation.goBack();
    return null;
  }

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Database service
  const databaseService = useDatabaseService();

  // Form hook with initial data
  const {
    formData,
    errors,
    loading,
    isValid,
    updateField,
    submitForm,
    setFormData
  } = useExpenseForm({
    onSuccess: (message) => {
      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    },
    onError: (message) => {
      Alert.alert('Error', message);
    },
    isEditMode: true,
    transactionId: transactionData.id
  });

  // Load transaction data into form
  useEffect(() => {
    if (transactionData && setFormData) {
      // Ensure date is valid before setting
      const transactionDate = transactionData.date ? new Date(transactionData.date) : new Date();

      setFormData({
        amount: transactionData.amount, // Keep as number (in cents)
        description: transactionData.description,
        categoryId: transactionData.category_id,
        date: transactionDate
      });
    }
  }, [transactionData, setFormData]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        await databaseService.initialize();
        const loadedCategories = await databaseService.getCategories();
        setCategories(loadedCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
        Alert.alert('Error', 'Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon
            name="arrow-back"
            type="material-icons"
            size={24}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.onPrimary }]}>
          Edit Transaction
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Amount Input */}
          <View style={styles.inputSection}>
            <AmountInput
              value={formData.amount || 0}
              onValueChange={(valueInCents) => updateField('amount', valueInCents)}
              error={errors.amount}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <DescriptionInput
              value={formData.description || ''}
              onValueChange={(value) => updateField('description', value)}
              error={errors.description}
            />
          </View>

          {/* Category Selector */}
          <View style={styles.inputSection}>
            <CategoryChipSelector
              categories={categories}
              selectedCategoryId={formData.categoryId || null}
              onCategorySelect={(categoryId) => updateField('categoryId', categoryId)}
              error={errors.categoryId}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.inputSection}>
            <DatePickerInput
              value={formData.date || new Date()}
              onDateChange={(date) => updateField('date', date)}
              error={errors.date}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.colors.outline }]}
              onPress={handleBack}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: theme.colors.primary },
                (!isValid || loading) && styles.disabledButton
              ]}
              onPress={submitForm}
              disabled={!isValid || loading}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  headerSpacer: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
});