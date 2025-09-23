import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { formatCurrency } from '../../utils/currency';

interface QuickStat {
  title: string;
  value: number; // Amount in cents
  icon: string;
  color: string;
}

interface QuickStatsCardProps {
  weeklySpending: number; // In cents
  transactionCount: number;
  loading?: boolean;
}

export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  weeklySpending,
  transactionCount,
  loading = false,
}) => {
  const stats: QuickStat[] = [
    {
      title: 'This Week',
      value: weeklySpending,
      icon: 'trending-up',
      color: '#FF7043', // Material Design deep orange
    },
    {
      title: 'Transactions',
      value: transactionCount,
      icon: 'receipt',
      color: '#26A69A', // Material Design teal
    },
  ];

  return (
    <View style={styles.statsContainer}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.iconContainer}>
              <Icon 
                name={stat.icon} 
                type="material-icons" 
                size={24} 
                color={stat.color} 
              />
            </View>
            <Text style={styles.statValue}>
              {loading 
                ? stat.title === 'Transactions' ? '0' : '$0.00'
                : stat.title === 'Transactions' 
                  ? stat.value.toString()
                  : formatCurrency(stat.value)
              }
            </Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 12, // Material Design 3 rounded corners
    elevation: 2, // Material Design elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF', // Surface color
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Roboto',
    color: '#212121', // Material Design on-surface
    marginBottom: 4,
    textAlign: 'center',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Roboto',
    color: '#757575', // Material Design secondary text
    textAlign: 'center',
  },
});