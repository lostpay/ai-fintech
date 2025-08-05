import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { TransactionList } from '../components/lists';
import { TransactionWithCategory } from '../types/Transaction';
import { databaseService } from '../services';

export const HistoryScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      // Load transactions with category information
      const transactionsWithCategories = await databaseService.getTransactionsWithCategories();
      setTransactions(transactionsWithCategories);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = useCallback(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleTransactionPress = useCallback((transaction: TransactionWithCategory) => {
    // TODO: Navigate to transaction details screen in future story
    console.log('Transaction pressed:', transaction.id);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TransactionList
          transactions={transactions}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
          onTransactionPress={handleTransactionPress}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
});