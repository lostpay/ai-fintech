import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Button } from 'react-native-elements';

interface EmptyDashboardProps {
  onAddExpense?: () => void;
}

export const EmptyDashboard: React.FC<EmptyDashboardProps> = ({
  onAddExpense,
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.iconContainer}>
        <Icon 
          name="account-balance-wallet" 
          type="material" 
          size={64} 
          color="#E0E0E0" // Material Design outline
        />
      </View>
      
      <Text style={styles.emptyTitle}>Welcome to FinanceFlow</Text>
      
      <Text style={styles.emptyMessage}>
        Start tracking your expenses by adding your first transaction.
        Get insights into your spending patterns and reach your financial goals.
      </Text>
      
      {onAddExpense && (
        <Button
          title="Add Your First Expense"
          onPress={onAddExpense}
          buttonStyle={styles.actionButton}
          titleStyle={styles.actionButtonText}
          icon={{
            name: 'add',
            type: 'material',
            size: 20,
            color: '#FFFFFF',
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    backgroundColor: '#FAFAFA', // Material Design surface
  },
  iconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Roboto',
    color: '#1976D2', // Material Design primary
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Roboto',
    color: '#757575', // Material Design secondary text
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#1976D2', // Material Design primary
    borderRadius: 24, // Rounded button
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48, // Material Design minimum touch target
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
    marginLeft: 8,
  },
});