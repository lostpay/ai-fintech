import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TransactionWithCategory } from '../../types/Transaction';
import { formatCurrency, formatDate } from '../../utils';

interface TransactionListItemProps {
  transaction: TransactionWithCategory;
  onPress?: (transaction: TransactionWithCategory) => void;
}

const ITEM_HEIGHT = 80;

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onPress,
}) => {
  const isIncome = transaction.transaction_type === 'income';
  const amountColor = isIncome ? '#4CAF50' : '#F44336';
  const amountPrefix = isIncome ? '+' : '-';

  const handlePress = () => {
    onPress?.(transaction);
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
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
          </Text>
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
});

export { ITEM_HEIGHT };