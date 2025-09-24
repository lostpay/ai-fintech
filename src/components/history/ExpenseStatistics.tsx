import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, SegmentedButtons, Card } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { TransactionWithCategory } from '../../types/Transaction';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../context/ThemeContext';

interface ExpenseStatisticsProps {
  transactions: TransactionWithCategory[];
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

const screenWidth = Dimensions.get('window').width;

export const ExpenseStatistics: React.FC<ExpenseStatisticsProps> = ({ transactions }) => {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('daily');

  // Get only expense transactions
  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.transaction_type === 'expense');
  }, [transactions]);

  // Calculate statistics based on selected period
  const statisticsData = useMemo(() => {
    if (expenseTransactions.length === 0) return { labels: [], data: [], totalAmount: 0 };

    const now = new Date();
    const periodData: { [key: string]: number } = {};

    expenseTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      let key: string;

      switch (selectedPeriod) {
        case 'daily':
          // Show last 7 days
          const daysDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff < 7) {
            key = transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            return; // Skip transactions older than 7 days
          }
          break;

        case 'weekly':
          // Show last 6 weeks
          const weeksDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
          if (weeksDiff < 6) {
            const weekStart = new Date(transactionDate);
            weekStart.setDate(transactionDate.getDate() - transactionDate.getDay());
            key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            return; // Skip transactions older than 6 weeks
          }
          break;

        case 'monthly':
          // Show last 6 months
          const monthsDiff = (now.getFullYear() - transactionDate.getFullYear()) * 12 + (now.getMonth() - transactionDate.getMonth());
          if (monthsDiff < 6) {
            key = transactionDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          } else {
            return; // Skip transactions older than 6 months
          }
          break;

        default:
          return;
      }

      periodData[key] = (periodData[key] || 0) + (transaction.amount / 100);
    });

    // Convert to arrays for chart and ensure we show the right number of periods
    let labels: string[];
    let data: number[];

    if (selectedPeriod === 'monthly') {
      // Generate last 6 months labels
      labels = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        labels.push(monthKey);
      }
      data = labels.map(label => periodData[label] || 0);
    } else if (selectedPeriod === 'daily') {
      // Generate last 7 days labels
      labels = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(dayKey);
      }
      data = labels.map(label => periodData[label] || 0);
    } else if (selectedPeriod === 'weekly') {
      // Generate last 6 weeks labels
      labels = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        // Get start of week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(weekKey);
      }
      data = labels.map(label => periodData[label] || 0);
    } else {
      labels = [];
      data = [];
    }

    const totalAmount = Object.values(periodData).reduce((sum, amount) => sum + amount, 0);

    return { labels, data, totalAmount };
  }, [expenseTransactions, selectedPeriod]);

  // Group expenses by category for the list
  const categoryStats = useMemo(() => {
    const categoryMap: { [key: string]: { amount: number; count: number; color: string } } = {};

    expenseTransactions.forEach(transaction => {
      const category = transaction.category_name;
      if (!categoryMap[category]) {
        categoryMap[category] = {
          amount: 0,
          count: 0,
          color: transaction.category_color || '#4CAF50'
        };
      }
      categoryMap[category].amount += transaction.amount / 100;
      categoryMap[category].count += 1;
    });

    return Object.entries(categoryMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.7,
  };

  const chartData = {
    labels: statisticsData.labels.length > 0 ? statisticsData.labels : ['No Data'],
    datasets: [{
      data: statisticsData.data.length > 0 ? statisticsData.data : [0],
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
    }]
  };

  return (
    <View style={styles.container}>
      {/* Period Selection */}
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={(value) => setSelectedPeriod(value as PeriodType)}
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Total Amount */}
      <View style={styles.totalContainer}>
        <Text variant="headlineMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
          {formatCurrency(Math.round(statisticsData.totalAmount * 100))}
        </Text>
        <Text variant="bodyMedium" style={[styles.totalLabel, { color: theme.colors.onSurface }]}>
          Total {selectedPeriod} expenses
        </Text>
      </View>

      {/* Bar Chart */}
      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.chartContent}>
          <BarChart
            data={chartData}
            width={screenWidth - 64}
            height={200}
            yAxisLabel="$"
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars={false}
            fromZero={true}
            style={styles.chart}
            segments={4}
          />
        </Card.Content>
      </Card>

      {/* Category Statistics */}
      <View style={styles.categorySection}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Expenses by Category
        </Text>

        {categoryStats.map((category, index) => (
          <View key={category.name} style={styles.categoryItem}>
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {category.name}
              </Text>
            </View>
            <View style={styles.categoryRight}>
              <Text variant="bodyMedium" style={[styles.categoryAmount, { color: theme.colors.onSurface }]}>
                {formatCurrency(Math.round(category.amount * 100))}
              </Text>
              <Text variant="bodySmall" style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                {category.count} {category.count === 1 ? 'transaction' : 'transactions'}
              </Text>
            </View>
          </View>
        ))}

        {/* Add bottom padding for better scrolling */}
        <View style={styles.bottomPadding} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  periodSelector: {
    marginBottom: 20,
  },
  segmentedButtons: {
    // Add any custom styling if needed
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  totalAmount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalLabel: {
    opacity: 0.7,
  },
  chartCard: {
    marginBottom: 24,
    borderRadius: 16,
  },
  chartContent: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },
  categorySection: {
    // Category section styles
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  bottomPadding: {
    height: 100, // Extra padding for tab bar and comfortable scrolling
  },
});

export default ExpenseStatistics;