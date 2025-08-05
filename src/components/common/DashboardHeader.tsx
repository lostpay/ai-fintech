import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import { formatCurrency } from '../../utils/currency';

interface DashboardHeaderProps {
  currentMonth: string;
  totalSpent: number; // Amount in cents
  loading?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentMonth,
  totalSpent,
  loading = false,
}) => {
  return (
    <View style={styles.headerContainer}>
      <Text h3 style={styles.monthText}>
        {loading ? 'Loading...' : currentMonth}
      </Text>
      <Text h2 style={styles.totalText}>
        {loading ? '$0.00' : formatCurrency(totalSpent)}
      </Text>
      <Text style={styles.subtitleText}>
        Total spent this month
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Roboto',
    color: '#1976D2', // Material Design primary color
    marginBottom: 8,
    textAlign: 'center',
  },
  totalText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Roboto',
    color: '#212121', // Material Design on-surface
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Roboto',
    color: '#757575', // Material Design secondary text
    textAlign: 'center',
  },
});