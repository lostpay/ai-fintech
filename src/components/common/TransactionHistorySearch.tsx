/**
 * Transaction History Search and Filter Component
 * Story 2.4: Advanced search interface with Material Design
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Searchbar, Chip, Surface } from 'react-native-paper';
import { Category } from '../../types/Category';

interface TransactionHistorySearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: number | null;
  onCategoryFilter: (categoryId: number | null) => void;
  categories: Category[];
  isLoading?: boolean;
}

export const TransactionHistorySearch: React.FC<TransactionHistorySearchProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryFilter,
  categories,
  isLoading = false,
}) => {
  return (
    <Surface style={styles.searchContainer} elevation={0}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Search transactions..."
        onChangeText={onSearchChange}
        value={searchTerm}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#49454F"
        testID="transaction-search"
      />
      
      {/* Category Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        <View style={styles.filterChips}>
          {/* All Categories Chip */}
          <Chip
            mode={selectedCategory === null ? 'flat' : 'outlined'}
            onPress={() => onCategoryFilter(null)}
            style={[
              styles.filterChip,
              selectedCategory === null && styles.selectedChip
            ]}
            textStyle={[
              styles.chipText,
              selectedCategory === null && styles.selectedChipText
            ]}
            disabled={isLoading}
            testID="filter-all-categories"
          >
            All Categories
          </Chip>
          
          {/* Individual Category Chips */}
          {categories.map((category) => (
            <Chip
              key={category.id}
              mode={selectedCategory === category.id ? 'flat' : 'outlined'}
              onPress={() => onCategoryFilter(category.id)}
              icon={category.icon}
              style={[
                styles.filterChip,
                selectedCategory === category.id && styles.selectedChip
              ]}
              textStyle={[
                styles.chipText,
                selectedCategory === category.id && styles.selectedChipText
              ]}
              disabled={isLoading}
              testID={`filter-category-${category.id}`}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: '#FFFBFE', // Material Design surface
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0EC', // Material Design outline-variant
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F7F2FA', // Material Design surface-container-high
    elevation: 0,
  },
  searchInput: {
    fontSize: 16,
    color: '#1C1B1F', // Material Design on-surface
  },
  filterScroll: {
    maxHeight: 48,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
  },
  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    marginHorizontal: 4,
    backgroundColor: '#FFFBFE', // Material Design surface
    borderColor: '#79747E', // Material Design outline
  },
  selectedChip: {
    backgroundColor: '#E8DEF8', // Material Design secondary-container
    borderColor: '#6750A4', // Material Design secondary
  },
  chipText: {
    fontSize: 14,
    color: '#1C1B1F', // Material Design on-surface
  },
  selectedChipText: {
    color: '#1D192B', // Material Design on-secondary-container
    fontWeight: '500',
  },
});