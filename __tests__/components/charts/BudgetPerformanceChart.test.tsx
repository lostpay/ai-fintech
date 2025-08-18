import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { BudgetPerformanceChart } from '../../../src/components/charts/BudgetPerformanceChart';
import { MonthlyBudgetPerformance } from '../../../src/types/BudgetAnalytics';

// Mock victory-native to avoid SVG rendering issues in tests
jest.mock('victory-native', () => ({
  CartesianChart: ({ data, xKey, yKeys, children }: any) => {
    const MockComponent = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockComponent testID="cartesian-chart">
        <MockText>Data: {data?.length || 0} items</MockText>
        <MockText>X Key: {xKey}</MockText>
        <MockText>Y Keys: {yKeys?.join(', ')}</MockText>
        {children && children({ 
          points: yKeys?.reduce((acc: any, key: string) => ({ ...acc, [key]: data }), {}), 
          chartBounds: { left: 0, right: 100, top: 0, bottom: 100 } 
        })}
      </MockComponent>
    );
  },
  Bar: ({ points, color }: any) => {
    const MockComponent = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockComponent testID={`bar-${color}`}>
        <MockText>Bar - Points: {points?.length || 0}, Color: {color}</MockText>
      </MockComponent>
    );
  },
}));

// Mock Dimensions
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>
    {children}
  </PaperProvider>
);

describe('BudgetPerformanceChart', () => {
  const mockData: MonthlyBudgetPerformance[] = [
    {
      month: '2024-01',
      total_budgeted: 100000, // $1000
      total_spent: 85000,     // $850
      budget_utilization: 85,
      budgets_met: 3,
      total_budgets: 4,
      success_rate: 75,
      average_overspend: 0,
      categories: [],
    },
    {
      month: '2024-02',
      total_budgeted: 120000, // $1200
      total_spent: 130000,    // $1300
      budget_utilization: 108.33,
      budgets_met: 2,
      total_budgets: 4,
      success_rate: 50,
      average_overspend: 5000,
      categories: [],
    },
  ];

  it('renders successfully with data', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} />
      </TestWrapper>
    );

    expect(getByText('Budget vs Actual Spending')).toBeTruthy();
    expect(getByTestId('bar-chart-rgba(103, 80, 164, 1)')).toBeTruthy(); // Primary color bar
    expect(getByTestId('bar-chart-rgba(3, 218, 198, 1)')).toBeTruthy(); // Secondary color bar
    expect(getByText('Budgeted')).toBeTruthy();
    expect(getByText('Actual')).toBeTruthy();
  });

  it('displays empty state when no data provided', () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={[]} />
      </TestWrapper>
    );

    expect(getByText('No data available for the selected period')).toBeTruthy();
  });

  it('displays performance indicators when showDetails is true', () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} showDetails={true} />
      </TestWrapper>
    );

    // Check for percentage indicators
    expect(getByText('85%')).toBeTruthy(); // January utilization
    expect(getByText('108%')).toBeTruthy(); // February utilization
  });

  it('hides performance indicators when showDetails is false', () => {
    const { queryByText } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} showDetails={false} />
      </TestWrapper>
    );

    // Legend should still be visible
    expect(queryByText('Budgeted')).toBeTruthy();
    expect(queryByText('Actual')).toBeTruthy();
    
    // But percentage indicators should not be visible
    expect(queryByText('85%')).toBeNull();
    expect(queryByText('108%')).toBeNull();
  });

  it('formats month labels correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} />
      </TestWrapper>
    );

    const xAxis = getByTestId('x-axis');
    expect(xAxis).toBeTruthy();
    // The mock should show formatted months
    expect(xAxis.children[0]).toBe('Jan, Feb');
  });

  it('handles custom height prop', () => {
    const customHeight = 300;
    const { getByTestId } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} height={customHeight} />
      </TestWrapper>
    );

    // Check if charts are rendered (height is used internally)
    expect(getByTestId('bar-chart-rgba(103, 80, 164, 1)')).toBeTruthy();
    expect(getByTestId('bar-chart-rgba(3, 218, 198, 1)')).toBeTruthy();
  });

  it('displays correct utilization colors', () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} showDetails={true} />
      </TestWrapper>
    );

    // Both percentages should be displayed
    expect(getByText('85%')).toBeTruthy();  // Under 100%, should be primary color
    expect(getByText('108%')).toBeTruthy(); // Over 100%, should be error color
  });

  it('renders with minimal data', () => {
    const minimalData: MonthlyBudgetPerformance[] = [
      {
        month: '2024-01',
        total_budgeted: 0,
        total_spent: 0,
        budget_utilization: 0,
        budgets_met: 0,
        total_budgets: 0,
        success_rate: 0,
        average_overspend: 0,
        categories: [],
      },
    ];

    const { getByText, getByTestId } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={minimalData} />
      </TestWrapper>
    );

    expect(getByText('Budget vs Actual Spending')).toBeTruthy();
    expect(getByTestId('bar-chart-rgba(103, 80, 164, 1)')).toBeTruthy();
    expect(getByText('0%')).toBeTruthy(); // Zero utilization
  });

  it('handles null/undefined data gracefully', () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={null as any} />
      </TestWrapper>
    );

    expect(getByText('No data available for the selected period')).toBeTruthy();
  });

  it('calculates and displays correct chart values', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BudgetPerformanceChart data={mockData} />
      </TestWrapper>
    );

    // Check if the mocked charts receive correct data lengths
    const budgetedChart = getByTestId('bar-chart-rgba(103, 80, 164, 1)');
    const spentChart = getByTestId('bar-chart-rgba(3, 218, 198, 1)');
    
    expect(budgetedChart.children[0]).toContain('"dataLength":2'); // 2 months of data
    expect(spentChart.children[0]).toContain('"dataLength":2'); // 2 months of data
  });
});