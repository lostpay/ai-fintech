import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, ProgressBar, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface BudgetCardProps {
  budget: {
    id: number;
    category_name: string;
    category_color: string;
    category_icon: string;
    amount: number; // Budget amount in cents
    spent_amount: number; // Spent amount in cents
    percentage: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onEdit, onDelete }) => {
  const { theme } = useTheme();

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const progressValue = Math.min(budget.percentage / 100, 1);
  const isOverBudget = budget.percentage > 100;

  const styles = StyleSheet.create({
    card: {
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      elevation: 2,
    },
    cardContent: {
      padding: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: budget.category_color,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    contentContainer: {
      flex: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    amountText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    percentageText: {
      fontSize: 14,
      fontWeight: '600',
      color: isOverBudget ? '#F44336' : theme.colors.onSurface,
    },
    progressContainer: {
      marginBottom: 8,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 4,
    },
    actionButton: {
      marginLeft: 8,
    },
  });

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={onEdit}>
        <View style={styles.cardContent}>
          <View style={styles.row}>
            {/* Category Icon */}
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name={budget.category_icon as any} 
                size={24} 
                color="white" 
              />
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.categoryName}>{budget.category_name}</Text>
              
              <View style={styles.amountRow}>
                <Text style={styles.amountText}>
                  {formatCurrency(budget.spent_amount)}/{formatCurrency(budget.amount)}
                </Text>
                <Text style={styles.percentageText}>{budget.percentage}%</Text>
              </View>

              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progressValue}
                  color={isOverBudget ? '#F44336' : budget.category_color}
                  style={styles.progressBar}
                />
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <IconButton
              icon="edit"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.actionButton}
              onPress={onEdit}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.actionButton}
              onPress={onDelete}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};