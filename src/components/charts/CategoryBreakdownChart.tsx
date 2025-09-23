import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { VictoryPie, VictoryLabel, VictoryContainer } from 'victory-native';
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
  height = 250,
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

  // Prepare data for pie chart
  const pieData = data.map((category) => ({
    x: category.category_name,
    y: category.spent_amount / 100
  }));

  const totalSpent = data.reduce((sum, item) => sum + (item.spent_amount / 100), 0);

  // Default colors if category colors are not available
  const colors = [
    '#4CAF50', '#2196F3', '#FF5722', '#FFC107',
    '#9C27B0', '#00BCD4', '#795548', '#607D8B'
  ];

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
    <View style={styles.container}>
      <View style={styles.totalSummary}>
        <Text variant="bodySmall" style={styles.centerLabel}>Total Spent</Text>
        <Text variant="headlineSmall" style={styles.centerValue}>
          {formatCurrency(totalSpent * 100)}
        </Text>
      </View>

      <View style={styles.chartSection}>
        <VictoryPie
          data={pieData}
          width={screenWidth - 32}
          height={height}
          innerRadius={60}
          labelRadius={90}
          colorScale={colors}
          labelComponent={
            <VictoryLabel
              style={{
                fontSize: 10,
                fill: "#333333"
              }}
            />
          }
        />
      </View>

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