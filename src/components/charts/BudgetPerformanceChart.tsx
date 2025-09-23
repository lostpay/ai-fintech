import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryStack } from 'victory-native';
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
  height = 250,
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

  // Prepare data for Victory Native
  const months = data.map(d => new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short' }));
  const budgetedData = data.map((d, i) => ({
    x: i + 1,
    y: d.total_budgeted / 100
  }));
  const spentData = data.map((d, i) => ({
    x: i + 1,
    y: d.total_spent / 100
  }));

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.total_budgeted / 100, d.total_spent / 100))
  );

  return (
    <View style={styles.container}>
      <VictoryChart
        width={screenWidth - 32}
        height={height}
        theme={VictoryTheme.material}
        padding={{ left: 70, top: 20, right: 40, bottom: 60 }}
        domainPadding={{ x: 25 }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(y) => `$${y}`}
          style={{
            tickLabels: { fontSize: 12, padding: 5 },
            grid: { stroke: "#e0e0e0" }
          }}
        />
        <VictoryAxis
          tickFormat={(x) => months[x - 1] || ''}
          style={{
            tickLabels: { fontSize: 12, padding: 5, angle: -45 }
          }}
        />
        <VictoryBar
          data={budgetedData}
          x="x"
          y="y"
          style={{
            data: { fill: "#4CAF50", width: 15 }
          }}
        />
        <VictoryBar
          data={spentData}
          x="x"
          y="y"
          style={{
            data: { fill: "#FF5722", width: 15 }
          }}
        />
      </VictoryChart>

      {showDetails && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text variant="bodySmall">Budgeted</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF5722' }]} />
            <Text variant="bodySmall">Actual</Text>
          </View>
        </View>
      )}

      {showDetails && data.length > 0 && (
        <View style={styles.indicators}>
          {data.map((item, index) => (
            <View key={index} style={styles.indicatorItem}>
              <Text variant="bodySmall" style={styles.indicatorMonth}>
                {months[index]}
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