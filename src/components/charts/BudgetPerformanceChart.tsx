import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CartesianChart, Bar } from 'victory-native';
import { MonthlyBudgetPerformance } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';

interface BudgetPerformanceChartProps {
  data: MonthlyBudgetPerformance[];
  height?: number;
  showDetails?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const BudgetPerformanceChart: React.FC<BudgetPerformanceChartProps> = ({
  data,
  height = 200,
  showDetails = true,
}) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No data available for the selected period
        </Text>
      </View>
    );
  }

  const chartData = data.map((month, index) => ({
    month: new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    budgeted: month.total_budgeted / 100, // Convert cents to dollars
    spent: month.total_spent / 100,
    utilization: month.budget_utilization,
  }));

  const maxValue = Math.max(...chartData.map(d => Math.max(d.budgeted, d.spent)));


  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.chartTitle}>
        Budget vs Actual Spending
      </Text>
      
      <CartesianChart
        data={chartData}
        xKey="month"
        yKeys={["budgeted", "spent"]}
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
          <>
            <Bar
              points={points.budgeted}
              color={theme.colors.primary}
              barWidth={20}
              chartBounds={chartBounds}
            />
            <Bar
              points={points.spent}
              color={theme.colors.secondary}
              barWidth={20}
              chartBounds={chartBounds}
            />
          </>
        )}
      </CartesianChart>
      
      {showDetails && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.colors.primary }]} />
            <Text variant="bodySmall">Budgeted</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.colors.secondary }]} />
            <Text variant="bodySmall">Actual</Text>
          </View>
        </View>
      )}

      {/* Performance indicators */}
      {showDetails && chartData.length > 0 && (
        <View style={styles.indicators}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.indicatorItem}>
              <Text variant="bodySmall" style={styles.indicatorMonth}>
                {item.month}
              </Text>
              <Text 
                variant="bodySmall" 
                style={[
                  styles.indicatorValue,
                  { color: item.utilization > 100 ? theme.colors.error : theme.colors.primary }
                ]}
              >
                {item.utilization.toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      )}
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  indicatorItem: {
    alignItems: 'center',
  },
  indicatorMonth: {
    opacity: 0.7,
    marginBottom: 4,
  },
  indicatorValue: {
    fontWeight: '600',
  },
});

export default BudgetPerformanceChart;