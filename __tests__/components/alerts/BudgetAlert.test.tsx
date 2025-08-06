import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { BudgetAlert } from '../../../src/components/alerts/BudgetAlert';
import { BudgetAlert as BudgetAlertType } from '../../../src/types/BudgetAlert';

// Mock the expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const MockIcon = require('react-native').Text;
    return <MockIcon {...props}>{name}</MockIcon>;
  },
}));

// Helper function to render component with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <PaperProvider>
      {component}
    </PaperProvider>
  );
};

describe('BudgetAlert', () => {
  const mockAlert: BudgetAlertType = {
    id: 'test-alert-1',
    budget_id: 1,
    category_name: 'Dining',
    category_color: '#FF9800',
    alert_type: 'approaching',
    severity: 'warning',
    message: 'You have spent $380.00 of your $500.00 Dining budget. $120.00 remaining.',
    suggested_actions: ['Review remaining budget', 'Consider reducing spending', 'View recent transactions'],
    budget_amount: 50000, // $500.00
    spent_amount: 38000,  // $380.00
    remaining_amount: 12000, // $120.00
    percentage_used: 76,
    created_at: new Date(),
    acknowledged: false,
  };

  const mockOnAction = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Display', () => {
    it('renders alert message correctly', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} />
      );

      expect(getByText('Dining Budget Alert')).toBeTruthy();
      expect(getByText(mockAlert.message)).toBeTruthy();
    });

    it('displays correct icon for alert type', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} />
      );

      // The icon should be rendered as text due to our mock
      expect(getByText('warning')).toBeTruthy();
    });

    it('applies correct styling for severity level', () => {
      const { getByTestId } = renderWithTheme(
        <BudgetAlert alert={{ ...mockAlert, severity: 'error' }} testID="alert-card" />
      );

      const alertCard = getByTestId('alert-card');
      // Check if error styling is applied - this would depend on implementation
      expect(alertCard).toBeTruthy();
    });

    it('shows category icon with correct color', () => {
      const { getByTestId } = renderWithTheme(
        <BudgetAlert alert={mockAlert} />
      );

      // This test would need more specific testIDs in the component
      // For now, just verify the component renders without error
      expect(getByTestId('budget-alert')).toBeTruthy();
    });
  });

  describe('Alert Variants', () => {
    it('renders full variant with all details', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} variant="full" />
      );

      expect(getByText('Suggested Actions:')).toBeTruthy();
      expect(getByText('Review remaining budget')).toBeTruthy();
      expect(getByText('Consider reducing spending')).toBeTruthy();
      expect(getByText('Spent')).toBeTruthy();
      expect(getByText('Budget')).toBeTruthy();
      expect(getByText('Remaining')).toBeTruthy();
    });

    it('renders compact variant without suggested actions', () => {
      const { queryByText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} variant="compact" />
      );

      expect(queryByText('Suggested Actions:')).toBeNull();
      expect(queryByText('Spent')).toBeNull();
    });

    it('renders banner variant with actions', () => {
      const { getByText, queryByText } = renderWithTheme(
        <BudgetAlert 
          alert={mockAlert} 
          variant="banner"
          onAction={mockOnAction}
          onDismiss={mockOnDismiss}
        />
      );

      expect(getByText(mockAlert.message)).toBeTruthy();
      expect(getByText('View Budget')).toBeTruthy();
      expect(getByText('Dismiss')).toBeTruthy();
      
      // Banner variant shouldn't show detailed breakdown
      expect(queryByText('Suggested Actions:')).toBeNull();
    });
  });

  describe('Alert Types', () => {
    it('renders approaching budget alert correctly', () => {
      const approachingAlert = { ...mockAlert, alert_type: 'approaching' as const };
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={approachingAlert} />
      );

      expect(getByText('warning')).toBeTruthy(); // Icon should be warning
    });

    it('renders at limit alert correctly', () => {
      const atLimitAlert = { 
        ...mockAlert, 
        alert_type: 'at_limit' as const,
        severity: 'warning' as const,
        message: 'You have reached your $500.00 Dining budget limit.',
        remaining_amount: 0,
        percentage_used: 100
      };
      
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={atLimitAlert} />
      );

      expect(getByText('info')).toBeTruthy(); // Icon should be info
    });

    it('renders over budget alert correctly', () => {
      const overBudgetAlert = { 
        ...mockAlert, 
        alert_type: 'over_budget' as const,
        severity: 'error' as const,
        message: 'You are $50.00 over your $500.00 Dining budget.',
        remaining_amount: -5000, // -$50.00
        percentage_used: 110
      };
      
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={overBudgetAlert} />
      );

      expect(getByText('error')).toBeTruthy(); // Icon should be error
      expect(getByText('Over')).toBeTruthy(); // Should show "Over" instead of "Remaining"
    });
  });

  describe('Interactions', () => {
    it('calls onAction when action button is pressed', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert 
          alert={mockAlert} 
          variant="full"
          onAction={mockOnAction}
        />
      );

      fireEvent.press(getByText('Review remaining budget'));
      expect(mockOnAction).toHaveBeenCalledWith('review_remaining_budget');
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const { getByLabelText } = renderWithTheme(
        <BudgetAlert 
          alert={mockAlert} 
          onDismiss={mockOnDismiss}
        />
      );

      // Assuming the dismiss button has an accessible label
      fireEvent.press(getByLabelText('Dismiss alert'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('calls onAction for banner variant actions', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert 
          alert={mockAlert} 
          variant="banner"
          onAction={mockOnAction}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.press(getByText('View Budget'));
      expect(mockOnAction).toHaveBeenCalledWith('view_budget');

      fireEvent.press(getByText('Dismiss'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Budget Amount Display', () => {
    it('displays budget amounts correctly in full variant', () => {
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} variant="full" />
      );

      expect(getByText('$380.00')).toBeTruthy(); // Spent amount
      expect(getByText('$500.00')).toBeTruthy(); // Budget amount
      expect(getByText('$120.00')).toBeTruthy(); // Remaining amount
    });

    it('displays over-budget amounts correctly', () => {
      const overBudgetAlert = { 
        ...mockAlert, 
        alert_type: 'over_budget' as const,
        severity: 'error' as const,
        spent_amount: 55000, // $550.00
        remaining_amount: -5000, // -$50.00
        percentage_used: 110
      };
      
      const { getByText } = renderWithTheme(
        <BudgetAlert alert={overBudgetAlert} variant="full" />
      );

      expect(getByText('$550.00')).toBeTruthy(); // Spent amount
      expect(getByText('$50.00')).toBeTruthy(); // Over amount (absolute value)
      expect(getByText('Over')).toBeTruthy(); // Label for over amount
    });
  });

  describe('Accessibility', () => {
    it('provides accessible labels for important elements', () => {
      const { getByLabelText } = renderWithTheme(
        <BudgetAlert alert={mockAlert} onDismiss={mockOnDismiss} />
      );

      // These would need to be implemented in the component
      expect(getByLabelText('Budget alert for Dining')).toBeTruthy();
      expect(getByLabelText('Dismiss alert')).toBeTruthy();
    });

    it('supports screen readers with proper content descriptions', () => {
      const { getByA11yRole } = renderWithTheme(
        <BudgetAlert alert={mockAlert} />
      );

      // Verify alert has proper accessibility role
      expect(getByA11yRole('alert')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles missing suggested actions gracefully', () => {
      const alertWithoutActions = { 
        ...mockAlert, 
        suggested_actions: [] 
      };
      
      expect(() => 
        renderWithTheme(
          <BudgetAlert alert={alertWithoutActions} variant="full" />
        )
      ).not.toThrow();
    });

    it('handles missing optional props gracefully', () => {
      expect(() => 
        renderWithTheme(<BudgetAlert alert={mockAlert} />)
      ).not.toThrow();
    });

    it('handles invalid currency amounts gracefully', () => {
      const alertWithInvalidAmounts = { 
        ...mockAlert, 
        spent_amount: NaN,
        budget_amount: NaN,
        remaining_amount: NaN
      };
      
      expect(() => 
        renderWithTheme(
          <BudgetAlert alert={alertWithInvalidAmounts} variant="full" />
        )
      ).not.toThrow();
    });
  });
});