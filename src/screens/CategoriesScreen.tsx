import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  FAB, 
  Switch, 
  Divider, 
  List, 
  useTheme,
  Appbar,
  Searchbar 
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Category, CategoryUsageStats } from '../types/Category';
import { categoryService } from '../services/CategoryService';
import { CategoryListItem } from '../components/categories/CategoryListItem';
import { CategoryForm } from '../components/forms/CategoryForm';
import { onCategoryChanged, offCategoryChanged } from '../utils/eventEmitter';

interface CategoriesScreenProps {
  navigation: any;
}

/**
 * Categories management screen with list of default and custom categories
 * Includes search, filter, create, edit, and hide/show functionality
 */
export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const theme = useTheme();

  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [usageStats, setUsageStats] = useState<CategoryUsageStats[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  /**
   * Load categories and usage statistics
   */
  const loadCategories = useCallback(async () => {
    try {
      const [categoriesData, statsData] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getCategoryUsageStats(),
      ]);
      
      setCategories(categoriesData);
      setUsageStats(statsData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    }
  }, []);

  /**
   * Load categories when screen focuses
   */
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  /**
   * Listen for real-time category changes
   */
  useEffect(() => {
    const handleCategoryChange = () => {
      loadCategories();
    };
    
    onCategoryChanged(handleCategoryChange);
    return () => offCategoryChanged(handleCategoryChange);
  }, [loadCategories]);

  /**
   * Filter categories based on search query and visibility settings
   */
  const getFilteredCategories = (categoryList: Category[], includeHidden: boolean = false) => {
    let filtered = categoryList;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by visibility if needed
    if (!includeHidden) {
      filtered = filtered.filter(c => !c.is_hidden);
    }

    return filtered;
  };

  /**
   * Get default categories
   */
  const getDefaultCategories = () => {
    const defaultCategories = categories.filter(c => c.is_default);
    return getFilteredCategories(defaultCategories, showHidden);
  };

  /**
   * Get custom categories
   */
  const getCustomCategories = () => {
    const customCategories = categories.filter(c => !c.is_default);
    return getFilteredCategories(customCategories, true); // Always show custom categories
  };

  /**
   * Handle create new category
   */
  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setShowCategoryForm(true);
  };

  /**
   * Handle edit category
   */
  const handleEditCategory = (category: Category) => {
    if (category.is_default) {
      // Default categories can only toggle visibility
      Alert.alert(
        'Default Category',
        'Default categories cannot be edited, but you can hide them from selection or change their visibility.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: category.is_hidden ? 'Show Category' : 'Hide Category',
            onPress: () => toggleCategoryVisibility(category),
          },
        ]
      );
    } else {
      setEditingCategory(category);
      setShowCategoryForm(true);
    }
  };

  /**
   * Toggle category visibility (for default categories)
   */
  const toggleCategoryVisibility = async (category: Category) => {
    try {
      if (category.is_hidden) {
        await categoryService.showCategory(category.id);
      } else {
        await categoryService.hideCategory(category.id);
      }
    } catch (error) {
      console.error('Failed to toggle category visibility:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update category');
    }
  };

  /**
   * Handle category form save
   */
  const handleCategorySave = (category?: Category) => {
    setShowCategoryForm(false);
    setEditingCategory(undefined);
    // Categories will refresh automatically via event listener
  };

  /**
   * Handle category form cancel
   */
  const handleCategoryCancel = () => {
    setShowCategoryForm(false);
    setEditingCategory(undefined);
  };

  /**
   * Render category list item with usage stats
   */
  const renderCategoryItem = (category: Category) => {
    const stats = usageStats.find(s => s.category_id === category.id);
    
    return (
      <CategoryListItem
        key={category.id}
        category={category}
        usageStats={stats}
        onPress={() => handleEditCategory(category)}
        onToggleVisibility={() => toggleCategoryVisibility(category)}
        testID={`category-item-${category.id}`}
      />
    );
  };

  const defaultCategories = getDefaultCategories();
  const customCategories = getCustomCategories();

  // If showing category form, render it as full screen
  if (showCategoryForm) {
    return (
      <View style={styles.container}>
        <CategoryForm
          mode={editingCategory ? 'edit' : 'create'}
          category={editingCategory}
          onSave={handleCategorySave}
          onCancel={handleCategoryCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App Bar */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Manage Categories" />
        <Appbar.Action icon="plus" onPress={handleCreateCategory} />
      </Appbar.Header>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          testID="category-search"
        />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Custom Categories Section */}
        <List.Section style={styles.section}>
          <List.Subheader style={styles.sectionHeader}>
            Custom Categories ({customCategories.length})
          </List.Subheader>
          
          {customCategories.length > 0 ? (
            customCategories.map(renderCategoryItem)
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {searchQuery.trim() 
                  ? `No custom categories found matching "${searchQuery}"`
                  : 'No custom categories yet. Tap + to create one.'
                }
              </Text>
            </View>
          )}
        </List.Section>
        
        <Divider style={styles.sectionDivider} />
        
        {/* Default Categories Section */}
        <List.Section style={styles.section}>
          <View style={styles.defaultCategoriesHeader}>
            <List.Subheader style={styles.sectionHeader}>
              Default Categories ({defaultCategories.length})
            </List.Subheader>
            <View style={styles.toggleContainer}>
              <Text variant="bodySmall" style={styles.toggleLabel}>Show Hidden</Text>
              <Switch
                value={showHidden}
                onValueChange={setShowHidden}
                testID="show-hidden-toggle"
              />
            </View>
          </View>
          
          {defaultCategories.length > 0 ? (
            defaultCategories.map(renderCategoryItem)
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {searchQuery.trim() 
                  ? `No default categories found matching "${searchQuery}"`
                  : showHidden 
                    ? 'All default categories are currently visible'
                    : 'No visible default categories. Toggle "Show Hidden" to see hidden categories.'
                }
              </Text>
            </View>
          )}
        </List.Section>

        {/* Usage Statistics Info */}
        {usageStats.length > 0 && (
          <View style={styles.statsInfo}>
            <Text variant="bodySmall" style={[styles.statsText, { color: theme.colors.onSurfaceVariant }]}>
              Categories with usage data: {usageStats.filter(s => s.transaction_count > 0).length}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Floating Action Button */}
      <FAB
        icon="plus"
        onPress={handleCreateCategory}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        testID="create-category-fab"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingBottom: 0,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionDivider: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  defaultCategoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 12,
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  statsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statsText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 8,
  },
});

export default CategoriesScreen;