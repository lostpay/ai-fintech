import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import BudgetAnalyticsScreen from '../../src/screens/BudgetAnalyticsScreen';

// Mock the analytics hook
const mockUseBudgetAnalytics = {
  monthlyPerformance: [
    {
      month: '2024-01',
      total_budgeted: 100000,
      total_spent: 85000,
      budget_utilization: 85,
      budgets_met: 3,
      total_budgets: 4,
      success_rate: 75,
      average_overspend: 5000,
      categories: [
        {
          category_id: 1,
          category_name: 'Groceries',
          category_color: '#4CAF50',
          category_icon: 'shopping-cart',
          budgeted_amount: 50000,
          spent_amount: 45000,
          utilization_percentage: 90,
          status: 'under' as const,
          trend: 'stable' as const,
          consistency_score: 0.8,
          recommendations: ['Great job staying under budget!'],
        }
      ]
    }
  ],
  categoryPerformance: [
    {
      category_id: 1,
      category_name: 'Groceries',
      category_color: '#4CAF50',
      category_icon: 'shopping-cart',
      budgeted_amount: 50000,
      spent_amount: 45000,
      utilization_percentage: 90,
      status: 'under' as const,
      trend: 'stable' as const,
      consistency_score: 0.8,
      recommendations: ['Great job staying under budget!'],
    }
  ],
  successMetrics: {
    overall_success_rate: 75,
    current_streak: 2,
    best_streak: 3,
    average_overspend: 5000,
    most_successful_category: {
      category_id: 1,
      category_name: 'Groceries',
      utilization_percentage: 90,
      status: 'under' as const,
    },
    most_challenging_category: {
      category_id: 2,
      category_name: 'Entertainment',
      utilization_percentage: 120,
      status: 'over' as const,
    },
    improvement_trend: 'improving' as const,
    monthly_performance: [],
  },
  spendingTrends: [
    {
      period: '2024-01',
      amount: 85000,
      change_from_previous: 0,
      change_percentage: 0,
      trend_direction: 'stable' as const,
    }
  ],
  insights: [
    'Great improvement! Your budget success rate increased by 15% this month.',
    'You are consistently managing your Groceries budget well.'
  ],
  loading: false,
  error: null,
  refreshAnalytics: jest.fn(),
  changePeriod: jest.fn(),
  currentPeriod: '6m' as const,
  periodLabel: 'Last 6 Months',
  isEmpty: false,
};

