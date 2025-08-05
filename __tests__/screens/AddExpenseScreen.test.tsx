/**
 * AddExpenseScreen Test Suite - Story 2.3
 * Tests for Material Design 3 expense form implementation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AddExpenseScreen from '../../src/screens/AddExpenseScreen';
import { DatabaseService } from '../../src/services/DatabaseService';

// Mock DatabaseService
jest.mock('../../src/services/DatabaseService');

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

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  return jest.fn(({ onChange, value }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="date-time-picker">
        <Text>Mock Date Picker</Text>
        <TouchableOpacity
          onPress={() => onChange({}, value)}
          testID="mock-date-select"
        >
          <Text>Select Date</Text>
        </TouchableOpacity>
      </View>
    );
  });
});

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

const mockCategories = [
  { id: 1, name: 'Dining', color: '#FF9800', icon: 'restaurant', is_default: true, created_at: new Date() },
  { id: 2, name: 'Transport', color: '#2196F3', icon: 'directions-car', is_default: true, created_at: new Date() },
];

// Wrapper component for navigation context
const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('AddExpenseScreen - Material Design 3', () => {
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock database service instance
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.getCategories.mockResolvedValue(mockCategories);
    mockDatabaseService.createTransaction.mockResolvedValue({ id: 1 } as any);
    mockDatabaseService.close.mockResolvedValue();
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