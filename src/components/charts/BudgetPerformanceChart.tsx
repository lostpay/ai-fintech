import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
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
  height = 220,
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

  // Prepare data for react-native-chart-kit
  const labels = data.map(d => new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short' }));
  const budgetedData = data.map(d => d.total_budgeted / 100);
  const spentData = data.map(d => d.total_spent / 100);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: budgetedData,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
      },
      {
        data: spentData,
        color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`, // Orange
      },
    ],
    legend: ['Budgeted', 'Actual'],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.chartTitle}>
        Budget vs Actual Spending
      </Text>

      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={height}
        yAxisLabel="$"
        yAxisSuffix=""
        yAxisInterval={1}
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        showValuesOnTopOfBars={false}
        fromZero={true}
        withInnerLines={true}
        withHorizontalLabels={true}
        style={styles.chart}
      />

      {showDetails && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(76, 175, 80, 1)' }]} />
            <Text variant="bodySmall">Budgeted</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 87, 34, 1)' }]} />
            <Text variant="bodySmall">Actual</Text>
          </View>
        </View>
      )}

      {showDetails && data.length > 0 && (
        <View style={styles.indicators}>
          {data.map((item, index) => (
            <View key={index} style={styles.indicatorItem}>
              <Text variant="bodySmall" style={styles.indicatorMonth}>
                {labels[index]}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.indicatorValue,
                  { color: item.budget_utilization > 100 ? '#FF5722' : '#4CAF50' }
                ]}
              >
                {item.budget_utilization.toFixed(0)}%
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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