import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CartesianChart, Bar } from 'victory-native';
import { CategoryPerformance } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface CategoryBreakdownChartProps {
  data: CategoryPerformance[];
  height?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}


export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
  height = 200,
  showLabels = true,
  showLegend = true,
}) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No category data available
        </Text>
      </View>
    );
  }

  // Prepare data for horizontal bar chart
  const chartData = data.map((category, index) => ({
    category: category.category_name.length > 8 ? category.category_name.substring(0, 8) + '...' : category.category_name,
    amount: category.spent_amount / 100, // Convert cents to dollars
    color: category.category_color,
    fullCategory: category,
  }));

  const totalSpent = chartData.reduce((sum, item) => sum + item.amount, 0);

  const getStatusIcon = (status: CategoryPerformance['status']) => {
    switch (status) {
      case 'under':
        return 'check-circle';
      case 'on_track':
        return 'schedule';
      case 'over':
        return 'error';
      default:
        return 'help';
    }
  };

  const getStatusColor = (status: CategoryPerformance['status']) => {
    switch (status) {
      case 'under':
        return '#4CAF50';
      case 'on_track':
        return theme.colors.primary;
      case 'over':
        return theme.colors.error;
      default:
        return theme.colors.onSurface;
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.chartTitle}>
        Spending by Category
      </Text>

      {/* Total Spent Summary */}
      <View style={styles.totalSummary}>
        <Text variant="bodySmall" style={styles.centerLabel}>Total Spent</Text>
        <Text variant="headlineSmall" style={styles.centerValue}>
          {formatCurrency(totalSpent * 100)}
        </Text>
      </View>

      <View style={styles.chartSection}>
        {/* Horizontal Bar Chart */}
        <CartesianChart
          data={chartData}
          xKey="category"
          yKeys={["amount"]}
          axisOptions={{
            font: {
              size: 10,
              color: theme.colors.onSurface,
            },
            formatYLabel: (value) => formatCurrency(value * 100),
          }}
          chartPressState={{}}
        >
          {({ points, chartBounds }) => (
            <Bar
              points={points.amount}
              color={theme.colors.primary}
              barWidth={20}
              chartBounds={chartBounds}
            />
          )}
        </CartesianChart>

        {/* Legend */}
        {showLegend && (
          <View style={styles.legendContainer}>
            {chartData.map((item, index) => {
              const category = item.fullCategory;
              const percentage = totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0;
              return (
                <View key={index} style={styles.legendItem}>
                  <View style={styles.legendLeft}>
                    <View 
                      style={[
                        styles.legendColor, 
                        { backgroundColor: item.color }
                      ]} 
                    />
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryHeader}>
                        <Text variant="bodyMedium" style={styles.categoryName}>
                          {category.category_name}
                        </Text>
                        <MaterialIcons
                          name={getStatusIcon(category.status) as any}
                          size={16}
                          color={getStatusColor(category.status)}
                        />
                      </View>
                      <Text variant="bodySmall" style={styles.categoryDetails}>
                        {formatCurrency(category.spent_amount)} • {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <Text 
                    variant="bodySmall" 
                    style={[
                      styles.utilizationText,
                      { color: getStatusColor(category.status) }
                    ]}
                  >
                    {category.utilization_percentage.toFixed(0)}% of budget
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Performance Summary */}
      <View style={styles.performanceSummary}>
        <Text variant="titleSmall" style={styles.summaryTitle}>
          Category Performance
        </Text>
        
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text variant="bodySmall" style={styles.performanceLabel}>Under Budget</Text>
            <Text variant="bodyMedium" style={styles.performanceValue}>
              {data.filter(c => c.status === 'under').length}
            </Text>
          </View>
          
          <View style={styles.performanceItem}>
            <MaterialIcons name="schedule" size={20} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.performanceLabel}>On Track</Text>
            <Text variant="bodyMedium" style={styles.performanceValue}>
              {data.filter(c => c.status === 'on_track').length}
            </Text>
          </View>
          
          <View style={styles.performanceItem}>
            <MaterialIcons name="error" size={20} color={theme.colors.error} />
            <Text variant="bodySmall" style={styles.performanceLabel}>Over Budget</Text>
            <Text variant="bodyMedium" style={styles.performanceValue}>
              {data.filter(c => c.status === 'over').length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  chartTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  totalSummary: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  centerLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  centerValue: {
    fontWeight: '700',
  },
  chartSection: {
    alignItems: 'center',
  },
  legendContainer: {
    width: '100%',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryName: {
    fontWeight: '600',
    flex: 1,
  },
  categoryDetails: {
    opacity: 0.7,
  },
  utilizationText: {
    fontWeight: '600',
    fontSize: 12,
  },
  performanceSummary: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  summaryTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
    gap: 4,
  },
  performanceLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  performanceValue: {
    fontWeight: '700',
    fontSize: 16,
  },
});

export default CategoryBreakdownChart;