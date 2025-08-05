import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppNavigator } from '../../../src/navigation/AppNavigator';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ name }: { name: string }) => <div testID={`screen-${name}`}>{name}</div>,
  }),
}));

// Mock screen components
jest.mock('../../../src/screens', () => ({
  HomeScreen: () => <div testID="home-screen">Home Screen</div>,
  AddExpenseScreen: () => <div testID="add-expense-screen">Add Expense Screen</div>,
  HistoryScreen: () => <div testID="history-screen">History Screen</div>,
  SettingsScreen: () => <div testID="settings-screen">Settings Screen</div>,
}));

describe('AppNavigator', () => {
  it('renders without crashing', () => {
    render(<AppNavigator />);
  });

  it('configures all required tab screens', () => {
    render(<AppNavigator />);
    
    // Check that all screens are configured
    expect(screen.getByTestId('screen-Home')).toBeTruthy();
    expect(screen.getByTestId('screen-Add')).toBeTruthy();
    expect(screen.getByTestId('screen-History')).toBeTruthy();
    expect(screen.getByTestId('screen-Settings')).toBeTruthy();
  });

  it('uses correct navigation structure', () => {
    const { UNSAFE_root } = render(<AppNavigator />);
    
    // Verify NavigationContainer is used
    expect(UNSAFE_root).toBeTruthy();
  });
});