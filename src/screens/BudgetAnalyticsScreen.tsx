import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Appbar, 
  Text, 
  SegmentedButtons, 
  ActivityIndicator, 
  Card,
  useTheme
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Hooks
import { useBudgetAnalytics, useBudgetAnalyticsPeriods } from '../hooks/useBudgetAnalytics';

// Components
import { MonthlySummary, CategoryPerformance, SuccessMetrics } from '../components/analytics';
import { 
  BudgetPerformanceChart, 
  SpendingTrendChart, 
  CategoryBreakdownChart 
} from '../components/charts';

export const BudgetAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const periods = useBudgetAnalyticsPeriods();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('6m');
  const [refreshing, setRefreshing] = useState(false);

  const {
    monthlyPerformance,
    categoryPerformance,
    successMetrics,
    spendingTrends,
    insights,
    loading,
    error,
    refreshAnalytics,
    changePeriod,
    currentPeriod,
    periodLabel,
    isEmpty,
  } = useBudgetAnalytics({
    period: selectedPeriod,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
  });

  const handlePeriodChange = (period: string) => {
    const newPeriod = period as '1m' | '3m' | '6m' | '1y';
    setSelectedPeriod(newPeriod);
    changePeriod(newPeriod);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnalytics();
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrentMonthPerformance = () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return monthlyPerformance.find(p => p.month === currentMonth) || monthlyPerformance[0];
  };

  if (loading && monthlyPerformance.length === 0) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Budget Analytics" />
        </Appbar.Header>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Analyzing your budget performance...
          </Text>
        </View>
      </View>
    );
  }

  if (error && monthlyPerformance.length === 0) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Budget Analytics" />
          <Appbar.Action icon="refresh" onPress={handleRefresh} />
        </Appbar.Header>
        
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={theme.colors.error} />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Unable to Load Analytics
          </Text>
          <Text variant="bodyMedium" style={styles.errorMessage}>
            {error}
          </Text>
          <Text variant="bodySmall" style={styles.errorHint}>
            Pull down to refresh or try again
          </Text>
        </View>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Budget Analytics" />
          <Appbar.Action icon="refresh" onPress={handleRefresh} />
        </Appbar.Header>
        
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <MaterialIcons name="analytics" size={64} color={theme.colors.outline} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Analytics Data
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            Start creating budgets and adding expenses to see your budget performance analytics.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Budget Analytics" />
        <Appbar.Action icon="refresh" onPress={handleRefresh} />
      </Appbar.Header>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Period Selection */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Analysis Period
          </Text>
          <SegmentedButtons
            value={currentPeriod}
            onValueChange={handlePeriodChange}
            buttons={periods.map(period => ({
              value: period.value,
              label: period.value.toUpperCase(),
              icon: period.value === currentPeriod ? 'check' : undefined,
            }))}
            style={styles.segmentedButtons}
          />
          <Text variant="bodySmall" style={styles.periodSubtitle}>
            Showing data for {periodLabel.toLowerCase()}
          </Text>
        </View>

        {getCurrentMonthPerformance() && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Current Month Overview
            </Text>
            <MonthlySummary performance={getCurrentMonthPerformance()!} />
          </View>
        )}

        {monthlyPerformance.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Budget vs Actual Spending
            </Text>
            <Card style={styles.chartCard}>
              <Card.Content>
                <BudgetPerformanceChart data={monthlyPerformance} height={250} />
              </Card.Content>
            </Card>
          </View>
        )}

        {successMetrics && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Budget Success Metrics
            </Text>
            <SuccessMetrics metrics={successMetrics} />
          </View>
        )}

        {categoryPerformance.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Category Breakdown
            </Text>
            <Card style={styles.chartCard}>
              <Card.Content>
                <CategoryBreakdownChart
                  data={categoryPerformance}
                  height={250}
                  showLegend={true}
                />
              </Card.Content>
            </Card>
          </View>
        )}

        {categoryPerformance.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Category Performance
            </Text>
            <CategoryPerformance categories={categoryPerformance} />
          </View>
        )}

        {spendingTrends.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Spending Trends
            </Text>
            <Card style={styles.chartCard}>
              <Card.Content>
                <SpendingTrendChart
                  data={spendingTrends}
                  height={250}
                  showTrendIndicators={true}
                />
              </Card.Content>
            </Card>
          </View>
        )}

        {insights.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Insights & Recommendations
            </Text>
            <Card style={styles.insightsCard}>
              <Card.Content>
                <View style={styles.insightsHeader}>
                  <MaterialIcons name="lightbulb" size={24} color={theme.colors.primary} />
                  <Text variant="titleMedium" style={styles.insightsTitle}>
                    Personalized Insights
                  </Text>
                </View>
                
                {insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <View style={styles.insightBullet} />
                    <Text variant="bodyMedium" style={styles.insightText}>
                      {insight}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Error handling during refresh */}
        {error && monthlyPerformance.length > 0 && (
          <View style={styles.section}>
            <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content>
                <View style={styles.errorInline}>
                  <MaterialIcons name="warning" size={20} color={theme.colors.error} />
                  <Text variant="bodySmall" style={[styles.errorInlineText, { color: theme.colors.error }]}>
                    Some data may be outdated. {error}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorHint: {
    textAlign: 'center',
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 16,
    fontWeight: '700',
  },
  segmentedButtons: {
    marginHorizontal: 16,
  },
  periodSubtitle: {
    marginHorizontal: 16,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  chartCard: {
    marginHorizontal: 16,
  },
  insightsCard: {
    marginHorizontal: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginTop: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    lineHeight: 20,
  },
  errorCard: {
    marginHorizontal: 16,
  },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorInlineText: {
    marginLeft: 8,
    flex: 1,
  },
  bottomPadding: {
    height: 32,
  },
});

export default BudgetAnalyticsScreen;