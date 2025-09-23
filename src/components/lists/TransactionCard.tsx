/**
 * Material Design 3 Transaction Card Component
 * Story 2.4: Enhanced transaction history interface
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, TouchableRipple } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { TransactionWithCategory } from '../../types/Transaction';
import { formatCurrency } from '../../utils/currency';
import { formatRelativeDate } from '../../utils/dateFormatting';

interface TransactionCardProps {
  transaction: TransactionWithCategory;
  onPress?: (transaction: TransactionWithCategory) => void;
}

const CARD_HEIGHT = 88; // Increased height for better Material Design proportions

export const TransactionCard: React.FC<TransactionCardProps> = ({ 
  transaction, 
  onPress 
}) => {
  const isIncome = transaction.transaction_type === 'income';
  const amountColor = isIncome ? '#1B5E20' : '#1976D2'; // Material Design colors
  const amountPrefix = isIncome ? '+' : '';

  const handlePress = () => {
    onPress?.(transaction);
  };

  return (
    <Card style={styles.card} mode="contained">
      <TouchableRipple 
        onPress={handlePress}
        rippleColor="rgba(0, 0, 0, 0.12)"
        style={styles.touchableContent}
        testID={`transaction-card-${transaction.id}`}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.leftSection}>
            {/* Category Icon with Material Design */}
            <View style={[
              styles.categoryIcon,
              { backgroundColor: transaction.category_color }
            ]}>
              <MaterialIcons
                name={transaction.category_icon as any}
                size={24}
                color="#FFFFFF"
              />
            </View>
            
            {/* Transaction Information */}
            <View style={styles.transactionInfo}>
              <Text 
                variant="bodyLarge" 
                style={styles.description}
                numberOfLines={1}
              >
                {transaction.description}
              </Text>
              <Text 
                variant="bodySmall" 
                style={styles.category}
              >
                {transaction.category_name}
              </Text>
              <Text 
                variant="bodySmall" 
                style={styles.date}
              >
                {formatRelativeDate(transaction.date)}
              </Text>
            </View>
          </View>
          
          {/* Amount Section */}
          <View style={styles.rightSection}>
            <Text 
              variant="titleMedium" 
              style={[styles.amount, { color: amountColor }]}
              numberOfLines={1}
            >
              {amountPrefix}{formatCurrency(Math.abs(transaction.amount))}
            </Text>
          </View>
        </Card.Content>
      </TouchableRipple>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  touchableContent: {
    borderRadius: 12, // Material Design 3 border radius
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: CARD_HEIGHT,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontWeight: '500',
    color: '#1C1B1F', // Material Design on-surface
    marginBottom: 2,
  },
  category: {
    color: '#49454F', // Material Design on-surface-variant
    marginBottom: 2,
  },
  date: {
    color: '#79747E', // Material Design outline
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 16,
  },
  amount: {
    fontWeight: '600',
    fontSize: 18,
  },
});

export { CARD_HEIGHT };