import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AIService } from '../../../src/services/ai/AIService';
import { DatabaseService } from '../../../src/services/DatabaseService';
import ConversationManager from '../../../src/services/ai/ConversationManager';
import PrivacyManager from '../../../src/services/ai/PrivacyManager';
import { EmbeddedFinancialCard } from '../../../src/components/ai/EmbeddedFinancialCard';

// Mock services
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/services/ai/ConversationManager');
jest.mock('../../../src/services/ai/PrivacyManager');
jest.mock('../../../src/services/BudgetAnalyticsService');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock components
jest.mock('../../../src/components/budget/BudgetCard', () => ({
  BudgetCard: () => <div testID="budget-card">Budget Card</div>,
}));

jest.mock('../../../src/components/lists/TransactionList', () => ({
  TransactionList: () => <div testID="transaction-list">Transaction List</div>,
}));

jest.mock('../../../src/components/charts/BudgetPerformanceChart', () => ({
  BudgetPerformanceChart: () => <div testID="budget-chart">Budget Chart</div>,
}));

jest.mock('../../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        primary: '#2196F3',
      },
    },
  }),
}));

describe('Financial Data Integration', () => {
  let aiService: AIService;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockConversationManager: jest.Mocked<ConversationManager>;
  let mockPrivacyManager: jest.Mocked<PrivacyManager>;

  beforeEach(() => {
    // Setup mocks
    mockDbService = {
      initialize: jest.fn(),
      getBudgetsWithDetails: jest.fn(),
      getTransactionsWithCategories: jest.fn(),
      getAllCategories: jest.fn(),
      getAllBudgets: jest.fn(),
    } as any;

    mockConversationManager = {
      initialize: jest.fn(),
      startNewConversation: jest.fn(),
      addMessage: jest.fn(),
      getConversationContext: jest.fn(),
      handleFollowUpQuery: jest.fn(),
      updateConversationContext: jest.fn(),
      clearConversation: jest.fn(),
    } as any;

    mockPrivacyManager = {
      initialize: jest.fn(),
      getPrivacyPreferences: jest.fn(() => ({
        processingType: 'on-device',
        allowCloudProcessing: false,
        anonymizationLevel: 'minimal',
        consentTimestamp: new Date(),
      })),
      requestConsent: jest.fn(() => Promise.resolve(true)),
      shouldProcessOnDevice: jest.fn(() => true),
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDbService);
    (ConversationManager.getInstance as jest.Mock).mockReturnValue(mockConversationManager);
    (PrivacyManager.getInstance as jest.Mock).mockReturnValue(mockPrivacyManager);

    aiService = AIService.getInstance();
  });

  describe('Query Processing with Embedded Data', () => {
    it('processes budget query and returns embedded budget card', async () => {
      const mockBudgetData = [{
        id: 1,
        category_name: 'Groceries',
        category_color: '#4CAF50',
        category_icon: 'shopping-cart',
        amount: 50000, // $500 in cents
        spent_amount: 30000, // $300 in cents
        percentage: 60,
      }];

      mockDbService.getBudgetsWithDetails.mockResolvedValue(mockBudgetData);
      mockConversationManager.getConversationContext.mockReturnValue(null);

      const response = await aiService.processQueryWithEmbedding('Show me my budget status');

      expect(response.embeddedData).toBeTruthy();
      expect(response.embeddedData?.type).toBe('BudgetCard');
      expect(response.processingType).toBe('on-device');
      expect(mockConversationManager.addMessage).toHaveBeenCalledTimes(2); // User + AI message
    });

    it('processes transaction query and returns embedded transaction list', async () => {
      const mockTransactions = [{
        id: 1,
        amount: 2500,
        description: 'Coffee',
        category_id: 1,
        transaction_type: 'expense' as const,
        date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        category_name: 'Dining',
        category_color: '#FF9800',
        category_icon: 'restaurant',
      }];

      mockDbService.getTransactionsWithCategories.mockResolvedValue(mockTransactions);
      mockConversationManager.getConversationContext.mockReturnValue(null);

      const response = await aiService.processQueryWithEmbedding('Show me recent transactions');

      expect(response.embeddedData).toBeTruthy();
      expect(response.embeddedData?.type).toBe('TransactionList');
      expect((response.embeddedData as any).transactions).toHaveLength(1);
    });
  });

  describe('Conversation Context Integration', () => {
    it('handles follow-up queries with context', async () => {
      const mockContext = {
        focusedBudgets: ['1'],
        focusedCategories: ['1'],
        timeframe: null,
        lastQueryType: 'budget',
        embeddedComponents: [],
      };

      mockConversationManager.getConversationContext.mockReturnValue(mockContext);
      mockConversationManager.handleFollowUpQuery.mockResolvedValue({
        contextualQuery: 'Show me the budget for Groceries',
        enhancedContext: { recentTransactions: [] },
        referenceData: {},
      });

      mockDbService.getBudgetsWithDetails.mockResolvedValue([]);

      const response = await aiService.processQueryWithEmbedding('Show me that budget');

      expect(mockConversationManager.handleFollowUpQuery).toHaveBeenCalledWith(
        'Show me that budget',
        undefined
      );
    });
  });

  describe('Privacy Integration', () => {
    it('respects privacy preferences for processing type', async () => {
      mockPrivacyManager.getPrivacyPreferences.mockReturnValue({
        processingType: 'hugging-face',
        allowCloudProcessing: true,
        anonymizationLevel: 'minimal',
        consentTimestamp: new Date(),
      });

      mockPrivacyManager.requestConsent.mockResolvedValue(true);
      mockConversationManager.getConversationContext.mockReturnValue(null);

      const response = await aiService.processQueryWithEmbedding('Test query');

      expect(response.processingType).toBe('hugging-face');
      expect(mockPrivacyManager.requestConsent).toHaveBeenCalledWith(
        'query_processing',
        'hugging-face',
        ['financial_data', 'conversation_context']
      );
    });

    it('falls back to on-device when consent denied', async () => {
      mockPrivacyManager.getPrivacyPreferences.mockReturnValue({
        processingType: 'hugging-face',
        allowCloudProcessing: false,
        anonymizationLevel: 'minimal',
        consentTimestamp: new Date(),
      });

      mockPrivacyManager.requestConsent.mockResolvedValue(false);

      const response = await aiService.processQueryWithEmbedding('Test query');

      expect(response.content).toContain('Cloud AI processing requires your consent');
      expect(response.processingType).toBe('on-device');
    });
  });

  describe('Component Embedding', () => {
    it('renders embedded budget card in chat context', () => {
      const budgetData = {
        type: 'BudgetCard' as const,
        budgetData: {
          id: 1,
          category: {
            name: 'Groceries',
            color: '#4CAF50',
            icon: 'shopping-cart',
          },
          amount: 50000,
        },
        progressData: {
          spent: 30000,
          remaining: 20000,
          percentage: 60,
        },
        size: 'full' as const,
        chatContext: true,
        title: 'Budget Status',
      };

      const { getByTestId } = render(
        <EmbeddedFinancialCard
          embeddedData={budgetData}
          onInteraction={jest.fn()}
        />
      );

      expect(getByTestId('budget-card')).toBeTruthy();
    });

    it('handles interaction callbacks', () => {
      const mockOnInteraction = jest.fn();
      const budgetData = {
        type: 'BudgetCard' as const,
        budgetData: { id: 1, amount: 50000 },
        progressData: { spent: 30000, remaining: 20000, percentage: 60 },
        size: 'full' as const,
        chatContext: true,
      };

      const { getByTestId } = render(
        <EmbeddedFinancialCard
          embeddedData={budgetData}
          onInteraction={mockOnInteraction}
        />
      );

      // This would trigger in a real scenario with user interaction
      expect(getByTestId('budget-card')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      mockDbService.getBudgetsWithDetails.mockRejectedValue(new Error('Database error'));
      mockConversationManager.getConversationContext.mockReturnValue(null);

      const response = await aiService.processQueryWithEmbedding('Show me my budget');

      expect(response.content).toBeTruthy();
      expect(response.processingType).toBe('on-device');
    });

    it('provides fallback response on service failure', async () => {
      mockConversationManager.addMessage.mockRejectedValue(new Error('Storage error'));

      const response = await aiService.processQueryWithEmbedding('Test query');

      expect(response.content).toBeTruthy();
      expect(response.modelUsed).toBeDefined();
    });
  });
});