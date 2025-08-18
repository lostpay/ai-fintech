import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CartesianChart, Line } from 'victory-native';
import { SpendingTrend } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface SpendingTrendChartProps {
  data: SpendingTrend[];
  height?: number;
  showTrendIndicators?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  data,
  height = 200,
  showTrendIndicators = true,
}) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No spending trend data available
        </Text>
      </View>
    );
  }

  const chartData = data.map((trend, index) => ({
    month: new Date(trend.period + '-01').toLocaleDateString('en-US', { month: 'short' }),
    amount: trend.amount / 100, // Convert cents to dollars
    period: trend.period,
    trend_direction: trend.trend_direction,
    change_percentage: trend.change_percentage,
  }));
  
  const maxValue = Math.max(...chartData.map(d => d.amount));
  const minValue = Math.min(...chartData.map(d => d.amount));

  const getTrendIcon = (direction: SpendingTrend['trend_direction']) => {
    switch (direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  const getTrendColor = (direction: SpendingTrend['trend_direction']) => {
    switch (direction) {
      case 'up':
        return theme.colors.error;
      case 'down':
        return '#4CAF50';
      default:
        return theme.colors.onSurface;
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.chartTitle}>
        Spending Trends
      </Text>
      
      <CartesianChart
        data={chartData}
        xKey="month"
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
          <Line
            points={points.amount}
            color={theme.colors.primary}
            strokeWidth={2}
            chartBounds={chartBounds}
          />
        )}
      </CartesianChart>

      {/* Trend indicators */}
      {showTrendIndicators && (
        <View style={styles.trendIndicators}>
          <Text variant="labelMedium" style={styles.trendTitle}>
            Monthly Changes:
          </Text>
          <View style={styles.trendList}>
            {chartData.slice(1).map((trend, index) => (
              <View key={index} style={styles.trendItem}>
                <MaterialIcons
                  name={getTrendIcon(trend.trend_direction) as any}
                  size={16}
                  color={getTrendColor(trend.trend_direction)}
                />
                <Text 
                  variant="bodySmall" 
                  style={[
                    styles.trendText,
                    { color: getTrendColor(trend.trend_direction) }
                  ]}
                >
                  {trend.change_percentage >= 0 ? '+' : ''}{trend.change_percentage.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Summary stats */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Average</Text>
          <Text variant="bodyMedium" style={styles.statValue}>
            {formatCurrency(chartData.reduce((sum, item) => sum + item.amount, 0) / chartData.length * 100)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Highest</Text>
          <Text variant="bodyMedium" style={styles.statValue}>
            {formatCurrency(maxValue * 100)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Lowest</Text>
          <Text variant="bodyMedium" style={styles.statValue}>
            {formatCurrency(minValue * 100)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Range</Text>
          <Text variant="bodyMedium" style={styles.statValue}>
            {formatCurrency((maxValue - minValue) * 100)}
          </Text>
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
  trendIndicators: {
    marginTop: 16,
  },
  trendTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  trendList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontWeight: '600',
    fontSize: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '600',
  },
});

export default SpendingTrendChart;