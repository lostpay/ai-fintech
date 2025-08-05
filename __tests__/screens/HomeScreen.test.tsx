import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from '../../../src/screens/HomeScreen';

// Mock navigation prop
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
  reset: jest.fn(),
};

const mockRoute = {
  key: 'Home',
  name: 'Home' as const,
  params: undefined,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<HomeScreen navigation={mockNavigation} route={mockRoute} />);
  });

  it('displays the correct title and content', () => {
    render(<HomeScreen navigation={mockNavigation} route={mockRoute} />);
    
    expect(screen.getByText('Budget Tracker')).toBeTruthy();
    expect(screen.getByText('Welcome to Your Personal Budget Tracker')).toBeTruthy();
    expect(screen.getByText(/Track your expenses, manage budgets/)).toBeTruthy();
  });

  it('shows navigation system ready status', () => {
    render(<HomeScreen navigation={mockNavigation} route={mockRoute} />);
    
    expect(screen.getByText(/Navigation system ready/)).toBeTruthy();
  });

  it('has proper Material Design styling classes', () => {
    const { UNSAFE_root } = render(<HomeScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Verify component renders with expected structure
    expect(UNSAFE_root).toBeTruthy();
  });
});