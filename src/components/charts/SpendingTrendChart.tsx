import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { SpendingTrend } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface SpendingTrendChartProps {
  data: SpendingTrend[];
  height?: number;
  showTrendIndicators?: boolean;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  data,
  height = 220,
  showTrendIndicators = true,
}) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No spending trend data available
        </Text>
      </View>
    );
  }

  // Prepare data for react-native-chart-kit
  const labels = data.map(d => new Date(d.period + '-01').toLocaleDateString('en-US', { month: 'short' }));
  const amounts = data.map(d => d.amount / 100);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: amounts,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2196F3',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid background lines
    },
  };

  const maxValue = Math.max(...amounts);
  const minValue = Math.min(...amounts);

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
      <Text variant="titleMedium" style={styles.chartTitle}>
        Spending Trends
      </Text>

      <LineChart
        data={chartData}
        width={screenWidth - 64} // Increased padding for better fit
        height={height}
        yAxisLabel="$"
        yAxisSuffix=""
        yAxisInterval={1}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withDots={true}
        withShadow={false}
        getDotColor={() => '#2196F3'}
        segments={4}
      />

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
            {formatCurrency(amounts.reduce((sum, item) => sum + item, 0) / amounts.length * 100)}
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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