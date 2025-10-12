import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Text, Searchbar, List, useTheme, Portal, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Category } from '../../types/Category';
import { CategoryService } from '../../services/CategoryService';
import { useDatabaseService } from '../../hooks/useDatabaseService';
import { CategoryIcon } from './CategoryIcon';

interface CategorySelectorProps {
  selectedCategoryId?: number;
  onCategorySelect: (category: Category) => void;
  excludeHidden?: boolean;
  label?: string;
  error?: boolean;
  testID?: string;
}

/**
 * Category selection component with search functionality
 * Used in budget and transaction forms for category selection
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategorySelect,
  excludeHidden = true,
  label = 'Select Category',
  error = false,
  testID = 'category-selector'
}) => {
  const theme = useTheme();

  // Services
  const databaseService = useDatabaseService();
  const categoryService = useMemo(
    () => new CategoryService(databaseService),
    [databaseService]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  /**
   * Load categories from service
   */
  const loadCategories = useCallback(async () => {
    try {
      const allCategories = await categoryService.getCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [categoryService]);

  /**
   * Filter categories based on search and visibility settings
   */
  const filterCategories = useCallback(() => {
    let filtered = categories;

    // Exclude hidden categories if requested
    if (excludeHidden) {
      filtered = filtered.filter(c => !c.is_hidden);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by name, with default categories first
    filtered.sort((a, b) => {
      if (a.is_default !== b.is_default) {
        return a.is_default ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    setFilteredCategories(filtered);
  }, [categories, searchQuery, excludeHidden]);

  /**
   * Load categories on component mount
   */
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /**
   * Filter categories based on search query
   */
  useEffect(() => {
    filterCategories();
  }, [filterCategories]);

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category: Category) => {
    onCategorySelect(category);
    setVisible(false);
    setSearchQuery('');
  };

  /**
   * Open category selector modal
   */
  const openSelector = () => {
    setVisible(true);
    setSearchQuery('');
  };

  /**
   * Close category selector modal
   */
  const closeSelector = () => {
    setVisible(false);
    setSearchQuery('');
  };

  return (
    <View testID={testID}>
      {/* Category Selector Button */}
      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: error ? theme.colors.error : theme.colors.outline },
          error && styles.errorBorder
        ]}
        onPress={openSelector}
        testID={`${testID}-button`}
      >
        <View style={styles.selectedCategory}>
          {selectedCategory ? (
            <>
              <CategoryIcon 
                category={selectedCategory} 
                size={20}
                style={styles.selectedIcon}
              />
              <Text 
                variant="bodyLarge" 
                style={[styles.categoryName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {selectedCategory.name}
              </Text>
            </>
          ) : (
            <>
              <View style={[styles.placeholderIcon, { backgroundColor: theme.colors.outline }]}>
                <MaterialIcons name="category" size={20} color={theme.colors.onSurface} />
              </View>
              <Text 
                variant="bodyLarge" 
                style={[styles.placeholder, { color: theme.colors.onSurfaceVariant }]}
              >
                {label}
              </Text>
            </>
          )}
          <MaterialIcons 
            name="arrow-drop-down" 
            size={24} 
            color={theme.colors.onSurfaceVariant} 
          />
        </View>
      </TouchableOpacity>

      {/* Category Selection Modal */}
      <Portal>
        <Modal
          visible={visible}
          onRequestClose={closeSelector}
          animationType="slide"
          presentationStyle="pageSheet"
          testID={`${testID}-modal`}
        >
          <Surface style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Select Category
              </Text>
              <TouchableOpacity 
                onPress={closeSelector}
                style={styles.closeButton}
                testID={`${testID}-close`}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Search categories..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchbar}
                testID={`${testID}-search`}
              />
            </View>

            {/* Categories List */}
            <ScrollView style={styles.categoriesList}>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <List.Item
                    key={category.id}
                    title={category.name}
                    description={category.is_default ? 'Default category' : 'Custom category'}
                    onPress={() => handleCategorySelect(category)}
                    left={() => (
                      <View style={styles.listIconContainer}>
                        <CategoryIcon category={category} size={20} />
                      </View>
                    )}
                    right={selectedCategoryId === category.id ? 
                      () => <MaterialIcons name="check" size={24} color={theme.colors.primary} />
                      : undefined
                    }
                    style={[
                      styles.categoryItem,
                      selectedCategoryId === category.id && { backgroundColor: theme.colors.primaryContainer }
                    ]}
                    testID={`${testID}-option-${category.id}`}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons 
                    name="search-off" 
                    size={48} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                  <Text 
                    variant="bodyMedium" 
                    style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {searchQuery.trim() 
                      ? `No categories found matching "${searchQuery}"`
                      : 'No categories available'
                    }
                  </Text>
                </View>
              )}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 56,
  },
  errorBorder: {
    borderWidth: 2,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  selectedIcon: {
    marginRight: 12,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    opacity: 0.5,
  },
  categoryName: {
    flex: 1,
    fontWeight: '500',
  },
  placeholder: {
    flex: 1,
  },
  modal: {
    flex: 1,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoriesList: {
    flex: 1,
  },
  listIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
});

export default CategorySelector;