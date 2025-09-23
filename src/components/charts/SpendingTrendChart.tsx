import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryArea } from 'victory-native';
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
  height = 250,
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

  // Prepare data for Victory Native
  const months = data.map(d => new Date(d.period + '-01').toLocaleDateString('en-US', { month: 'short' }));
  const chartData = data.map((d, i) => ({
    x: i + 1,
    y: d.amount / 100
  }));

  const maxValue = Math.max(...chartData.map(d => d.y));
  const minValue = Math.min(...chartData.map(d => d.y));

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
        return '#FF5722';
      case 'down':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      <VictoryChart
        width={screenWidth - 32}
        height={height}
        theme={VictoryTheme.material}
        padding={{ left: 70, top: 20, right: 40, bottom: 60 }}
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
        <VictoryArea
          data={chartData}
          x="x"
          y="y"
          style={{
            data: {
              fill: "#2196F3",
              fillOpacity: 0.3,
              stroke: "#2196F3",
              strokeWidth: 2
            }
          }}
          interpolation="monotoneX"
        />
      </VictoryChart>

      {showTrendIndicators && (
        <View style={styles.trendIndicators}>
          <Text variant="labelMedium" style={styles.trendTitle}>
            Monthly Changes:
          </Text>
          <View style={styles.trendList}>
            {data.slice(1).map((trend, index) => (
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
                  {trend.change_percentage >= 0 ? '+' : ''}{Math.round(trend.change_percentage)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>Average</Text>
          <Text variant="bodyMedium" style={styles.statValue}>
            {formatCurrency(chartData.reduce((sum, item) => sum + item.y, 0) / chartData.length * 100)}
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