import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { HistoryScreen } from '../../src/screens/HistoryScreen';
import { databaseService } from '../../src/services';

// Mock the database service
jest.mock('../../src/services', () => ({
  databaseService: {
    initialize: jest.fn(),
    getTransactionsWithCategories: jest.fn(),
  },
}));

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

const mockTransactionsWithCategories = [
  {
    id: 1,
    amount: 2550,
    description: 'Test transaction',
    category_id: 1,
    transaction_type: 'expense' as const,
    date: new Date('2024-01-15T12:00:00Z'),
    created_at: new Date('2024-01-15T12:00:00Z'),
    updated_at: new Date('2024-01-15T12:00:00Z'),
    category_name: 'Dining',
    category_color: '#FF9800',
    category_icon: 'restaurant',
  },
];

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully and loads transactions', async () => {
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.getTransactionsWithCategories.mockResolvedValue(mockTransactionsWithCategories);

    const { getByTestId } = render(<HistoryScreen />);

    // Wait for data to load
    await waitFor(() => {
      expect(getByTestId('transaction-list')).toBeTruthy();
    });

    expect(mockDatabaseService.initialize).toHaveBeenCalled();
    expect(mockDatabaseService.getTransactionsWithCategories).toHaveBeenCalled();
  });

  it('handles loading state', async () => {
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.getTransactionsWithCategories.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 1000))
    );

    const { getByText } = render(<HistoryScreen />);

    expect(getByText('Loading transactions...')).toBeTruthy();
  });

  it('handles error state', async () => {
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.getTransactionsWithCategories.mockRejectedValue(
      new Error('Database error')
    );

    const { getByText } = render(<HistoryScreen />);

    await waitFor(() => {
      expect(getByText('Error Loading Transactions')).toBeTruthy();
      expect(getByText('Database error')).toBeTruthy();
    });
  });

  it('displays empty state when no transactions', async () => {
    mockDatabaseService.initialize.mockResolvedValue();
    mockDatabaseService.getTransactionsWithCategories.mockResolvedValue([]);

    const { getByText } = render(<HistoryScreen />);

    await waitFor(() => {
      expect(getByText('No Transactions Yet')).toBeTruthy();
    });
  });
});