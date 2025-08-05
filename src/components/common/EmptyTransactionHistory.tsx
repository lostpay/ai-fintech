/**
 * Enhanced Empty State Component for Transaction History
 * Story 2.4: Professional empty state with Material Design
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

// Import navigation types if available
type RootStackParamList = {
  'add-expense': undefined;
  '(tabs)': undefined;
};

export const EmptyTransactionHistory: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleAddTransaction = () => {
    try {
      // Navigate to add expense screen
      navigation.navigate('add-expense');
    } catch (error) {
      console.warn('Navigation error:', error);
      // Fallback - you could also use router.push if using Expo Router
    }
  };

  return (
    <View style={styles.emptyContainer}>
      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Avatar.Icon
          size={120}
          icon="receipt-text-outline"
          style={styles.emptyIcon}
          theme={{ colors: { onSurfaceVariant: '#6750A4' } }}
        />
      </View>
      
      {/* Title and Message */}
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Transactions Yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Start tracking your expenses by adding your first transaction. 
        Your spending history will appear here to help you understand your financial patterns.
      </Text>
      
      {/* Call to Action Button */}
      <Button
        mode="contained"
        onPress={handleAddTransaction}
        style={styles.addButton}
        contentStyle={styles.addButtonContent}
        icon="plus"
        testID="add-first-transaction-button"
      >
        Add First Transaction
      </Button>
      
      {/* Secondary Action */}
      <Button
        mode="text"
        onPress={() => console.log('Learn more about expense tracking')}
        style={styles.learnMoreButton}
        testID="learn-more-button"
      >
        Learn More
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    backgroundColor: '#FFFBFE', // Material Design surface
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  emptyIcon: {
    backgroundColor: '#F3E5F5', // Light purple background
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#1C1B1F', // Material Design on-surface
    fontWeight: '600',
  },
  emptyMessage: {
    textAlign: 'center',
    marginBottom: 48,
    color: '#49454F', // Material Design on-surface-variant
    lineHeight: 24,
    maxWidth: 280,
  },
  addButton: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  addButtonContent: {
    paddingVertical: 4,
  },
  learnMoreButton: {
    paddingHorizontal: 16,
  },
});