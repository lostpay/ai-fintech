import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Card, 
  Text, 
  ProgressBar, 
  Button, 
  Menu, 
  useTheme,
  Chip 
} from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CategoryPerformance as CategoryPerformanceType } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';

interface CategoryPerformanceProps {
  categories: CategoryPerformanceType[];
}

type SortOption = 'utilization' | 'overspend' | 'consistency' | 'alphabetical';

export const CategoryPerformance: React.FC<CategoryPerformanceProps> = ({ categories }) => {
  const theme = useTheme();
  const [sortBy, setSortBy] = useState<SortOption>('utilization');
  const [menuVisible, setMenuVisible] = useState(false);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      switch (sortBy) {
        case 'utilization':
          return b.utilization_percentage - a.utilization_percentage;
        case 'overspend':
          const aOverspend = Math.max(0, a.spent_amount - a.budgeted_amount);
          const bOverspend = Math.max(0, b.spent_amount - b.budgeted_amount);
          return bOverspend - aOverspend;
        case 'consistency':
          return b.consistency_score - a.consistency_score;
        case 'alphabetical':
          return a.category_name.localeCompare(b.category_name);
        default:
          return 0;
      }
    });
  }, [categories, sortBy]);

  const getPerformanceColor = (category: CategoryPerformanceType) => {
    if (category.status === 'under') return '#4CAF50';
    if (category.status === 'on_track') return theme.colors.primary;
    return theme.colors.error;
  };

  const getTrendIcon = (trend: CategoryPerformanceType['trend']) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'worsening': return 'trending-down';
      default: return 'trending-flat';
    }
  };

  const getTrendColor = (trend: CategoryPerformanceType['trend']) => {
    switch (trend) {
      case 'improving': return '#4CAF50';
      case 'worsening': return theme.colors.error;
      default: return theme.colors.onSurface;
    }
  };

  const getStatusLabel = (status: CategoryPerformanceType['status']) => {
    switch (status) {
      case 'under': return 'Under Budget';
      case 'on_track': return 'On Track';
      case 'over': return 'Over Budget';
      default: return 'Unknown';
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'utilization': return 'Budget Usage';
      case 'overspend': return 'Overspending';
      case 'consistency': return 'Consistency';
      case 'alphabetical': return 'Name (A-Z)';
      default: return 'Budget Usage';
    }
  };

  if (!categories || categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="category" size={48} color={theme.colors.outline} />
        <Text variant="bodyMedium" style={styles.emptyText}>
          No category performance data available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Category Performance
        </Text>
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined" 
              compact
              onPress={() => setMenuVisible(true)}
              icon="sort"
            >
              {getSortLabel(sortBy)}
            </Button>
          }
        >
          <Menu.Item 
            onPress={() => { setSortBy('utilization'); setMenuVisible(false); }} 
            title="Budget Usage" 
            leadingIcon="percent"
          />
          <Menu.Item 
            onPress={() => { setSortBy('overspend'); setMenuVisible(false); }} 
            title="Overspending" 
            leadingIcon="trending-up"
          />
          <Menu.Item 
            onPress={() => { setSortBy('consistency'); setMenuVisible(false); }} 
            title="Consistency" 
            leadingIcon="equalizer"
          />
          <Menu.Item 
            onPress={() => { setSortBy('alphabetical'); setMenuVisible(false); }} 
            title="Name (A-Z)" 
            leadingIcon="sort-alphabetical-ascending"
          />
        </Menu>
      </View>

      <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
        {sortedCategories.map((category) => (
          <Card key={category.category_id} style={styles.categoryCard}>
            <Card.Content>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <View 
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.category_color }
                    ]}
                  >
                    <MaterialIcons
                      name={category.category_icon as any}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.categoryText}>
                    <Text variant="titleMedium" style={styles.categoryName}>
                      {category.category_name}
                    </Text>
                    <View style={styles.categoryMeta}>
                      <Chip
                        mode="outlined"
                        compact
                        style={[
                          styles.statusChip,
                          { 
                            borderColor: getPerformanceColor(category),
                            backgroundColor: 'rgba(0,0,0,0.05)'
                          }
                        ]}
                        textStyle={{ 
                          color: getPerformanceColor(category),
                          fontSize: 10
                        }}
                      >
                        {getStatusLabel(category.status)}
                      </Chip>
                    </View>
                  </View>
                </View>
                
                <View style={styles.trendIndicator}>
                  <MaterialIcons
                    name={getTrendIcon(category.trend) as any}
                    size={20}
                    color={getTrendColor(category.trend)}
                  />
                  <Text 
                    variant="bodySmall" 
                    style={[styles.trendText, { color: getTrendColor(category.trend) }]}
                  >
                    {category.trend}
                  </Text>
                </View>
              </View>

              {/* Progress Section */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text variant="bodySmall" style={styles.progressLabel}>
                    Budget Usage: {category.utilization_percentage.toFixed(0)}%
                  </Text>
                  <Text variant="bodySmall" style={styles.consistencyLabel}>
                    Consistency: {(category.consistency_score * 100).toFixed(0)}%
                  </Text>
                </View>
                
                <ProgressBar
                  progress={Math.min(category.utilization_percentage / 100, 1)}
                  color={getPerformanceColor(category)}
                  style={styles.progressBar}
                />
                
                <View style={styles.amountInfo}>
                  <Text variant="bodySmall">
                    {formatCurrency(category.spent_amount)} of {formatCurrency(category.budgeted_amount)}
                  </Text>
                  {category.spent_amount > category.budgeted_amount && (
                    <Text 
                      variant="bodySmall" 
                      style={[styles.overspend, { color: theme.colors.error }]}
                    >
                      {formatCurrency(category.spent_amount - category.budgeted_amount)} over
                    </Text>
                  )}
                  {category.spent_amount < category.budgeted_amount && (
                    <Text 
                      variant="bodySmall" 
                      style={[styles.underSpend, { color: '#4CAF50' }]}
                    >
                      {formatCurrency(category.budgeted_amount - category.spent_amount)} remaining
                    </Text>
                  )}
                </View>
              </View>

              {category.recommendations && category.recommendations.length > 0 && (
                <View style={styles.recommendations}>
                  <Text variant="labelMedium" style={styles.recommendationsTitle}>
                    Insights:
                  </Text>
                  {category.recommendations.slice(0, 2).map((rec, index) => (
                    <Text key={index} variant="bodySmall" style={styles.recommendation}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Summary Statistics */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Under Budget</Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: '#4CAF50' }]}>
            {categories.filter(c => c.status === 'under').length}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>On Track</Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
            {categories.filter(c => c.status === 'on_track').length}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Over Budget</Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: theme.colors.error }]}>
            {categories.filter(c => c.status === 'over').length}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
  },
  categoriesList: {
    flex: 1,
  },
  categoryCard: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    height: 24,
    borderWidth: 1,
  },
  trendIndicator: {
    alignItems: 'center',
    minWidth: 60,
  },
  trendText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    opacity: 0.7,
  },
  consistencyLabel: {
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  amountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overspend: {
    fontWeight: '600',
  },
  underSpend: {
    fontWeight: '600',
  },
  recommendations: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  recommendationsTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  recommendation: {
    lineHeight: 18,
    marginBottom: 4,
    opacity: 0.8,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '700',
  },
});

export default CategoryPerformance;