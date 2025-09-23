import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, ProgressBar, Chip, useTheme } from 'react-native-paper';
import { MonthlyBudgetPerformance } from '../../types/BudgetAnalytics';
import { formatCurrency } from '../../utils/currency';

interface MonthlySummaryProps {
  performance: MonthlyBudgetPerformance;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ performance }) => {
  const theme = useTheme();
  
  const budgetEfficiency = performance.total_budgeted > 0 
    ? (performance.total_spent / performance.total_budgeted) * 100 
    : 0;
  const savingsAmount = Math.max(0, performance.total_budgeted - performance.total_spent);
  const overspendAmount = Math.max(0, performance.total_spent - performance.total_budgeted);

  const getEfficiencyColor = () => {
    if (budgetEfficiency <= 90) return '#4CAF50'; // Green - under budget
    if (budgetEfficiency <= 100) return '#FF9800'; // Orange - close to budget
    return theme.colors.error; // Red - over budget
  };

  const getPerformanceRating = () => {
    if (performance.success_rate >= 80) return 'Excellent';
    if (performance.success_rate >= 60) return 'Good';
    if (performance.success_rate >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getRatingColor = () => {
    if (performance.success_rate >= 80) return '#4CAF50';
    if (performance.success_rate >= 60) return theme.colors.primary;
    if (performance.success_rate >= 40) return '#FF9800';
    return theme.colors.error;
  };

  return (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.monthTitle}>
          {new Date(performance.month + '-01').toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text 
              variant="headlineSmall" 
              style={[styles.metricValue, { color: getEfficiencyColor() }]}
            >
              {budgetEfficiency.toFixed(0)}%
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>Budget Used</Text>
          </View>
          
          <View style={styles.metric}>
            <Text variant="headlineSmall" style={styles.metricValue}>
              {performance.success_rate.toFixed(0)}%
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>Success Rate</Text>
          </View>
          
          <View style={styles.metric}>
            <Text variant="headlineSmall" style={styles.metricValue}>
              {performance.budgets_met}/{performance.total_budgets}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>Budgets Met</Text>
          </View>
        </View>

        {/* Budget vs Actual Comparison */}
        <View style={styles.amountComparison}>
          <View style={styles.amountRow}>
            <Text variant="titleMedium">Budgeted:</Text>
            <Text variant="titleMedium" style={styles.budgetedAmount}>
              {formatCurrency(performance.total_budgeted)}
            </Text>
          </View>
          
          <View style={styles.amountRow}>
            <Text variant="titleMedium">Actual:</Text>
            <Text 
              variant="titleMedium" 
              style={[
                styles.actualAmount,
                { color: budgetEfficiency > 100 ? theme.colors.error : theme.colors.primary }
              ]}
            >
              {formatCurrency(performance.total_spent)}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.amountRow}>
            <Text variant="titleMedium" style={styles.resultLabel}>
              {savingsAmount > 0 ? 'Saved:' : 'Over:'}
            </Text>
            <Text 
              variant="titleMedium" 
              style={[
                styles.resultAmount,
                { color: savingsAmount > 0 ? '#4CAF50' : theme.colors.error }
              ]}
            >
              {formatCurrency(savingsAmount > 0 ? savingsAmount : overspendAmount)}
            </Text>
          </View>
        </View>

        {/* Performance Rating Section */}
        <View style={styles.performanceSection}>
          <View style={styles.performanceHeader}>
            <Text variant="titleMedium">Performance Rating</Text>
            <Chip 
              mode="outlined" 
              style={[
                styles.ratingChip,
                { 
                  borderColor: getRatingColor(),
                  backgroundColor: 'rgba(0,0,0,0.05)'
                }
              ]}
              textStyle={{ color: getRatingColor() }}
            >
              {getPerformanceRating()}
            </Chip>
          </View>
          
          <ProgressBar
            progress={performance.success_rate / 100}
            color={getRatingColor()}
            style={styles.performanceProgress}
          />
          
          <Text variant="bodySmall" style={styles.progressText}>
            {performance.success_rate.toFixed(0)}% of budgets successfully met
          </Text>
        </View>

        {/* Additional Insights */}
        {performance.average_overspend > 0 && (
          <View style={styles.insightSection}>
            <Text variant="bodyMedium" style={[styles.insightText, { color: theme.colors.error }]}>
              💡 Average overspend: {formatCurrency(performance.average_overspend)} per exceeded budget
            </Text>
          </View>
        )}

        {budgetEfficiency < 80 && (
          <View style={styles.insightSection}>
            <Text variant="bodyMedium" style={[styles.insightText, { color: '#4CAF50' }]}>
              🎯 Great job staying under budget! Consider adjusting budgets to match spending patterns.
            </Text>
          </View>
        )}

        {performance.success_rate === 100 && (
          <View style={styles.insightSection}>
            <Text variant="bodyMedium" style={[styles.insightText, { color: '#4CAF50' }]}>
              🏆 Perfect month! You stayed within budget for all categories.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: 16,
  },
  monthTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  amountComparison: {
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  budgetedAmount: {
    fontWeight: '600',
  },
  actualAmount: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  resultLabel: {
    fontWeight: '600',
  },
  resultAmount: {
    fontWeight: '700',
    fontSize: 18,
  },
  performanceSection: {
    marginBottom: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingChip: {
    borderWidth: 1.5,
  },
  performanceProgress: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  insightSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  insightText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MonthlySummary;