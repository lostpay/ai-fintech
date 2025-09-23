import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon, ListItem } from 'react-native-elements';
import { TransactionWithCategory } from '../../types/Transaction';
import { formatCurrency, formatCurrencyWithSign } from '../../utils/currency';
import { formatDateWithRelative } from '../../utils/date';
import { TransactionOptionsModal } from '../modals/TransactionOptionsModal';
import { databaseService } from '../../services';

interface RecentTransactionsListProps {
  transactions: TransactionWithCategory[];
  loading?: boolean;
  onViewAll?: () => void;
  onEdit?: (transaction: TransactionWithCategory) => void;
  onRefresh?: () => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  loading = false,
  onViewAll,
  onEdit,
  onRefresh,
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const handleTransactionPress = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction);
    setShowOptionsModal(true);
  };

  const handleEdit = (transaction: TransactionWithCategory) => {
    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await databaseService.deleteTransaction(transactionId);
      Alert.alert('Success', 'Transaction deleted successfully');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Icon
            name="receipt"
            type="material-icons"
            size={48}
            color="#E0E0E0"
          />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>
            Start tracking your expenses by adding your first transaction
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.transactionsList}>
        {transactions.map((transaction, index) => (
          <TouchableOpacity
            key={transaction.id}
            activeOpacity={0.7}
            onPress={() => handleTransactionPress(transaction)}
          >
            <ListItem
              containerStyle={[
                styles.transactionItem,
                index === transactions.length - 1 && styles.lastTransactionItem
              ]}
              Component={View}
            >
            <View style={[styles.categoryIcon, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
              <Icon
                name={transaction.category_icon || 'category'}
                type="material-icons"
                size={20}
                color={transaction.category_color || '#757575'}
              />
            </View>

            <ListItem.Content>
              <ListItem.Title style={styles.transactionDescription}>
                {transaction.description}
              </ListItem.Title>
              <ListItem.Subtitle style={styles.transactionDetails}>
                {transaction.category_name} • {formatDateWithRelative(transaction.date)}
              </ListItem.Subtitle>
            </ListItem.Content>

            <Text style={[
              styles.transactionAmount,
              transaction.transaction_type === 'income'
                ? styles.incomeAmount
                : styles.expenseAmount
            ]}>
              {formatCurrencyWithSign(transaction.amount, transaction.transaction_type)}
            </Text>
            </ListItem>
          </TouchableOpacity>
        ))}
      </View>

      <TransactionOptionsModal
        visible={showOptionsModal}
        transaction={selectedTransaction}
        onClose={() => setShowOptionsModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12, // Material Design 3 rounded corners
    elevation: 2, // Material Design elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Roboto',
    color: '#212121', // Material Design on-surface
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
    color: '#1976D2', // Material Design primary
  },
  transactionsList: {
    paddingHorizontal: 0,
  },
  transactionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: 'transparent',
    minHeight: 48, // Material Design minimum touch target
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
    color: '#212121', // Material Design on-surface
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Roboto',
    color: '#757575', // Material Design secondary text
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
    textAlign: 'right',
  },
  incomeAmount: {
    color: '#4CAF50', // Material Design green
  },
  expenseAmount: {
    color: '#F44336', // Material Design red
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto',
    color: '#757575',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Roboto',
    color: '#424242',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Roboto',
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});