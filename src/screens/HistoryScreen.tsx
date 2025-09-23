import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, SectionList, RefreshControl } from 'react-native';
import { Surface } from 'react-native-paper';
import { TransactionCard } from '../components/lists/TransactionCard';
import { StickyDateHeader } from '../components/lists/StickyDateHeader';
import { EmptyTransactionHistory } from '../components/common/EmptyTransactionHistory';
import { TransactionHistorySearch } from '../components/common/TransactionHistorySearch';
import { LoadingState } from '../components/common/LoadingState';
import { TransactionWithCategory } from '../types/Transaction';
import { Category } from '../types/Category';
import { databaseService } from '../services';
import { useCategories } from '../hooks/useCategories';
import { groupTransactionsByDate, TransactionGroup } from '../utils/dateFormatting';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { categories } = useCategories();
  
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleCategoryFilter = useCallback((categoryId: number | null) => {
    setSelectedCategory(categoryId);
  }, []);

  // Filter transactions based on search term and category
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== null) {
      filtered = filtered.filter(transaction => transaction.category_id === selectedCategory);
    }
    
    return filtered;
  }, [transactions, searchTerm, selectedCategory]);

  // Group transactions by date for section list
  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  const renderTransactionCard = useCallback(({ item }: { item: TransactionWithCategory }) => (
    <TransactionCard
      transaction={item}
      onPress={handleTransactionPress}
    />
  ), [handleTransactionPress]);

  const renderSectionHeader = useCallback(({ section }: { section: TransactionGroup }) => (
    <StickyDateHeader
      date={section.title}
      transactionCount={section.data.length}
    />
  ), []);

  const keyExtractor = useCallback((item: TransactionWithCategory) => item.id.toString(), []);

  // Loading state
  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingState message="Loading transactions..." />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!loading && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyTransactionHistory />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={0}>
        {/* Search and Filter */}
        <TransactionHistorySearch
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedCategory={selectedCategory}
          onCategoryFilter={handleCategoryFilter}
          categories={categories}
          isLoading={loading}
        />
        
        {/* Transaction List */}
        {groupedTransactions.length === 0 && (searchTerm || selectedCategory !== null) ? (
          <View style={styles.noResultsContainer}>
            <EmptyTransactionHistory />
          </View>
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={keyExtractor}
            renderItem={renderTransactionCard}
            renderSectionHeader={renderSectionHeader}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={100}
            initialNumToRender={15}
            windowSize={10}
            stickySectionHeadersEnabled={true}
            style={styles.sectionList}
            contentContainerStyle={styles.sectionListContent}
            testID="transaction-history-list"
          />
        )}
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be applied dynamically via theme
  },
  surface: {
    flex: 1,
    // backgroundColor will be applied dynamically via theme
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingBottom: 20, // Reduced padding since FAB is removed
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});