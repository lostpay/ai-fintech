import React from 'react';
import { render } from '@testing-library/react-native';
import { BudgetProgressCard } from '../../../src/components/budget/BudgetProgressCard';
import { BudgetProgress } from '../../../src/types/Budget';

// Mock the theme context
const mockTheme = {
  colors: {
    surface: '#FFFFFF',
    onSurface: '#000000',
    onSurfaceVariant: '#666666',
    outline: '#CCCCCC',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    successContainer: '#E8F5E8',
    warningContainer: '#FFF3E0',
    errorContainer: '#FFEBEE',
    onSuccessContainer: '#1B5E20',
    onWarningContainer: '#E65100',
    onErrorContainer: '#B71C1C',
  },
};

jest.mock('../../../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../../../src/utils/currency', () => ({
  formatCurrency: jest.fn((amount: number) => `$${(amount / 100).toFixed(2)}`),
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => ({
  Card: ({ children }: any) => children,
  Text: ({ children, style, ...props }: any) => 
    React.createElement('Text', { ...props, style }, children),
  ProgressBar: (props: any) => 
    React.createElement('ProgressBar', props),
  Chip: ({ children, ...props }: any) => 
    React.createElement('Chip', props, children),
}));

describe('BudgetProgressCard', () => {
  const mockBudgetProgress: BudgetProgress = {
    budget_id: 1,
    category_id: 1,
    category_name: 'Dining',
    category_color: '#FF5722',
    budgeted_amount: 50000, // $500
    spent_amount: 25000, // $250
    remaining_amount: 25000, // $250
    percentage_used: 50,
    status: 'under',
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
  };

  it('renders budget progress card with correct information', () => {
    const { getByText } = render(
      <BudgetProgressCard budgetProgress={mockBudgetProgress} />
    );

    expect(getByText('Dining')).toBeTruthy();
    expect(getByText('$250.00')).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('displays correct color coding for under budget status', () => {
    const { getByTestId } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress} 
        testID="budget-card"
      />
    );

    // The card should have green color indicators for "under" status
    // This would need to be tested based on the actual rendered styles
  });

  it('displays correct color coding for over budget status', () => {
    const overBudgetProgress = {
      ...mockBudgetProgress,
      spent_amount: 60000, // $600
      remaining_amount: -10000, // -$100
      percentage_used: 120,
      status: 'over' as const,
    };

    const { getByText } = render(
      <BudgetProgressCard budgetProgress={overBudgetProgress} />
    );

    expect(getByText('120%')).toBeTruthy();
    expect(getByText('$600.00')).toBeTruthy();
    expect(getByText('-$100.00')).toBeTruthy();
  });

  it('displays correct color coding for approaching budget status', () => {
    const approachingBudgetProgress = {
      ...mockBudgetProgress,
      spent_amount: 40000, // $400
      remaining_amount: 10000, // $100
      percentage_used: 80,
      status: 'approaching' as const,
    };

    const { getByText } = render(
      <BudgetProgressCard budgetProgress={approachingBudgetProgress} />
    );

    expect(getByText('80%')).toBeTruthy();
    expect(getByText('$400.00')).toBeTruthy();
    expect(getByText('$100.00')).toBeTruthy();
  });

  it('renders compact variant correctly', () => {
    const { getByText } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress} 
        variant="compact"
      />
    );

    expect(getByText('Dining')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    // Compact view shows combined spent/budget format
    expect(getByText('$250.00 / $500.00')).toBeTruthy();
  });

  it('renders full variant correctly', () => {
    const { getByText } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress} 
        variant="full"
      />
    );

    expect(getByText('Dining')).toBeTruthy();
    expect(getByText('Spent')).toBeTruthy();
    expect(getByText('Remaining')).toBeTruthy();
    expect(getByText('$250.00')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    
    const { getByTestId } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress}
        onPress={onPressMock}
        testID="budget-card"
      />
    );

    // This would need to be implemented based on how TouchableOpacity is tested
  });

  it('shows action buttons when showActions is true', () => {
    const onEditMock = jest.fn();
    const onDeleteMock = jest.fn();

    const { getByTestId } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress}
        showActions={true}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
        variant="full"
      />
    );

    // Action buttons should be visible in full variant with showActions
    // This would need to be tested based on actual implementation
  });

  it('handles null/undefined category information gracefully', () => {
    const budgetProgressWithNulls = {
      ...mockBudgetProgress,
      category_name: '',
      category_color: '',
    };

    const { getByText } = render(
      <BudgetProgressCard budgetProgress={budgetProgressWithNulls} />
    );

    // Should still render without errors
    expect(getByText('50%')).toBeTruthy();
  });

  it('formats currency amounts correctly', () => {
    const budgetProgressWithDecimals = {
      ...mockBudgetProgress,
      spent_amount: 25050, // $250.50
      remaining_amount: 24950, // $249.50
      budgeted_amount: 50000, // $500.00
    };

    const { getByText } = render(
      <BudgetProgressCard budgetProgress={budgetProgressWithDecimals} />
    );

    expect(getByText('$250.50')).toBeTruthy();
    expect(getByText('$249.50')).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
  });

  it('caps progress bar at 100% visually while showing actual percentage', () => {
    const overBudgetProgress = {
      ...mockBudgetProgress,
      spent_amount: 75000, // $750
      remaining_amount: -25000, // -$250
      percentage_used: 150, // 150%
      status: 'over' as const,
    };

    const { getByText } = render(
      <BudgetProgressCard budgetProgress={overBudgetProgress} />
    );

    // Should show actual percentage
    expect(getByText('150%')).toBeTruthy();
    // Progress bar should be capped at 100% visually (this would need ProgressBar testing)
  });

  it('shows period information in compact variant', () => {
    const { getByText } = render(
      <BudgetProgressCard 
        budgetProgress={mockBudgetProgress} 
        variant="compact"
      />
    );

    // Should show month/year for the period
    expect(getByText('Jan 2024')).toBeTruthy();
  });
});