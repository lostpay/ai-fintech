import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmbeddedFinancialCard } from '../../../src/components/ai/EmbeddedFinancialCard';
import { 
  EmbeddedBudgetCardData, 
  EmbeddedTransactionListData, 
  EmbeddedChartData 
} from '../../../src/types/ai/EmbeddedDataTypes';

// Mock the theme context
jest.mock('../../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primary: '#2196F3',
        secondary: '#FF9800',
        error: '#F44336',
        outline: '#E0E0E0',
      },
    },
  }),
}));

// Mock components
jest.mock('../../../src/components/budget/BudgetCard', () => ({
  BudgetCard: ({ budget, onEdit, onDelete }: any) => (
    <div testID="budget-card">
      <div testID="budget-name">{budget.category_name}</div>
      <div testID="budget-amount">{budget.amount}</div>
      <button testID="edit-button" onPress={onEdit}>Edit</button>
      <button testID="delete-button" onPress={onDelete}>Delete</button>
    </div>
  ),
}));

jest.mock('../../../src/components/lists/TransactionList', () => ({
  TransactionList: ({ transactions, onTransactionPress }: any) => (
    <div testID="transaction-list">
      {transactions.map((transaction: any, index: number) => (
        <div 
          key={index} 
          testID={`transaction-${index}`}
          onPress={() => onTransactionPress?.(transaction)}
        >
          {transaction.description}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../../../src/components/charts/BudgetPerformanceChart', () => ({
  BudgetPerformanceChart: ({ data, height }: any) => (
    <div testID="budget-performance-chart" style={{ height }}>
      Chart with {data.length} data points
    </div>
  ),
}));

describe('EmbeddedFinancialCard', () => {
  const mockOnInteraction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Budget Card Embedding', () => {
    const budgetData: EmbeddedBudgetCardData = {
      type: 'BudgetCard',
      budgetData: {
        id: 1,
        category: {
          id: 1,
          name: 'Groceries',
          color: '#4CAF50',
          icon: 'shopping-cart',
        },
        amount: 50000, // $500 in cents
      },
      progressData: {
        spent: 30000, // $300 in cents
        remaining: 20000, // $200 in cents
        percentage: 60,
      },
      size: 'full',
      chatContext: true,
      title: 'Groceries Budget',
    };

    it('renders budget card component', () => {
      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={budgetData}
          onInteraction={mockOnInteraction}
        />
      );

      expect(getByTestId('budget-card')).toBeTruthy();
      expect(getByTestId('budget-name')).toHaveTextContent('Groceries');
    });

    it('handles budget card interactions', () => {
      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={budgetData}
          onInteraction={mockOnInteraction}
        />
      );

      fireEvent.press(getByTestId('edit-button'));
      expect(mockOnInteraction).toHaveBeenCalledWith('edit_budget', budgetData.budgetData);
    });
  });

  describe('Transaction List Embedding', () => {
    const transactionData: EmbeddedTransactionListData = {
      type: 'TransactionList',
      transactions: [
        {
          id: 1,
          amount: 2500, // $25 in cents
          description: 'Coffee',
          category_id: 1,
          transaction_type: 'expense',
          date: new Date('2023-01-01'),
          created_at: new Date(),
          updated_at: new Date(),
          category_name: 'Dining',
          category_color: '#FF9800',
          category_icon: 'restaurant',
        },
      ],
      size: 'compact',
      chatContext: true,
      title: 'Recent Transactions',
    };

    it('renders transaction list component', () => {
      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={transactionData}
          onInteraction={mockOnInteraction}
        />
      );

      expect(getByTestId('transaction-list')).toBeTruthy();
      expect(getByTestId('transaction-0')).toHaveTextContent('Coffee');
    });

    it('shows more indicator for compact size with many transactions', () => {
      const manyTransactionsData = {
        ...transactionData,
        transactions: Array(5).fill(transactionData.transactions[0]),
      };

      const { getByText } = render(
        <EmbeddedFinancialCard 
          embeddedData={manyTransactionsData}
          onInteraction={mockOnInteraction}
        />
      );

      expect(getByText('+2 more transactions')).toBeTruthy();
    });
  });

  describe('Chart Embedding', () => {
    const chartData: EmbeddedChartData = {
      type: 'BudgetPerformanceChart',
      chartData: [
        { x: 'Jan', y: 500, label: 'January' },
        { x: 'Feb', y: 600, label: 'February' },
      ],
      metadata: {
        totalAmount: 110000, // $1100 in cents
        currency: 'USD',
        period: 'current_month',
      },
      size: 'full',
      chatContext: true,
      title: 'Budget Performance',
    };

    it('renders chart component', () => {
      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={chartData}
          onInteraction={mockOnInteraction}
        />
      );

      expect(getByTestId('budget-performance-chart')).toBeTruthy();
    });

    it('adjusts chart height based on size', () => {
      const compactChartData = { ...chartData, size: 'compact' as const };
      
      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={compactChartData}
          onInteraction={mockOnInteraction}
        />
      );

      const chart = getByTestId('budget-performance-chart');
      expect(chart.props.style.height).toBe(150);
    });
  });

  describe('Error Handling', () => {
    it('shows error for unsupported component type', () => {
      const invalidData = {
        type: 'InvalidType',
        size: 'full',
        chatContext: true,
      } as any;

      const { getByText } = render(
        <EmbeddedFinancialCard 
          embeddedData={invalidData}
          onInteraction={mockOnInteraction}
        />
      );

      expect(getByText('Unknown component type')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts width for chat context', () => {
      const budgetData: EmbeddedBudgetCardData = {
        type: 'BudgetCard',
        budgetData: { id: 1, amount: 50000 },
        progressData: { spent: 30000, remaining: 20000, percentage: 60 },
        size: 'full',
        chatContext: true,
      };

      const { getByTestId } = render(
        <EmbeddedFinancialCard 
          embeddedData={budgetData}
          onInteraction={mockOnInteraction}
        />
      );

      // Component should render without errors in chat context
      expect(getByTestId('budget-card')).toBeTruthy();
    });
  });
});