/**
 * Transaction History Search and Filter Component
 * Story 2.4: Advanced search interface with Material Design
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Searchbar, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
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
          <TouchableOpacity
            onPress={() => onCategoryFilter(null)}
            style={[
              styles.filterChip,
              selectedCategory === null && styles.selectedChip
            ]}
            disabled={isLoading}
            testID="filter-all-categories"
          >
            <MaterialIcons
              name="category"
              size={16}
              color={selectedCategory === null ? '#1D192B' : '#1C1B1F'}
              style={styles.chipIcon}
            />
            <Text style={[
              styles.chipText,
              selectedCategory === null && styles.selectedChipText
            ]}>
              All Categories
            </Text>
          </TouchableOpacity>

          {/* Individual Category Chips */}
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => onCategoryFilter(category.id)}
                style={[
                  styles.filterChip,
                  isSelected && styles.selectedChip,
                  { borderColor: isSelected ? category.color : '#79747E' }
                ]}
                disabled={isLoading}
                testID={`filter-category-${category.id}`}
              >
                <MaterialIcons
                  name={category.icon as any}
                  size={16}
                  color={isSelected ? '#1D192B' : '#1C1B1F'}
                  style={styles.chipIcon}
                />
                <Text style={[
                  styles.chipText,
                  isSelected && styles.selectedChipText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#FFFBFE', // Material Design surface
    borderColor: '#79747E', // Material Design outline
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 32,
  },
  selectedChip: {
    backgroundColor: '#E8DEF8', // Material Design secondary-container
    borderColor: '#6750A4', // Material Design secondary
  },
  chipIcon: {
    marginRight: 8,
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