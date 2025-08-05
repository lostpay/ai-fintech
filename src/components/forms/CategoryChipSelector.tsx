/**
 * CategoryChipSelector Component - Material Design 3 Category Selection
 * Implements Story 2.3 requirements for horizontal scrollable category chips
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Category } from '../../types/Category';

interface CategoryChipSelectorProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number) => void;
  error?: string;
  testID?: string;
}

const CategoryChipSelector: React.FC<CategoryChipSelectorProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  error,
  testID = 'category-chip-selector'
}) => {
  const renderCategoryIcon = (iconName: string) => {
    // Simple icon mapping - in a real app, you'd use a proper icon library
    const iconMap: { [key: string]: string } = {
      'restaurant': '🍽️',
      'directions-car': '🚗',
      'home': '🏠',
      'shopping-cart': '🛒',
      'local-hospital': '🏥',
      'school': '📚',
      'entertainment': '🎬',
      'fitness': '💪',
      'default': '📋'
    };
    
    return iconMap[iconName] || iconMap.default;
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <Text style={[styles.label, error && styles.labelError]}>
        Category
      </Text>
      
      {/* Chips Container */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.chipContainer}>
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  isSelected && { backgroundColor: category.color || '#1976D2' }
                ]}
                onPress={() => onCategorySelect(category.id)}
                testID={`category-chip-${category.id}`}
                accessibilityLabel={`Select ${category.name} category`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {/* Category Icon */}
                <Text style={[
                  styles.chipIcon,
                  isSelected && styles.chipIconSelected
                ]}>
                  {renderCategoryIcon(category.icon || 'default')}
                </Text>
                
                {/* Category Name */}
                <Text style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Helper Text */}
      {!error && (
        <Text style={styles.helperText}>Select a category for your expense</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
    marginLeft: 4,
  },
  labelError: {
    color: '#D32F2F',
  },
  scrollView: {
    marginHorizontal: -4, // Offset container padding
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48, // Touch target requirement
    minWidth: 48,
  },
  chipSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipIconSelected: {
    // Icon color doesn't change since we're using emojis
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CategoryChipSelector;