import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { CategoryPerformance } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface CategoryBreakdownChartProps {
  data: CategoryPerformance[];
  height?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
  height = 220,
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

  const totalSpent = data.reduce((sum, item) => sum + (item.spent_amount / 100), 0);

  // Prepare data for pie chart with distinct colors
  const colors = [
    '#4CAF50', '#2196F3', '#FF5722', '#FFC107',
    '#9C27B0', '#00BCD4', '#795548', '#607D8B'
  ];

  const pieData = data.map((category, index) => ({
    name: category.category_name,
    amount: category.spent_amount / 100,
    color: colors[index % colors.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

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
        return '#2196F3';
      case 'over':
        return '#FF5722';
      default:
        return '#757575';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.totalSummary}>
        <Text variant="bodySmall" style={styles.centerLabel}>Total Spent</Text>
        <Text variant="headlineSmall" style={styles.centerValue}>
          {formatCurrency(totalSpent * 100)}
        </Text>
      </View>

      <Text variant="titleMedium" style={styles.chartTitle}>
        Spending by Category
      </Text>

      <PieChart
        data={pieData}
        width={screenWidth - 32}
        height={height}
        chartConfig={chartConfig}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute={false}
        hasLegend={false}
      />

      {showLegend && (
        <View style={styles.legendContainer}>
          {data.map((category, index) => {
            const percentage = totalSpent > 0 ? (category.spent_amount / 100 / totalSpent) * 100 : 0;
            return (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: colors[index % colors.length] }
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
                      {formatCurrency(category.spent_amount)} • {Math.round(percentage)}%
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
            <MaterialIcons name="schedule" size={20} color="#2196F3" />
            <Text variant="bodySmall" style={styles.performanceLabel}>On Track</Text>
            <Text variant="bodyMedium" style={styles.performanceValue}>
              {data.filter(c => c.status === 'on_track').length}
            </Text>
          </View>

          <View style={styles.performanceItem}>
            <MaterialIcons name="error" size={20} color="#FF5722" />
            <Text variant="bodySmall" style={styles.performanceLabel}>Over Budget</Text>
            <Text variant="bodyMedium" style={styles.performanceValue}>
              {data.filter(c => c.status === 'over').length}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  chartTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
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