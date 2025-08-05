import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { FAB } from 'react-native-elements';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { DashboardHeader } from '../components/common/DashboardHeader';
import { QuickStatsCard } from '../components/lists/QuickStatsCard';
import { RecentTransactionsList } from '../components/lists/RecentTransactionsList';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyDashboard } from '../components/common/EmptyDashboard';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const {
    dashboardData,
    loading,
    error,
    refreshing,
    refreshDashboard
  } = useDashboardStats();

  const handleFABPress = () => {
    navigation.navigate('Add');
  };

  const handleViewAllTransactions = () => {
    navigation.navigate('History');
  };

  const handleAddExpense = () => {
    navigation.navigate('Add');
  };

  // Show loading state while data is being fetched
  if (loading && !dashboardData) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  // Show error state if there's an error and no data
  if (error && !dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <EmptyDashboard onAddExpense={handleAddExpense} />
      </View>
    );
  }

  // Show empty state if no data
  if (!dashboardData || (dashboardData.transactionCount === 0 && dashboardData.recentTransactions.length === 0)) {
    return (
      <View style={styles.container}>
        <EmptyDashboard onAddExpense={handleAddExpense} />
        <FAB
          style={styles.fab}
          icon={{ name: 'add', type: 'material', color: 'white' }}
          color="#1976D2"
          onPress={handleFABPress}
          testID="dashboard-fab"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshDashboard}
            colors={['#1976D2']} // Material Design primary color
            tintColor="#1976D2"
          />
        }
        testID="dashboard-scroll-view"
      >
        {/* Dashboard Header */}
        <DashboardHeader
          currentMonth={dashboardData.currentMonth}
          totalSpent={dashboardData.totalSpentThisMonth}
          loading={loading}
        />

        {/* Quick Stats Cards */}
        <QuickStatsCard
          weeklySpending={dashboardData.weeklySpending}
          transactionCount={dashboardData.transactionCount}
          loading={loading}
        />

        {/* Recent Transactions */}
        <RecentTransactionsList
          transactions={dashboardData.recentTransactions}
          loading={loading}
          onViewAll={handleViewAllTransactions}
        />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon={{ name: 'add', type: 'material', color: 'white' }}
        color="#1976D2"
        onPress={handleFABPress}
        testID="dashboard-fab"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Material Design surface background
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 95, // Space for FAB and taller navigation bar
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6, // Material Design FAB elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});