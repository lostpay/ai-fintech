import React, { useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TransactionWithCategory } from '../../types/Transaction';
import { TransactionListItem, ITEM_HEIGHT } from './TransactionListItem';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onTransactionPress?: (transaction: TransactionWithCategory) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading = false,
  error = null,
  onRefresh,
  onTransactionPress,
}) => {
  // Optimize FlatList performance
  const keyExtractor = useCallback((item: TransactionWithCategory) => item.id.toString(), []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderItem = useCallback(({ item }: { item: TransactionWithCategory }) => (
    <TransactionListItem
      transaction={item}
      onPress={onTransactionPress}
    />
  ), [onTransactionPress]);

  // Loading state
  if (loading && transactions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  // Error state
  if (error && transactions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Error Loading Transactions</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (!loading && transactions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="receipt" size={64} color="#9E9E9E" />
        <Text style={styles.emptyTitle}>No Transactions Yet</Text>
        <Text style={styles.emptyMessage}>
          Start tracking your expenses by adding your first transaction.
        </Text>
      </View>
    );
  }

  // Transaction list
  return (
    <FlatList
      data={transactions}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      onRefresh={onRefresh}
      refreshing={loading}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={100}
      initialNumToRender={10}
      windowSize={10}
      style={styles.list}
      contentContainerStyle={transactions.length === 0 ? styles.emptyList : undefined}
      testID="transaction-list"
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyList: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
});