/**
 * AddExpenseScreen - Material Design 3 Professional Expense Entry
 * Implements Story 2.3 requirements for Material Design expense form
 */

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Material Design Components
import AmountInput from '../components/forms/AmountInput';
import CategoryChipSelector from '../components/forms/CategoryChipSelector';
import DescriptionInput from '../components/forms/DescriptionInput';
import DatePickerInput from '../components/forms/DatePickerInput';

// Hooks and Services
import { useExpenseForm } from '../hooks/useExpenseForm';
import { DatabaseService } from '../services/DatabaseService';
import { Category } from '../types/Category';

// Success Feedback Component
interface SuccessFeedbackProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({ visible, message, onDismiss }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.successContainer}>
      <View style={styles.successCard}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successText}>{message}</Text>
      </View>
    </View>
  );
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AddExpenseScreenProps {}

export const AddExpenseScreen: React.FC<AddExpenseScreenProps> = () => {
  const navigation = useNavigation();
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Success feedback state
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Database service
  const [databaseService] = useState(() => new DatabaseService());
  
  // Form hook with success/error handlers
  const {
    formData,
    errors,
    loading,
    isValid,
    updateField,
    submitForm
  } = useExpenseForm({
    onSuccess: (message) => {
      setSuccessMessage(message);
      setSuccessVisible(true);
      
      // Navigate back after showing success message
      setTimeout(() => {
        setSuccessVisible(false);
        navigation.goBack();
      }, 1500);
    },
    onError: (message) => {
      Alert.alert('Error', message);
    }
  });

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        await databaseService.initialize();
        const loadedCategories = await databaseService.getCategories();
        setCategories(loadedCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
        Alert.alert('Error', 'Failed to load categories. Please restart the app.');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();

    // Cleanup
    return () => {
      databaseService.close();
    };
  }, [databaseService]);

  const handleSubmit = async () => {
    await submitForm();
    // Success/error handling is done in the hook callbacks
  };

  if (loadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Material Design Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Add Expense</Text>
        <Text style={styles.headerSubtitle}>Track your spending</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Container */}
          <View style={styles.formContainer}>
            
            {/* Amount Input */}
            <AmountInput
              value={formData.amount || 0}
              onValueChange={(amount) => updateField('amount', amount)}
              error={errors.amount}
              testID="amount-input"
            />

            {/* Category Selection */}
            <CategoryChipSelector
              categories={categories}
              selectedCategoryId={formData.categoryId || null}
              onCategorySelect={(categoryId) => updateField('categoryId', categoryId)}
              error={errors.categoryId}
              testID="category-selector"
            />

            {/* Description Input */}
            <DescriptionInput
              value={formData.description || ''}
              onValueChange={(description) => updateField('description', description)}
              error={errors.description}
              maxLength={100}
              testID="description-input"
            />

            {/* Date Picker */}
            <DatePickerInput
              value={formData.date || new Date()}
              onDateChange={(date) => updateField('date', date)}
              error={errors.date}
              testID="date-picker"
            />

            {/* Save Button - Material Design Elevated Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isValid || loading) && styles.saveButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
              testID="save-button"
              accessibilityLabel="Save expense"
              accessibilityHint="Tap to save your expense"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonIcon}>💰</Text>
                  <Text style={styles.saveButtonText}>Save Expense</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Form Status Indicator */}
            {Object.keys(errors).length > 0 && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  Please fix the errors above to continue
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Feedback Overlay */}
      <SuccessFeedback
        visible={successVisible}
        message={successMessage}
        onDismiss={() => setSuccessVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Material Design background
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Header - Material Design
  header: {
    backgroundColor: '#1976D2', // Material Design Primary
    paddingVertical: 24,
    paddingHorizontal: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Roboto', // Material Design typography
    letterSpacing: 0.15,
  },
  headerSubtitle: {
    color: '#E3F2FD',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: 0.25,
  },
  
  // Keyboard Avoiding View
  keyboardView: {
    flex: 1,
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32, // Extra space at bottom
  },
  
  // Form Container - Material Design 8dp grid system
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    gap: 16, // Material Design spacing
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  // Save Button - Material Design Elevated Button
  saveButton: {
    backgroundColor: '#1976D2',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48, // Touch target requirement
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#9E9E9E',
    elevation: 0,
    shadowOpacity: 0,
  },
  saveButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Status Container
  statusContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Success Feedback Overlay
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AddExpenseScreen;