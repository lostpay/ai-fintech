import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useBudgetProgress } from '../../hooks/useBudgetProgress';
import { BudgetProgressCard } from '../budget/BudgetProgressCard';
import { BudgetProgressSkeleton } from '../budget/BudgetProgressSkeleton';
import { 
  isHighPriorityBudget 
} from '../../utils/budgetColors';
import { formatCurrency } from '../../utils/currency';

interface BudgetSummaryProps {
  maxItems?: number; // Maximum number of budget cards to show
  showUnbudgeted?: boolean;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  maxItems, // No default limit
  showUnbudgeted = true
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const { 
    budgetProgress, 
    unbudgetedSpending, 
    loading, 
    error, 
    lastUpdated 
  } = useBudgetProgress();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 24,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: 16,
      elevation: 2,
    },
    cardContent: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    viewAllButton: {
      marginTop: -4,
    },
    alertsContainer: {
      marginBottom: 12,
    },
    alertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    overBudgetAlert: {
      backgroundColor: theme.colors.errorContainer || '#FFEBEE',
    },
    approachingAlert: {
      backgroundColor: (theme.colors as any).warningContainer || '#FFF3E0',
    },
    alertIcon: {
      marginRight: 8,
    },
    alertText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    overBudgetAlertText: {
      color: theme.colors.onErrorContainer || '#B71C1C',
    },
    approachingAlertText: {
      color: (theme.colors as any).onWarningContainer || '#E65100',
    },
    progressScrollView: {
      marginBottom: 12,
    },
    progressList: {
      paddingRight: 16,
    },
    unbudgetedContainer: {
      marginTop: 8,
    },
    unbudgetedTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    unbudgetedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    unbudgetedCategory: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    unbudgetedAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    errorContainer: {
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      fontSize: 14,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontSize: 14,
    },
    lastUpdatedText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  // Calculate alert statistics
  const overBudgetBudgets = budgetProgress.filter(bp => bp.status === 'over');
  const approachingBudgets = budgetProgress.filter(bp => bp.status === 'approaching');
  const totalUnbudgetedAmount = unbudgetedSpending.reduce((sum, spending) => sum + spending.spent_amount, 0);

  const navigateToBudgetScreen = () => {
    navigation.navigate('Budget' as never);
  };

  const renderAlerts = () => {
    if (overBudgetBudgets.length === 0 && approachingBudgets.length === 0) {
      return null;
    }

    return (
      <View style={styles.alertsContainer}>
        {overBudgetBudgets.length > 0 && (
          <TouchableOpacity 
            style={[styles.alertRow, styles.overBudgetAlert]}
            onPress={navigateToBudgetScreen}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="error" 
              size={16} 
              color={theme.colors.onErrorContainer || '#B71C1C'}
              style={styles.alertIcon}
            />
            <Text style={[styles.alertText, styles.overBudgetAlertText]}>
              {overBudgetBudgets.length} budget{overBudgetBudgets.length > 1 ? 's' : ''} over limit
            </Text>
          </TouchableOpacity>
        )}
        
        {approachingBudgets.length > 0 && (
          <TouchableOpacity 
            style={[styles.alertRow, styles.approachingAlert]}
            onPress={navigateToBudgetScreen}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="warning" 
              size={16} 
              color={(theme.colors as any).onWarningContainer || '#E65100'}
              style={styles.alertIcon}
            />
            <Text style={[styles.alertText, styles.approachingAlertText]}>
              {approachingBudgets.length} budget{approachingBudgets.length > 1 ? 's' : ''} approaching limit
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBudgetProgress = () => {
    if (budgetProgress.length === 0) {
      return null;
    }

    // Show high priority budgets first, then others
    const priorityBudgets = budgetProgress.filter(bp => isHighPriorityBudget(bp.percentage_used));
    const regularBudgets = budgetProgress.filter(bp => !isHighPriorityBudget(bp.percentage_used));
    const displayBudgets = maxItems ? [...priorityBudgets, ...regularBudgets].slice(0, maxItems) : [...priorityBudgets, ...regularBudgets];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.progressScrollView}
        contentContainerStyle={styles.progressList}
      >
        {displayBudgets.map((budget) => (
          <BudgetProgressCard
            key={budget.budget_id}
            budgetProgress={budget}
            variant="compact"
            onPress={navigateToBudgetScreen}
          />
        ))}
      </ScrollView>
    );
  };

  const renderUnbudgetedSpending = () => {
    if (!showUnbudgeted || unbudgetedSpending.length === 0) {
      return null;
    }

    // Show top 3 unbudgeted spending categories
    const topUnbudgetedSpending = unbudgetedSpending.slice(0, 3);

    return (
      <View style={styles.unbudgetedContainer}>
        <Text style={styles.unbudgetedTitle}>
          Unbudgeted Spending: {formatCurrency(totalUnbudgetedAmount)}
        </Text>
        {topUnbudgetedSpending.map((spending) => (
          <View key={spending.category_id} style={styles.unbudgetedRow}>
            <Text style={styles.unbudgetedCategory}>
              {spending.category_name}
            </Text>
            <Text style={styles.unbudgetedAmount}>
              {formatCurrency(spending.spent_amount)}
            </Text>
          </View>
        ))}
        {unbudgetedSpending.length > 3 && (
          <TouchableOpacity onPress={navigateToBudgetScreen}>
            <Text style={[styles.unbudgetedCategory, { textAlign: 'center', fontStyle: 'italic' }]}>
              +{unbudgetedSpending.length - 3} more categories
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Card style={styles.summaryCard}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Budget Overview</Text>
              <Button 
                mode="text" 
                onPress={navigateToBudgetScreen}
                compact
                style={styles.viewAllButton}
              >
                View All
              </Button>
            </View>
            <BudgetProgressSkeleton variant="compact" count={3} />
          </View>
        </Card>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <Card style={styles.summaryCard}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Budget Overview</Text>
              <Button 
                mode="text" 
                onPress={navigateToBudgetScreen}
                compact
                style={styles.viewAllButton}
              >
                View All
              </Button>
            </View>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  }

  // Show empty state
  if (budgetProgress.length === 0 && unbudgetedSpending.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.summaryCard}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Budget Overview</Text>
              <Button 
                mode="text" 
                onPress={navigateToBudgetScreen}
                compact
                style={styles.viewAllButton}
              >
                Create Budget
              </Button>
            </View>
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name="account-balance-wallet" 
                size={48} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text style={styles.emptyText}>
                No budgets created yet. Tap &quot;Create Budget&quot; to get started.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <View style={styles.cardContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Budget Overview</Text>
            <Button 
              mode="text" 
              onPress={navigateToBudgetScreen}
              compact
              style={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          
          {renderAlerts()}
          {renderBudgetProgress()}
          {renderUnbudgetedSpending()}
          
          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </Card>
    </View>
  );
};