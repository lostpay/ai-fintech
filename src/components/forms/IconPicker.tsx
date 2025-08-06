import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Chip, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

// Categorized icon collection for expenses and categories
export const CATEGORY_ICONS = {
  finance: [
    'account-balance-wallet', 'attach-money', 'payment', 'credit-card',
    'account-balance', 'savings', 'trending-up', 'pie-chart'
  ],
  food: [
    'restaurant', 'local-dining', 'local-pizza', 'local-cafe',
    'local-bar', 'cake', 'fastfood', 'kitchen'
  ],
  transport: [
    'directions-car', 'directions-bus', 'directions-subway', 'local-taxi',
    'flight', 'train', 'motorcycle', 'directions-bike'
  ],
  shopping: [
    'shopping-cart', 'shopping-bag', 'store', 'local-mall',
    'local-grocery-store', 'card-giftcard', 'redeem', 'storefront'
  ],
  entertainment: [
    'movie', 'music-note', 'videogame-asset', 'sports-esports',
    'theater-comedy', 'casino', 'celebration', 'party-mode'
  ],
  health: [
    'local-hospital', 'local-pharmacy', 'fitness-center', 'spa',
    'healing', 'medical-services', 'health-and-safety', 'psychology'
  ],
  utilities: [
    'flash-on', 'water-drop', 'wifi', 'phone',
    'tv', 'router', 'cable', 'home'
  ],
  general: [
    'category', 'label', 'bookmark', 'star',
    'work', 'school', 'business', 'folder'
  ]
} as const;

type IconCategory = keyof typeof CATEGORY_ICONS;

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  selectedColor?: string;
  testID?: string;
}

/**
 * Icon selection component with searchable grid and category filtering
 * Uses Material Design icons from @expo/vector-icons
 */
export const IconPicker: React.FC<IconPickerProps> = ({ 
  selectedIcon, 
  onIconSelect, 
  selectedColor = '#1976D2',
  testID = 'icon-picker'
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory>('finance');

  /**
   * Filter icons based on search query and selected category
   */
  const filteredIcons = useMemo(() => {
    const categoryIcons = CATEGORY_ICONS[selectedCategory];
    if (!searchQuery.trim()) return categoryIcons;
    
    return categoryIcons.filter(icon => 
      icon.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [selectedCategory, searchQuery]);

  /**
   * Get all icons for search across categories
   */
  const allIcons = useMemo(() => {
    return Object.values(CATEGORY_ICONS).flat();
  }, []);

  /**
   * Global search across all categories
   */
  const globalFilteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return allIcons.filter(icon => 
      icon.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allIcons]);

  /**
   * Get display icons - either category filtered or global search results
   */
  const displayIcons = searchQuery.trim() ? globalFilteredIcons : filteredIcons;

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category: IconCategory) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when switching categories
  };

  /**
   * Handle search input
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Select Category Icon
      </Text>
      
      {/* Search Input */}
      <TextInput
        label="Search Icons"
        value={searchQuery}
        onChangeText={handleSearchChange}
        left={<TextInput.Icon icon="magnify" />}
        style={styles.searchInput}
        testID="icon-search-input"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      
      {/* Category Tabs - Only show when not searching */}
      {!searchQuery.trim() && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryTabs}
          testID="icon-category-tabs"
        >
          {Object.keys(CATEGORY_ICONS).map((category) => (
            <Chip
              key={category}
              selected={selectedCategory === category}
              onPress={() => handleCategorySelect(category as IconCategory)}
              style={[
                styles.categoryChip,
                selectedCategory === category && { backgroundColor: theme.colors.primaryContainer }
              ]}
              textStyle={[
                selectedCategory === category && { color: theme.colors.onPrimaryContainer }
              ]}
              testID={`icon-category-${category}`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Chip>
          ))}
        </ScrollView>
      )}
      
      {/* Search Results Info */}
      {searchQuery.trim() && (
        <Text variant="bodySmall" style={styles.searchInfo}>
          Found {displayIcons.length} icon{displayIcons.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
        </Text>
      )}
      
      {/* Icon Grid */}
      <ScrollView style={styles.iconScrollView} testID="icon-grid-container">
        <View style={styles.iconGrid}>
          {displayIcons.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconOption,
                selectedIcon === iconName && [
                  styles.selectedIcon,
                  { borderColor: selectedColor }
                ],
              ]}
              onPress={() => onIconSelect(iconName)}
              accessibilityLabel={`Select ${iconName.replace(/-/g, ' ')} icon`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedIcon === iconName }}
              testID={`icon-${iconName}`}
            >
              <MaterialIcons
                name={iconName as any}
                size={28}
                color={selectedIcon === iconName ? selectedColor : theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Empty State */}
        {displayIcons.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name="search-off" 
              size={48} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {searchQuery.trim() 
                ? 'No icons found matching "' + searchQuery + '"'
                : 'No icons in this category'
              }
            </Text>
            {searchQuery.trim() && (
              <Text variant="bodySmall" style={[styles.emptyHint, { color: theme.colors.onSurfaceVariant }]}>
                Try a different search term or browse categories above
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Selected Icon Preview */}
      <View style={styles.previewSection}>
        <Text variant="bodyMedium">Selected Icon:</Text>
        <View style={[styles.iconPreview, { backgroundColor: selectedColor }]}>
          <MaterialIcons
            name={selectedIcon as any}
            size={32}
            color="#FFFFFF"
          />
        </View>
        <Text variant="bodySmall" style={styles.iconName}>
          {selectedIcon.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  searchInput: {
    marginBottom: 16,
  },
  categoryTabs: {
    marginBottom: 16,
    flexGrow: 0,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  searchInfo: {
    marginBottom: 12,
    paddingHorizontal: 4,
    opacity: 0.7,
  },
  iconScrollView: {
    flex: 1,
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  previewSection: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  iconPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  iconName: {
    textAlign: 'center',
    opacity: 0.7,
    fontWeight: '500',
  },
});

export default IconPicker;