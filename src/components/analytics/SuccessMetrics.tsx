import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, Chip, useTheme } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BudgetSuccessMetrics } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';

interface SuccessMetricsProps {
  metrics: BudgetSuccessMetrics;
}

export const SuccessMetrics: React.FC<SuccessMetricsProps> = ({ metrics }) => {
  const theme = useTheme();

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return '#4CAF50';
    if (rate >= 60) return theme.colors.primary;
    if (rate >= 40) return '#FF9800';
    return theme.colors.error;
  };

  const getTrendIcon = (trend: BudgetSuccessMetrics['improvement_trend']) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'trending-flat';
    }
  };

  const getTrendColor = (trend: BudgetSuccessMetrics['improvement_trend']) => {
    switch (trend) {
      case 'improving': return '#4CAF50';
      case 'declining': return theme.colors.error;
      default: return theme.colors.onSurface;
    }
  };

  const getTrendLabel = (trend: BudgetSuccessMetrics['improvement_trend']) => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'declining': return 'Declining';
      default: return 'Stable';
    }
  };

  if (!metrics) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="analytics" size={48} color={theme.colors.outline} />
        <Text variant="bodyMedium" style={styles.emptyText}>
          No success metrics available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall Success Rate */}
      <Card style={styles.metricsCard}>
        <Card.Content>
          <View style={styles.overallSuccess}>
            <View style={styles.successHeader}>
              <MaterialIcons name="track-changes" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.successTitle}>
                Overall Budget Success
              </Text>
            </View>
            
            <View style={styles.successValue}>
              <Text 
                variant="headlineLarge" 
                style={[
                  styles.successRate,
                  { color: getSuccessRateColor(metrics.overall_success_rate) }
                ]}
              >
                {metrics.overall_success_rate.toFixed(0)}%
              </Text>
              <ProgressBar
                progress={metrics.overall_success_rate / 100}
                color={getSuccessRateColor(metrics.overall_success_rate)}
                style={styles.successProgress}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Current Streak */}
        <Card style={[styles.metricCard, styles.halfWidth]}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <MaterialIcons name="local-fire-department" size={20} color="#FF5722" />
              <Text variant="labelMedium" style={styles.metricLabel}>Current Streak</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.metricValue, { color: '#FF5722' }]}>
              {metrics.current_streak}
            </Text>
            <Text variant="bodySmall" style={styles.metricSubtext}>
              {metrics.current_streak === 1 ? 'month' : 'months'} of success
            </Text>
          </Card.Content>
        </Card>

        {/* Best Streak */}
        <Card style={[styles.metricCard, styles.halfWidth]}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
              <Text variant="labelMedium" style={styles.metricLabel}>Best Streak</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.metricValue, { color: '#FFD700' }]}>
              {metrics.best_streak}
            </Text>
            <Text variant="bodySmall" style={styles.metricSubtext}>
              personal best
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Trend and Average Overspend */}
      <View style={styles.metricsGrid}>
        {/* Improvement Trend */}
        <Card style={[styles.metricCard, styles.halfWidth]}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <MaterialIcons 
                name={getTrendIcon(metrics.improvement_trend) as any} 
                size={20} 
                color={getTrendColor(metrics.improvement_trend)} 
              />
              <Text variant="labelMedium" style={styles.metricLabel}>Trend</Text>
            </View>
            <Chip
              mode="outlined"
              style={[
                styles.trendChip,
                { 
                  borderColor: getTrendColor(metrics.improvement_trend),
                  backgroundColor: getTrendColor(metrics.improvement_trend) + '20'
                }
              ]}
              textStyle={{ color: getTrendColor(metrics.improvement_trend) }}
            >
              {getTrendLabel(metrics.improvement_trend)}
            </Chip>
          </Card.Content>
        </Card>

        {/* Average Overspend */}
        <Card style={[styles.metricCard, styles.halfWidth]}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <MaterialIcons 
                name="trending-up" 
                size={20} 
                color={metrics.average_overspend > 0 ? theme.colors.error : '#4CAF50'} 
              />
              <Text variant="labelMedium" style={styles.metricLabel}>Avg. Overspend</Text>
            </View>
            <Text 
              variant="headlineSmall" 
              style={[
                styles.metricValue,
                { color: metrics.average_overspend > 0 ? theme.colors.error : '#4CAF50' }
              ]}
            >
              {metrics.average_overspend > 0 
                ? formatCurrency(metrics.average_overspend)
                : 'None'
              }
            </Text>
            <Text variant="bodySmall" style={styles.metricSubtext}>
              per exceeded budget
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Top and Bottom Performers */}
      <View style={styles.performersSection}>
        <Text variant="titleMedium" style={styles.performersTitle}>
          Category Performance Highlights
        </Text>

        {/* Most Successful Category */}
        {metrics.most_successful_category && (
          <Card style={styles.performerCard}>
            <Card.Content>
              <View style={styles.performerHeader}>
                <MaterialIcons name="star" size={20} color="#4CAF50" />
                <Text variant="labelMedium" style={[styles.performerLabel, { color: '#4CAF50' }]}>
                  Best Performing Category
                </Text>
              </View>
              
              <View style={styles.performerContent}>
                <View style={styles.performerInfo}>
                  <View 
                    style={[
                      styles.categoryColorDot,
                      { backgroundColor: metrics.most_successful_category.category_color }
                    ]}
                  />
                  <Text variant="titleSmall" style={styles.performerName}>
                    {metrics.most_successful_category.category_name}
                  </Text>
                </View>
                
                <View style={styles.performerStats}>
                  <Text variant="bodySmall" style={styles.performerStat}>
                    {metrics.most_successful_category.utilization_percentage.toFixed(0)}% of budget used
                  </Text>
                  <Text variant="bodySmall" style={styles.performerStat}>
                    {formatCurrency(metrics.most_successful_category.spent_amount)} spent
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Most Challenging Category */}
        {metrics.most_challenging_category && (
          <Card style={styles.performerCard}>
            <Card.Content>
              <View style={styles.performerHeader}>
                <MaterialIcons name="warning" size={20} color={theme.colors.error} />
                <Text variant="labelMedium" style={[styles.performerLabel, { color: theme.colors.error }]}>
                  Most Challenging Category
                </Text>
              </View>
              
              <View style={styles.performerContent}>
                <View style={styles.performerInfo}>
                  <View 
                    style={[
                      styles.categoryColorDot,
                      { backgroundColor: metrics.most_challenging_category.category_color }
                    ]}
                  />
                  <Text variant="titleSmall" style={styles.performerName}>
                    {metrics.most_challenging_category.category_name}
                  </Text>
                </View>
                
                <View style={styles.performerStats}>
                  <Text variant="bodySmall" style={styles.performerStat}>
                    {metrics.most_challenging_category.utilization_percentage.toFixed(0)}% of budget used
                  </Text>
                  <Text variant="bodySmall" style={styles.performerStat}>
                    {formatCurrency(metrics.most_challenging_category.spent_amount)} spent
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.6,
  },
  metricsCard: {
    marginBottom: 16,
  },
  overallSuccess: {
    alignItems: 'center',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  successValue: {
    alignItems: 'center',
    width: '100%',
  },
  successRate: {
    fontWeight: '700',
    marginBottom: 16,
  },
  successProgress: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
  },
  halfWidth: {
    flex: 0.5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    marginLeft: 6,
    opacity: 0.7,
    fontWeight: '600',
  },
  metricValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtext: {
    opacity: 0.6,
  },
  trendChip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
  },
  performersSection: {
    marginTop: 8,
  },
  performersTitle: {
    marginBottom: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  performerCard: {
    marginBottom: 12,
  },
  performerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  performerLabel: {
    marginLeft: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  performerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  performerName: {
    fontWeight: '600',
  },
  performerStats: {
    alignItems: 'flex-end',
  },
  performerStat: {
    opacity: 0.7,
    marginBottom: 2,
  },
});

export default SuccessMetrics;