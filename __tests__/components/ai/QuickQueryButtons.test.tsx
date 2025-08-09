import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import QuickQueryButtons from '../../../src/components/ai/QuickQueryButtons';

const MockedQuickQueryButtons = ({ onQuickQuery, disabled = false }) => (
  <PaperProvider>
    <QuickQueryButtons onQuickQuery={onQuickQuery} disabled={disabled} />
  </PaperProvider>
);

describe('QuickQueryButtons', () => {
  it('renders correctly', () => {
    const mockOnQuickQuery = jest.fn();
    const { getByTestId } = render(
      <MockedQuickQueryButtons onQuickQuery={mockOnQuickQuery} />
    );
    
    expect(getByTestId('quick-queries-title')).toBeTruthy();
    expect(getByTestId('quick-queries-subtitle')).toBeTruthy();
    expect(getByTestId('quick-query-0')).toBeTruthy();
    expect(getByTestId('quick-query-1')).toBeTruthy();
  });

  it('calls onQuickQuery when button is pressed', () => {
    const mockOnQuickQuery = jest.fn();
    const { getByTestId } = render(
      <MockedQuickQueryButtons onQuickQuery={mockOnQuickQuery} />
    );
    
    const firstButton = getByTestId('quick-query-0');
    fireEvent.press(firstButton);
    
    expect(mockOnQuickQuery).toHaveBeenCalledWith('Show me my spending summary for this month');
  });

  it('does not call onQuickQuery when disabled', () => {
    const mockOnQuickQuery = jest.fn();
    const { getByTestId } = render(
      <MockedQuickQueryButtons onQuickQuery={mockOnQuickQuery} disabled={true} />
    );
    
    const firstButton = getByTestId('quick-query-0');
    fireEvent.press(firstButton);
    
    expect(mockOnQuickQuery).not.toHaveBeenCalled();
  });

  it('renders all quick query buttons', () => {
    const mockOnQuickQuery = jest.fn();
    const { getByTestId } = render(
      <MockedQuickQueryButtons onQuickQuery={mockOnQuickQuery} />
    );
    
    // Should have 4 quick query buttons based on QUICK_QUERIES array
    expect(getByTestId('quick-query-0')).toBeTruthy();
    expect(getByTestId('quick-query-1')).toBeTruthy();
    expect(getByTestId('quick-query-2')).toBeTruthy();
    expect(getByTestId('quick-query-3')).toBeTruthy();
  });
});