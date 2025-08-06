import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, ProgressBar, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BudgetProgress } from '../../types/Budget';
import { 
  getBudgetStatusColor, 
  getBudgetStatusText, 
  getBudgetStatusIcon,
  getBudgetStatusBackgroundColor,
  getBudgetStatusTextColor
} from '../../utils/budgetColors';
import { formatCurrency } from '../../utils/currency';

interface BudgetProgressCardProps {
  budgetProgress: BudgetProgress;
  onPress?: () => void;
  variant?: 'full' | 'compact'; // Full for budget screen, compact for dashboard
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({
  budgetProgress,
  onPress,
  variant = 'full',
  showActions = false,
  onEdit,
  onDelete
}) => {
  const { theme } = useTheme();
  
  const statusColor = getBudgetStatusColor(budgetProgress.status, theme);
  const statusText = getBudgetStatusText(budgetProgress.status);
  const statusIcon = getBudgetStatusIcon(budgetProgress.status);
  const statusBackgroundColor = getBudgetStatusBackgroundColor(budgetProgress.status, theme);
  const statusTextColor = getBudgetStatusTextColor(budgetProgress.status, theme);
  
  // Ensure progress doesn't exceed 100% for the progress bar visual
  const progressValue = Math.min(budgetProgress.percentage_used / 100, 1);
  const isOverBudget = budgetProgress.percentage_used > 100;

  const styles = StyleSheet.create({
    card: {
      marginBottom: variant === 'compact' ? 8 : 16,
      backgroundColor: theme.colors.surface,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: statusColor,
    },
    compactCard: {
      marginRight: 16,
      width: 280, // Fixed width for horizontal scrolling
    },
    cardContent: {
      padding: variant === 'compact' ? 12 : 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: variant === 'compact' ? 32 : 40,
      height: variant === 'compact' ? 32 : 40,
      borderRadius: variant === 'compact' ? 16 : 20,
      backgroundColor: budgetProgress.category_color,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    categoryName: {
      fontSize: variant === 'compact' ? 14 : 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
    },
    statusChip: {
      backgroundColor: statusBackgroundColor,
      height: 24,
    },
    statusChipText: {
      color: statusTextColor,
      fontSize: 10,
      fontWeight: '600',
    },
    progressContainer: {
      marginVertical: 8,
    },
    progressBar: {
      height: variant === 'compact' ? 4 : 6,
      borderRadius: variant === 'compact' ? 2 : 3,
      backgroundColor: theme.colors.outline,
    },
    amountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    amountColumn: {
      alignItems: variant === 'compact' ? 'center' : 'flex-start',
    },
    amountLabel: {
      fontSize: variant === 'compact' ? 10 : 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 2,
    },
    amountValue: {
      fontSize: variant === 'compact' ? 12 : 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    remainingAmount: {
      color: isOverBudget ? statusColor : theme.colors.onSurface,
    },
    percentageContainer: {
      alignItems: 'center',
    },
    percentageText: {
      fontSize: variant === 'compact' ? 16 : 18,
      fontWeight: 'bold',
      color: statusColor,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
    },
    actionButton: {
      marginLeft: 8,
    },
    periodText: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 4,
    },
  });

  const CardContent = (
    <View style={styles.cardContent}>
      {/* Header with category and status */}
      <View style={styles.header}>
        <View style={styles.categoryRow}>
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name="category" 
              size={variant === 'compact' ? 16 : 20} 
              color="white" 
            />
          </View>
          <Text style={styles.categoryName} numberOfLines={1}>
            {budgetProgress.category_name}
          </Text>
        </View>
        
        {variant === 'full' && (
          <Chip
            style={styles.statusChip}
            textStyle={styles.statusChipText}
            compact
            icon={statusIcon}
          >
            {statusText}
          </Chip>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={progressValue}
          color={statusColor}
          style={styles.progressBar}
        />
      </View>

      {/* Amounts display */}
      {variant === 'full' ? (
        <View style={styles.amountsRow}>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(budgetProgress.spent_amount)}
            </Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={[styles.amountValue, styles.remainingAmount]}>
              {formatCurrency(budgetProgress.remaining_amount)}
            </Text>
          </View>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>
              {budgetProgress.percentage_used.toFixed(0)}%
            </Text>
          </View>
        </View>
      ) : (
        // Compact view
        <View style={styles.amountsRow}>
          <View style={styles.amountColumn}>
            <Text style={styles.amountValue}>
              {formatCurrency(budgetProgress.spent_amount)} / {formatCurrency(budgetProgress.budgeted_amount)}
            </Text>
          </View>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>
              {budgetProgress.percentage_used.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {/* Period display for compact view */}
      {variant === 'compact' && (
        <Text style={styles.periodText}>
          {budgetProgress.period_start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      )}

      {/* Action buttons */}
      {showActions && variant === 'full' && (onEdit || onDelete) && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name="edit" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name="delete" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Card 
      style={[
        styles.card, 
        variant === 'compact' && styles.compactCard
      ]}
    >
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {CardContent}
        </TouchableOpacity>
      ) : (
        CardContent
      )}
    </Card>
  );
};