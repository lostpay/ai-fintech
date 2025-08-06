/**
 * CategoryChipSelector Component - Material Design 3 Category Selection
 * Implements Story 2.3 requirements for horizontal scrollable category chips
 * Updated for Story 3.3 - Enhanced category system with colors and icons
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Category } from '../../types/Category';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme } = useTheme();

  // Filter out hidden default categories
  const visibleCategories = categories.filter(category => 
    !category.is_default || !category.is_hidden
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.colors.onSurface }, error && { color: theme.colors.error }]}>
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
          {visibleCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const chipBackgroundColor = isSelected 
              ? category.color 
              : theme.colors.surfaceVariant;
            const chipBorderColor = isSelected 
              ? category.color 
              : theme.colors.outline;
            const iconColor = isSelected ? '#FFFFFF' : theme.colors.onSurfaceVariant;
            const textColor = isSelected ? '#FFFFFF' : theme.colors.onSurfaceVariant;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: chipBackgroundColor,
                    borderColor: chipBorderColor,
                  },
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => onCategorySelect(category.id)}
                testID={`category-chip-${category.id}`}
                accessibilityLabel={`Select ${category.name} category`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {/* Category Icon */}
                <MaterialIcons
                  name={category.icon as any}
                  size={18}
                  color={iconColor}
                  style={styles.chipIcon}
                />
                
                {/* Category Name */}
                <Text style={[
                  styles.chipText,
                  { color: textColor }
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
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      )}
      
      {/* Helper Text */}
      {!error && (
        <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
          Select a category for your expense
        </Text>
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
    marginBottom: 8,
    marginLeft: 4,
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
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48, // Touch target requirement
    minWidth: 48,
  },
  chipSelected: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CategoryChipSelector;