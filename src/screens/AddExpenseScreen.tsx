/**
 * AddExpenseScreen - Material Design 3 Professional Expense Entry
 * Implements Story 2.3 requirements for Material Design expense form
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated
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
import { useBudgetAlerts } from '../hooks/useBudgetAlerts';
import { DatabaseService } from '../services/DatabaseService';
import { Category } from '../types/Category';
import { BudgetAlert as BudgetAlertType } from '../types/BudgetAlert';
import { useTheme } from '../context/ThemeContext';
import { BudgetAlert } from '../components/alerts/BudgetAlert';

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
  const { theme } = useTheme();
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Success feedback state
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Budget alerts state
  const [showAlerts, setShowAlerts] = useState(false);
  const [currentAlerts, setCurrentAlerts] = useState<BudgetAlertType[]>([]);
  
  // Animation values for alerts overlay
  const slideUpAnim = useRef(new Animated.Value(500)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Database service
  const databaseService = DatabaseService.getInstance();
  
  // Budget alerts hook
  const { alerts } = useBudgetAlerts();
  
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
  // Watch for new alerts after expense submission
  useEffect(() => {
    // Get the most recent alerts (they will be ordered by created_at)
    const recentAlerts = alerts.slice(-3); // Show up to 3 most recent alerts
    
    if (recentAlerts.length > 0 && !loading) {
      // Only show alerts if we're not currently showing success message
      // and there are new alerts that weren't already shown
      const newAlerts = recentAlerts.filter(alert => 
        !currentAlerts.find(existing => existing.id === alert.id)
      );
      
      if (newAlerts.length > 0) {
        setCurrentAlerts(newAlerts);
        setShowAlerts(true);
        
        // Animate alerts in
        Animated.parallel([
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeInAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Auto-hide alerts after 5 seconds unless they're critical
        const hasError = newAlerts.some(alert => alert.severity === 'error');
        if (!hasError) {
          setTimeout(() => {
            animateAlertsOut(() => {
              setShowAlerts(false);
              setCurrentAlerts([]);
            });
          }, 5000);
        }
      }
    }
  }, [alerts, loading, currentAlerts, slideUpAnim, fadeInAnim, backdropOpacity]);

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

    // Note: No cleanup needed for singleton database service
  }, []);

  const handleSubmit = async () => {
    await submitForm();
    // Success/error handling is done in the hook callbacks
  };

  const animateAlertsOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideUpAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animation values for next time
      slideUpAnim.setValue(500);
      fadeInAnim.setValue(0);
      backdropOpacity.setValue(0);
      callback?.();
    });
  };

  const handleAlertAction = (action: string) => {
    // Animate out before navigation
    animateAlertsOut(() => {
      setShowAlerts(false);
      setCurrentAlerts([]);
      
      // Handle different alert actions
      switch (action) {
        case 'view_budget':
          navigation.navigate('Budget' as never);
          break;
        case 'review_overspending':
        case 'review_budget_details':
          navigation.navigate('Budget' as never);
          break;
        case 'view_recent_transactions':
          navigation.navigate('History' as never);
          break;
        default:
          // Default action - navigate to budget screen
          navigation.navigate('Budget' as never);
          break;
      }
    });
  };

  const handleDismissAlert = (alertId: string) => {
    // Remove the specific alert from current alerts
    setCurrentAlerts(prev => prev.filter(alert => alert.id !== alertId));
    
    // If no more alerts, animate out and hide the alert container
    if (currentAlerts.length <= 1) {
      animateAlertsOut(() => {
        setShowAlerts(false);
        setCurrentAlerts([]);
      });
    }
  };

  const handleDismissAllAlerts = () => {
    animateAlertsOut(() => {
      setShowAlerts(false);
      setCurrentAlerts([]);
    });
  };

  if (loadingCategories) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Material Design Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerText, { color: theme.colors.onPrimary }]}>Add Expense</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>Track your spending</Text>
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

      {/* Budget Alerts Display */}
      {showAlerts && currentAlerts.length > 0 && !successVisible && (
        <Animated.View 
          style={[
            styles.alertsOverlay,
            { opacity: backdropOpacity }
          ]}
        >
          <Animated.View 
            style={[
              styles.alertsContainer,
              {
                transform: [{ translateY: slideUpAnim }],
                opacity: fadeInAnim,
              }
            ]}
          >
            <View style={styles.alertsHeader}>
              <Text style={[styles.alertsTitle, { color: theme.colors.onSurface }]}>
                Budget Impact
              </Text>
              <TouchableOpacity
                onPress={handleDismissAllAlerts}
                style={styles.dismissAllButton}
                testID="dismiss-all-alerts"
              >
                <Text style={[styles.dismissAllText, { color: theme.colors.primary }]}>
                  Dismiss All
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.alertsList}
              showsVerticalScrollIndicator={false}
            >
              {currentAlerts.map((alert, index) => (
                <BudgetAlert
                  key={alert.id}
                  alert={alert}
                  variant="compact"
                  animateIn={true}
                  onAction={handleAlertAction}
                  onDismiss={() => handleDismissAlert(alert.id)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

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
    // backgroundColor will be applied dynamically via theme
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
    // color will be applied dynamically via theme
    fontWeight: '500',
  },
  
  // Header - Material Design
  header: {
    // backgroundColor will be applied dynamically via theme
    paddingVertical: 24,
    paddingHorizontal: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  headerText: {
    // color will be applied dynamically via theme
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Roboto', // Material Design typography
    letterSpacing: 0.15,
  },
  headerSubtitle: {
    // color will be applied dynamically via theme
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
  
  // Budget Alerts Overlay
  alertsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  alertsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be applied dynamically via theme
  },
  dismissAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissAllText: {
    fontSize: 14,
    fontWeight: '500',
    // color will be applied dynamically via theme
  },
  alertsList: {
    maxHeight: 400,
  },
});

export default AddExpenseScreen;