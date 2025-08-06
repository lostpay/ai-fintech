import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TransactionWithCategory } from '../../types/Transaction';
import { BudgetImpact } from '../../types/BudgetAlert';
import { formatCurrency, formatDate } from '../../utils';

interface TransactionListItemProps {
  transaction: TransactionWithCategory;
  budgetImpact?: BudgetImpact;
  showBudgetImpact?: boolean;
  onPress?: (transaction: TransactionWithCategory) => void;
}

const ITEM_HEIGHT = 80;

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  budgetImpact,
  showBudgetImpact = false,
  onPress,
}) => {
  const isIncome = transaction.transaction_type === 'income';
  const amountColor = isIncome ? '#4CAF50' : '#F44336';
  const amountPrefix = isIncome ? '+' : '-';

  const handlePress = () => {
    onPress?.(transaction);
  };

  const getBudgetImpactIndicator = () => {
    if (!budgetImpact || !showBudgetImpact || transaction.transaction_type !== 'expense') {
      return null;
    }
    
    const statusChanged = budgetImpact.budget_before.status !== budgetImpact.budget_after.status;
    const hasAlerts = budgetImpact.alerts_triggered.length > 0;
    
    if (!statusChanged && !hasAlerts) return null;
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'under': return '#4CAF50';
        case 'approaching': return '#FF9800';
        case 'over': return '#F44336';
        default: return '#757575';
      }
    };

    const getImpactIcon = () => {
      if (hasAlerts) {
        const severity = budgetImpact.alerts_triggered[0]?.severity;
        if (severity === 'error') return 'error';
        if (severity === 'warning') return 'warning';
      }
      return 'trending-up';
    };
    
    const impactColor = getStatusColor(budgetImpact.budget_after.status);
    
    return (
      <View style={styles.budgetImpactIndicator}>
        <MaterialIcons
          name={getImpactIcon() as any}
          size={12}
          color={impactColor}
        />
        <Text 
          style={[styles.budgetImpactText, { color: impactColor }]}
          numberOfLines={1}
        >
          Budget impact
        </Text>
      </View>
    );
  };

  const getBudgetStatusChange = () => {
    if (!budgetImpact || !showBudgetImpact || transaction.transaction_type !== 'expense') {
      return null;
    }

    const { budget_before, budget_after } = budgetImpact;
    
    if (budget_before.status === budget_after.status) return null;

    const statusMessages = {
      'under_to_approaching': 'Budget now approaching limit',
      'under_to_over': 'Budget now over limit',
      'approaching_to_over': 'Budget now over limit',
    };

    const statusKey = `${budget_before.status}_to_${budget_after.status}` as keyof typeof statusMessages;
    const message = statusMessages[statusKey];

    if (!message) return null;

    return (
      <Text style={styles.budgetStatusChange} numberOfLines={1}>
        {message}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`transaction-item-${transaction.id}`}
    >
      <View style={styles.content}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: transaction.category_color }]}>
          <MaterialIcons
            name={transaction.category_icon as any}
            size={24}
            color="white"
          />
        </View>

        {/* Transaction Details */}
        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <View style={styles.metadata}>
            <Text style={styles.category}>{transaction.category_name}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.date}>{formatDate(transaction.date)}</Text>
          </View>
          {getBudgetStatusChange()}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
          </Text>
          {getBudgetImpactIndicator()}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E0E0E0',
    borderBottomWidth: 1,
    height: ITEM_HEIGHT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    color: '#757575',
  },
  separator: {
    fontSize: 14,
    color: '#BDBDBD',
    marginHorizontal: 6,
  },
  date: {
    fontSize: 14,
    color: '#757575',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetImpactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  budgetImpactText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  budgetStatusChange: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
  },
});

export { ITEM_HEIGHT };