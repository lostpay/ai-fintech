import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { BarChart, XAxis, YAxis } from 'react-native-svg-charts';
import { Text as SvgText } from 'react-native-svg';
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
    budgeted: month.total_budgeted / 100, // Convert cents to dollars
    spent: month.total_spent / 100,
    month: month.month,
    utilization: month.budget_utilization,
    index,
  }));

  const maxValue = Math.max(...chartData.map(d => Math.max(d.budgeted, d.spent)));

  const budgetedData = chartData.map(d => d.budgeted);
  const spentData = chartData.map(d => d.spent);


  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.chartTitle}>
        Budget vs Actual Spending
      </Text>
      
      <View style={styles.chartWrapper}>
        <View style={styles.yAxisContainer}>
          <YAxis
            data={chartData}
            yAccessor={({ item }) => Math.max(item.budgeted, item.spent)}
            contentInset={{ top: 20, bottom: 20 }}
            svg={{ fontSize: 10, fill: theme.colors.onSurface }}
            formatLabel={(value) => formatCurrency(value * 100)}
            style={styles.yAxis}
          />
        </View>
        
        <View style={styles.chartContent}>
          <View style={{ height, width: screenWidth - 120 }}>
            {/* Budgeted amounts bar chart */}
            <BarChart
              style={StyleSheet.absoluteFill}
              data={budgetedData}
              svg={{ 
                fill: theme.colors.primary, 
                stroke: theme.colors.primary,
                strokeWidth: 1
              }}
              contentInset={{ top: 20, bottom: 20 }}
              spacingInner={0.2}
              spacingOuter={0.1}
            />
            
            {/* Spent amounts bar chart */}
            <BarChart
              style={StyleSheet.absoluteFill}
              data={spentData}
              svg={{ 
                fill: theme.colors.secondary, 
                stroke: theme.colors.secondary,
                strokeWidth: 1
              }}
              contentInset={{ top: 20, bottom: 20 }}
              spacingInner={0.2}
              spacingOuter={0.1}
            />
          </View>
          
          <XAxis
            style={styles.xAxis}
            data={chartData}
            formatLabel={(_, index) => {
              const monthDate = new Date(chartData[index].month + '-01');
              return monthDate.toLocaleDateString('en-US', { month: 'short' });
            }}
            contentInset={{ left: 20, right: 20 }}
            svg={{ fontSize: 10, fill: theme.colors.onSurface }}
          />
        </View>
      </View>
      
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
                {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
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
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  yAxisContainer: {
    width: 60,
  },
  yAxis: {
    width: 60,
  },
  chartContent: {
    flex: 1,
  },
  xAxis: {
    marginTop: 10,
    height: 30,
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