jest.mock('../../src/hooks/useBudgetAnalytics', () => ({
  __esModule: true,
  default: () => mockUseBudgetAnalytics,
  useBudgetAnalyticsPeriods: () => [
    { label: '1 Month', value: '1m', months: 1 },
    { label: '3 Months', value: '3m', months: 3 },
    { label: '6 Months', value: '6m', months: 6 },
    { label: '1 Year', value: '1y', months: 12 },
  ],
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock chart components to avoid SVG rendering issues in tests
jest.mock('../../src/components/charts', () => ({
  BudgetPerformanceChart: ({ data }: any) => {
    const MockComponent = require('react-native').Text;
    return <MockComponent testID="budget-performance-chart">Budget Performance Chart: {data?.length || 0} months</MockComponent>;
  },
  SpendingTrendChart: ({ data }: any) => {
    const MockComponent = require('react-native').Text;
    return <MockComponent testID="spending-trend-chart">Spending Trend Chart: {data?.length || 0} trends</MockComponent>;
  },
  CategoryBreakdownChart: ({ data }: any) => {
    const MockComponent = require('react-native').Text;
    return <MockComponent testID="category-breakdown-chart">Category Breakdown Chart: {data?.length || 0} categories</MockComponent>;
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </PaperProvider>
);

describe('BudgetAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with analytics data', async () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Budget Analytics')).toBeTruthy();
      expect(getByText('Analysis Period')).toBeTruthy();
      expect(getByText('📊 Current Month Overview')).toBeTruthy();
      expect(getByText('📈 Budget vs Actual Spending')).toBeTruthy();
      expect(getByText('🏆 Budget Success Metrics')).toBeTruthy();
    });

    // Check if charts are rendered
    expect(getByTestId('budget-performance-chart')).toBeTruthy();
    expect(getByTestId('spending-trend-chart')).toBeTruthy();
    expect(getByTestId('category-breakdown-chart')).toBeTruthy();
  });

  it('displays loading state correctly', async () => {
    const loadingMock = {
      ...mockUseBudgetAnalytics,
      loading: true,
      monthlyPerformance: [],
    };

    jest.doMock('../../src/hooks/useBudgetAnalytics', () => ({
      __esModule: true,
      default: () => loadingMock,
      useBudgetAnalyticsPeriods: () => [],
    }));

    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Analyzing your budget performance...')).toBeTruthy();
    });
  });

  it('displays error state correctly', async () => {
    const errorMock = {
      ...mockUseBudgetAnalytics,
      loading: false,
      error: 'Failed to load analytics data',
      monthlyPerformance: [],
      isEmpty: true,
    };

    jest.doMock('../../src/hooks/useBudgetAnalytics', () => ({
      __esModule: true,
      default: () => errorMock,
      useBudgetAnalyticsPeriods: () => [],
    }));

    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Unable to Load Analytics')).toBeTruthy();
      expect(getByText('Failed to load analytics data')).toBeTruthy();
    });
  });

  it('displays empty state when no data available', async () => {
    const emptyMock = {
      ...mockUseBudgetAnalytics,
      loading: false,
      error: null,
      monthlyPerformance: [],
      categoryPerformance: [],
      successMetrics: null,
      isEmpty: true,
    };

    jest.doMock('../../src/hooks/useBudgetAnalytics', () => ({
      __esModule: true,
      default: () => emptyMock,
      useBudgetAnalyticsPeriods: () => [],
    }));

    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('No Analytics Data')).toBeTruthy();
      expect(getByText('Start creating budgets and adding expenses to see your budget performance analytics.')).toBeTruthy();
    });
  });

  it('handles period selection correctly', async () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('6M')).toBeTruthy();
    });

    // Test period change
    const period3M = getByText('3M');
    fireEvent.press(period3M);

    expect(mockUseBudgetAnalytics.changePeriod).toHaveBeenCalledWith('3m');
  });

  it('handles refresh functionality', async () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    // Find the refresh action button
    const refreshButton = getByLabelText('refresh');
    fireEvent.press(refreshButton);

    expect(mockUseBudgetAnalytics.refreshAnalytics).toHaveBeenCalled();
  });

  it('handles back navigation correctly', async () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    const backButton = getByLabelText('Back');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays insights section when insights are available', async () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('💡 Insights & Recommendations')).toBeTruthy();
      expect(getByText('Great improvement! Your budget success rate increased by 15% this month.')).toBeTruthy();
      expect(getByText('You are consistently managing your Groceries budget well.')).toBeTruthy();
    });
  });

  it('does not display sections when data is not available', async () => {
    const partialDataMock = {
      ...mockUseBudgetAnalytics,
      monthlyPerformance: [],
      categoryPerformance: [],
      spendingTrends: [],
      insights: [],
      successMetrics: null,
      isEmpty: false,
    };

    jest.doMock('../../src/hooks/useBudgetAnalytics', () => ({
      __esModule: true,
      default: () => partialDataMock,
      useBudgetAnalyticsPeriods: () => [
        { label: '6 Months', value: '6m', months: 6 },
      ],
    }));

    const { queryByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('📈 Budget vs Actual Spending')).toBeNull();
      expect(queryByText('🏆 Budget Success Metrics')).toBeNull();
      expect(queryByText('💡 Insights & Recommendations')).toBeNull();
    });
  });

  it('displays period subtitle correctly', async () => {
    const { getByText } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Showing data for last 6 months')).toBeTruthy();
    });
  });

  it('handles pull-to-refresh correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <BudgetAnalyticsScreen />
      </TestWrapper>
    );

    // Find the scroll view and trigger refresh
    const scrollView = getByTestId('analytics-scroll-view') || 
                      require('@testing-library/react-native').getAllByA11yRole('scrollView')[0];

    if (scrollView) {
      await act(async () => {
        fireEvent(scrollView, 'refresh');
      });

      expect(mockUseBudgetAnalytics.refreshAnalytics).toHaveBeenCalled();
    }
  });
});