import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { BudgetProgress, UnbudgetedSpending } from '../../types/Budget';
import { BudgetProgressCard } from './BudgetProgressCard';
import { BudgetProgressSkeleton } from './BudgetProgressSkeleton';
import { formatCurrency } from '../../utils/currency';

interface BudgetProgressListProps {
  budgetProgress: BudgetProgress[];
  unbudgetedSpending?: UnbudgetedSpending[];
  loading?: boolean;
  error?: string | null;
  variant?: 'full' | 'compact';
  horizontal?: boolean;
  showActions?: boolean;
  showUnbudgeted?: boolean;
  onBudgetPress?: (budget: BudgetProgress) => void;
  onBudgetEdit?: (budget: BudgetProgress) => void;
  onBudgetDelete?: (budget: BudgetProgress) => void;
  emptyMessage?: string;
}

export const BudgetProgressList: React.FC<BudgetProgressListProps> = ({
  budgetProgress,
  unbudgetedSpending = [],
  loading = false,
  error = null,
  variant = 'full',
  horizontal = false,
  showActions = false,
  showUnbudgeted = false,
  onBudgetPress,
  onBudgetEdit,
  onBudgetDelete,
  emptyMessage = 'No budgets found'
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      paddingHorizontal: horizontal ? 16 : 0,
    },
    errorContainer: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      fontSize: 16,
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontSize: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 12,
      marginTop: variant === 'full' ? 16 : 0,
      paddingHorizontal: horizontal ? 0 : 16,
    },
    unbudgetedCard: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginBottom: 16,
      marginHorizontal: horizontal ? 0 : 16,
      borderRadius: 12,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.outline,
    },
    unbudgetedHeader: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    unbudgetedItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    unbudgetedCategory: {
      fontSize: 14,
      color: theme.colors.onSurface,
      flex: 1,
    },
    unbudgetedAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    horizontalContent: {
      paddingRight: 16, // Extra padding at the end for horizontal scroll
    },
  });

  // Show loading skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        {horizontal ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <BudgetProgressSkeleton variant={variant} count={3} />
          </ScrollView>
        ) : (
          <View>
            <BudgetProgressSkeleton variant={variant} count={5} />
          </View>
        )}
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Show empty state
  if (budgetProgress.length === 0 && unbudgetedSpending.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const renderBudgetCards = () => {
    return budgetProgress.map((budget) => (
      <BudgetProgressCard
        key={budget.budget_id}
        budgetProgress={budget}
        variant={variant}
        showActions={showActions}
        onPress={() => onBudgetPress?.(budget)}
        onEdit={() => onBudgetEdit?.(budget)}
        onDelete={() => onBudgetDelete?.(budget)}
      />
    ));
  };

  const renderUnbudgetedSpending = () => {
    if (!showUnbudgeted || unbudgetedSpending.length === 0) {
      return null;
    }

    return (
      <>
        <Text style={styles.sectionTitle}>Unbudgeted Spending</Text>
        <View style={styles.unbudgetedCard}>
          <Text style={styles.unbudgetedHeader}>Categories without budgets</Text>
          {unbudgetedSpending.map((spending) => (
            <View key={spending.category_id} style={styles.unbudgetedItem}>
              <Text style={styles.unbudgetedCategory}>
                {spending.category_name} ({spending.transaction_count} transactions)
              </Text>
              <Text style={styles.unbudgetedAmount}>
                {formatCurrency(spending.spent_amount)}
              </Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  if (horizontal) {
    return (
      <View style={styles.container}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContainer, styles.horizontalContent]}
        >
          {renderBudgetCards()}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {budgetProgress.length > 0 && (
          <>
            {variant === 'full' && (
              <Text style={styles.sectionTitle}>Budget Progress</Text>
            )}
            {renderBudgetCards()}
          </>
        )}
        {renderUnbudgetedSpending()}
      </ScrollView>
    </View>
  );
};