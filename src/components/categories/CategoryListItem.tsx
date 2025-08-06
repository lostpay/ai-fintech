import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, IconButton, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Category, CategoryUsageStats } from '../../types/Category';
import { formatCurrency } from '../../utils/currency';

interface CategoryListItemProps {
  category: Category;
  usageStats?: CategoryUsageStats;
  onPress: () => void;
  onToggleVisibility?: () => void;
  testID?: string;
}

/**
 * Category list item component with usage statistics and visibility controls
 * Displays category with icon, color, name, usage stats, and action buttons
 */
export const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  usageStats,
  onPress,
  onToggleVisibility,
  testID = `category-item-${category.id}`
}) => {
  const theme = useTheme();

  /**
   * Format usage statistics for display
   */
  const formatUsageStats = (): string => {
    if (!usageStats || usageStats.transaction_count === 0) {
      return 'Not used yet';
    }
    
    const amount = formatCurrency(usageStats.total_amount);
    const count = usageStats.transaction_count;
    const transactionText = count === 1 ? 'transaction' : 'transactions';
    
    return `${count} ${transactionText} • ${amount} total`;
  };

  /**
   * Get description with last used information
   */
  const getDescription = (): string => {
    const baseStats = formatUsageStats();
    
    if (usageStats?.last_used) {
      const lastUsedDate = new Date(usageStats.last_used).toLocaleDateString();
      return `${baseStats} • Last used ${lastUsedDate}`;
    }
    
    return baseStats;
  };

  return (
    <List.Item
      title={category.name}
      description={getDescription()}
      onPress={onPress}
      testID={testID}
      left={(props) => (
        <View style={styles.iconContainer}>
          <View 
            style={[
              styles.categoryIcon,
              { backgroundColor: category.color },
              category.is_hidden && styles.hiddenIcon
            ]}
          >
            <MaterialIcons
              name={category.icon as any}
              size={24}
              color="#FFFFFF"
              style={category.is_hidden ? styles.hiddenIconContent : undefined}
            />
          </View>
        </View>
      )}
      right={(props) => (
        <View style={styles.rightContainer}>
          {/* Usage indicator for categories with transactions */}
          {usageStats && usageStats.transaction_count > 0 && (
            <View style={styles.usageIndicator}>
              <MaterialIcons 
                name="timeline" 
                size={16} 
                color={theme.colors.primary} 
              />
            </View>
          )}
          
          {/* Default category visibility toggle */}
          {category.is_default && onToggleVisibility && (
            <IconButton
              icon={category.is_hidden ? 'eye-off' : 'eye'}
              size={20}
              onPress={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              style={styles.visibilityButton}
              iconColor={category.is_hidden ? theme.colors.outline : theme.colors.primary}
              testID={`toggle-visibility-${category.id}`}
            />
          )}
          
          {/* Category type indicator */}
          <View style={styles.typeIndicator}>
            {category.is_default && (
              <MaterialIcons 
                name="verified" 
                size={16} 
                color={theme.colors.primary} 
              />
            )}
          </View>
          
          {/* Navigation chevron */}
          <List.Icon {...props} icon="chevron-right" />
        </View>
      )}
      style={[
        styles.listItem,
        category.is_hidden && styles.hiddenCategory,
      ]}
      titleStyle={[
        styles.categoryTitle,
        category.is_hidden && styles.hiddenText
      ]}
      descriptionStyle={[
        styles.categoryDescription,
        category.is_hidden && styles.hiddenText
      ]}
    />
  );
};

const styles = StyleSheet.create({
  listItem: {
    minHeight: 72,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  hiddenCategory: {
    opacity: 0.6,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  hiddenIcon: {
    opacity: 0.5,
  },
  hiddenIconContent: {
    opacity: 0.7,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  usageIndicator: {
    marginRight: 4,
  },
  visibilityButton: {
    margin: 0,
    marginRight: 4,
  },
  typeIndicator: {
    marginRight: 4,
    justifyContent: 'center',
    width: 20,
  },
  categoryTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  categoryDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  hiddenText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
});

export default CategoryListItem;