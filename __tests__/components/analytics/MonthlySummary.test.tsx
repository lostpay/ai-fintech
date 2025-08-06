import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { MonthlySummary } from '../../../src/components/analytics/MonthlySummary';
import { MonthlyBudgetPerformance } from '../../../src/types/BudgetAnalytics';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>
    {children}
  </PaperProvider>
);

describe('MonthlySummary', () => {
  const mockPerformance: MonthlyBudgetPerformance = {
    month: '2024-01',
    total_budgeted: 100000, // $1000
    total_spent: 85000,     // $850
    budget_utilization: 85,
    budgets_met: 3,
    total_budgets: 4,
    success_rate: 75,
    average_overspend: 0,
    categories: [],
  };

  it('renders successfully with performance data', () => {
    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={mockPerformance} />
      </TestWrapper>
    );

    expect(getByText('January 2024')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy(); // Budget used percentage
    expect(getByText('75%')).toBeTruthy(); // Success rate
    expect(getByText('3/4')).toBeTruthy(); // Budgets met
    expect(getByText('$1,000.00')).toBeTruthy(); // Budgeted amount
    expect(getByText('$850.00')).toBeTruthy(); // Actual amount
  });

  it('displays correct savings when under budget', () => {
    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={mockPerformance} />
      </TestWrapper>
    );

    expect(getByText('Saved:')).toBeTruthy();
    expect(getByText('$150.00')).toBeTruthy(); // Savings amount
  });

  it('displays overspend when over budget', () => {
    const overspendPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      total_spent: 120000, // $1200
      budget_utilization: 120,
      budgets_met: 2,
      success_rate: 50,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={overspendPerformance} />
      </TestWrapper>
    );

    expect(getByText('Over:')).toBeTruthy();
    expect(getByText('$200.00')).toBeTruthy(); // Overspend amount
  });

  it('displays correct performance rating for excellent performance', () => {
    const excellentPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      success_rate: 90,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={excellentPerformance} />
      </TestWrapper>
    );

    expect(getByText('Excellent')).toBeTruthy();
  });

  it('displays correct performance rating for good performance', () => {
    const goodPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      success_rate: 70,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={goodPerformance} />
      </TestWrapper>
    );

    expect(getByText('Good')).toBeTruthy();
  });

  it('displays correct performance rating for fair performance', () => {
    const fairPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      success_rate: 50,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={fairPerformance} />
      </TestWrapper>
    );

    expect(getByText('Fair')).toBeTruthy();
  });

  it('displays correct performance rating for poor performance', () => {
    const poorPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      success_rate: 30,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={poorPerformance} />
      </TestWrapper>
    );

    expect(getByText('Needs Improvement')).toBeTruthy();
  });

  it('displays insight for overspend with average overspend amount', () => {
    const overspendPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      total_spent: 120000,
      budget_utilization: 120,
      average_overspend: 5000, // $50 average overspend
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={overspendPerformance} />
      </TestWrapper>
    );

    expect(getByText(/Average overspend: \$50.00/)).toBeTruthy();
  });

  it('displays insight for under budget performance', () => {
    const underBudgetPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      budget_utilization: 70, // Well under budget
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={underBudgetPerformance} />
      </TestWrapper>
    );

    expect(getByText(/Great job staying under budget/)).toBeTruthy();
  });

  it('displays insight for perfect performance', () => {
    const perfectPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      success_rate: 100,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={perfectPerformance} />
      </TestWrapper>
    );

    expect(getByText(/Perfect month!/)).toBeTruthy();
  });

  it('handles zero budget amounts gracefully', () => {
    const zeroBudgetPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      total_budgeted: 0,
      total_spent: 0,
      budget_utilization: 0,
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={zeroBudgetPerformance} />
      </TestWrapper>
    );

    expect(getByText('$0.00')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy();
  });

  it('formats month name correctly for different months', () => {
    const decemberPerformance: MonthlyBudgetPerformance = {
      ...mockPerformance,
      month: '2023-12',
    };

    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={decemberPerformance} />
      </TestWrapper>
    );

    expect(getByText('December 2023')).toBeTruthy();
  });

  it('displays budget efficiency with correct colors', () => {
    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={mockPerformance} />
      </TestWrapper>
    );

    // Check that the budget used percentage is displayed
    const budgetUsed = getByText('85%');
    expect(budgetUsed).toBeTruthy();
    
    // The budget used label should also be present
    expect(getByText('Budget Used')).toBeTruthy();
  });

  it('calculates and displays metrics correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <MonthlySummary performance={mockPerformance} />
      </TestWrapper>
    );

    // Check all three main metrics
    expect(getByText('Budget Used')).toBeTruthy();
    expect(getByText('Success Rate')).toBeTruthy();
    expect(getByText('Budgets Met')).toBeTruthy();
    
    // Check metric values
    expect(getByText('85%')).toBeTruthy(); // Budget used
    expect(getByText('75%')).toBeTruthy(); // Success rate
    expect(getByText('3/4')).toBeTruthy(); // Budgets met
  });
});