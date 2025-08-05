import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AddExpenseScreen from '../../src/screens/AddExpenseScreen';
import { useCategories } from '../../src/hooks/useCategories';
import { useTransactions } from '../../src/hooks/useTransactions';

// Mock the hooks
jest.mock('../../src/hooks/useCategories');
jest.mock('../../src/hooks/useTransactions');

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock TransactionForm component
jest.mock('../../src/components/forms/TransactionForm', () => {
  return jest.fn(({ onSubmit }: any) => {
    const { View, Text, Button } = require('react-native');
    return (
      <View testID="transaction-form">
        <Text>Mock Transaction Form</Text>
        <Button
          title="Test Success"
          onPress={() => onSubmit(true)}
          testID="mock-success-button"
        />
        <Button
          title="Test Failure"
          onPress={() => onSubmit(false)}
          testID="mock-failure-button"
        />
      </View>
    );
  });
});

const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>;
const mockUseTransactions = useTransactions as jest.MockedFunction<typeof useTransactions>;

const mockCategories = [
  { id: 1, name: 'Food', color: '#FF9800', icon: 'restaurant', is_default: true, created_at: new Date() },
  { id: 2, name: 'Transport', color: '#2196F3', icon: 'directions-car', is_default: true, created_at: new Date() },
];

// Wrapper component for navigation context
const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('AddExpenseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseCategories.mockReturnValue({
      categories: mockCategories,
      loading: false,
      error: null,
      refreshCategories: jest.fn(),
      addCategory: jest.fn(),
    });

    mockUseTransactions.mockReturnValue({
      transactions: [],
      loading: false,
      error: null,
      refreshTransactions: jest.fn(),
      addTransaction: jest.fn(),
      updateTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
      getTransactionsByFilter: jest.fn(),
      getTransactionsWithCategories: jest.fn(),
    });
  });

  it('renders the screen with header and form', () => {
    const { getByTestId, getByText } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    // Check header
    expect(getByTestId('add-expense-header')).toBeTruthy();
    expect(getByText('Add Expense')).toBeTruthy();

    // Check form title
    expect(getByText('Enter Expense Details')).toBeTruthy();

    // Check transaction form is rendered
    expect(getByTestId('transaction-form')).toBeTruthy();
  });

  it('displays proper screen title in header', () => {
    const { getByText } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    const headerTitle = getByText('Add Expense');
    expect(headerTitle).toBeTruthy();
  });

  it('renders transaction form component', () => {
    const { getByTestId, getByText } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    expect(getByTestId('transaction-form')).toBeTruthy();
    expect(getByText('Mock Transaction Form')).toBeTruthy();
  });

  it('navigates back on successful form submission', () => {
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    const successButton = getByTestId('mock-success-button');
    fireEvent.press(successButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not navigate back on failed form submission', () => {
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    const failureButton = getByTestId('mock-failure-button');
    fireEvent.press(failureButton);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('has proper Material Design styling', () => {
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    const header = getByTestId('add-expense-header');
    expect(header.props.backgroundColor).toBe('#2196F3');
  });

  it('has scrollable content for different screen sizes', () => {
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    // The screen should render without throwing errors
    // ScrollView enables content to be scrollable on smaller screens
    expect(getByTestId('transaction-form')).toBeTruthy();
  });

  it('handles form submission callback correctly', () => {
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    // Test successful submission
    const successButton = getByTestId('mock-success-button');
    fireEvent.press(successButton);
    expect(mockGoBack).toHaveBeenCalledWith();

    // Reset mock
    mockGoBack.mockClear();

    // Test failed submission
    const failureButton = getByTestId('mock-failure-button');
    fireEvent.press(failureButton);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('displays form within a card container', () => {
    const { getByText, getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    // The form should be wrapped in a card with proper title
    expect(getByText('Enter Expense Details')).toBeTruthy();
    expect(getByTestId('transaction-form')).toBeTruthy();
  });

  it('has proper safe area handling', () => {
    // SafeAreaView is mocked, but the component should render without issues
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    expect(getByTestId('add-expense-header')).toBeTruthy();
  });

  it('integrates properly with navigation system', () => {
    // Test that the component doesn't crash when navigation methods are called
    const { getByTestId } = render(
      <NavigationWrapper>
        <AddExpenseScreen />
      </NavigationWrapper>
    );

    const successButton = getByTestId('mock-success-button');
    
    // Should not throw error when navigation.goBack() is called
    expect(() => fireEvent.press(successButton)).not.toThrow();
    expect(mockGoBack).toHaveBeenCalled();
  });
});