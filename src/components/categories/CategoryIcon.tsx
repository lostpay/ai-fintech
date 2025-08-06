import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Category } from '../../types/Category';

interface CategoryIconProps {
  category: Category;
  size?: number;
  style?: any;
  testID?: string;
}

/**
 * Reusable category icon component with consistent styling
 * Used across the app for displaying category icons with colors
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 24,
  style,
  testID = `category-icon-${category.id}`
}) => {
  const containerSize = Math.round(size * 1.67); // Icon container is ~1.67x the icon size
  const borderRadius = containerSize / 2;

  return (
    <View 
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius,
          backgroundColor: category.color,
        },
        category.is_hidden && styles.hiddenContainer,
        style,
      ]}
      testID={testID}
    >
      <MaterialIcons
        name={category.icon as any}
        size={size}
        color="#FFFFFF"
        style={category.is_hidden ? styles.hiddenIcon : undefined}
      />
    </View>
  );
};

/**
 * Small category icon variant (16px icon, 24px container)
 */
export const CategoryIconSmall: React.FC<Omit<CategoryIconProps, 'size'>> = (props) => (
  <CategoryIcon {...props} size={16} />
);

/**
 * Medium category icon variant (20px icon, 32px container)
 */
export const CategoryIconMedium: React.FC<Omit<CategoryIconProps, 'size'>> = (props) => (
  <CategoryIcon {...props} size={20} />
);

/**
 * Large category icon variant (32px icon, 48px container)
 */
export const CategoryIconLarge: React.FC<Omit<CategoryIconProps, 'size'>> = (props) => (
  <CategoryIcon {...props} size={32} />
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  hiddenContainer: {
    opacity: 0.5,
  },
  hiddenIcon: {
    opacity: 0.7,
  },
});

export default CategoryIcon;