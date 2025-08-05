import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionList } from '../../src/components/lists/TransactionList';
import { TransactionWithCategory } from '../../src/types/Transaction';

const mockTransactions: TransactionWithCategory[] = [
  {
    id: 1,
    amount: 2550, // $25.50 in cents
    description: 'Lunch at restaurant',
    category_id: 1,
    transaction_type: 'expense',
    date: new Date('2024-01-15T12:00:00Z'),
    created_at: new Date('2024-01-15T12:00:00Z'),
    updated_at: new Date('2024-01-15T12:00:00Z'),
    category_name: 'Dining',
    category_color: '#FF9800',
    category_icon: 'restaurant',
  },
  {
    id: 2,
    amount: 5000, // $50.00 in cents
    description: 'Salary bonus',
    category_id: 2,
    transaction_type: 'income',
    date: new Date('2024-01-14T12:00:00Z'),
    created_at: new Date('2024-01-14T12:00:00Z'),
    updated_at: new Date('2024-01-14T12:00:00Z'),
    category_name: 'Income',
    category_color: '#4CAF50',
    category_icon: 'work',
  },
];

describe('TransactionList', () => {
  it('displays transactions with formatted currency and dates', () => {
    const { getByText } = render(<TransactionList transactions={mockTransactions} />);
    
    // Check if transactions are displayed
    expect(getByText('Lunch at restaurant')).toBeTruthy();
    expect(getByText('Salary bonus')).toBeTruthy();
    
    // Check if currency is formatted correctly
    expect(getByText('-$25.50')).toBeTruthy(); // Expense with negative sign
    expect(getByText('+$50.00')).toBeTruthy(); // Income with positive sign
    
    // Check if category names are displayed
    expect(getByText('Dining')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    
    // Check if dates are formatted
    expect(getByText('Jan 15, 2024')).toBeTruthy();
    expect(getByText('Jan 14, 2024')).toBeTruthy();
  });

  it('shows empty state when no transactions', () => {
    const { getByText } = render(<TransactionList transactions={[]} />);
    
    expect(getByText('No Transactions Yet')).toBeTruthy();
    expect(getByText('Start tracking your expenses by adding your first transaction.')).toBeTruthy();
  });

  it('shows loading state', () => {
    const { getByText } = render(<TransactionList transactions={[]} loading={true} />);
    
    expect(getByText('Loading transactions...')).toBeTruthy();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load transactions';
    const { getByText } = render(
      <TransactionList transactions={[]} error={errorMessage} />
    );
    
    expect(getByText('Error Loading Transactions')).toBeTruthy();
    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('applies correct testID for testing', () => {
    const { getByTestId } = render(<TransactionList transactions={mockTransactions} />);
    
    expect(getByTestId('transaction-list')).toBeTruthy();
  });
});