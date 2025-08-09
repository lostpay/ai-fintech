import ConversationManager from '../../../src/services/ai/ConversationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../../../src/services/DatabaseService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock DatabaseService
jest.mock('../../../src/services/DatabaseService', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      getAllCategories: jest.fn(() => Promise.resolve([
        { id: 1, name: 'Groceries', color: '#4CAF50', icon: 'shopping-cart' },
      ])),
      getAllBudgets: jest.fn(() => Promise.resolve([
        { id: 1, amount: 50000, category: { name: 'Groceries' } },
      ])),
    })),
  },
}));

// Mock LangChain BufferMemory
jest.mock('@langchain/core/memory', () => ({
  BufferMemory: jest.fn().mockImplementation(() => ({
    chatHistory: {
      addUserMessage: jest.fn(),
      addAIChatMessage: jest.fn(),
    },
  })),
}));

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    conversationManager = ConversationManager.getInstance();
  });

  describe('Initialization', () => {
    it('initializes successfully', async () => {
      await expect(conversationManager.initialize()).resolves.not.toThrow();
    });

    it('loads existing conversation from storage', async () => {
      const mockConversationData = {
        id: 'test-conv',
        context: {
          focusedBudgets: [],
          focusedCategories: [],
          timeframe: null,
          lastQueryType: '',
          embeddedComponents: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@conversation_context') {
          return Promise.resolve(JSON.stringify(mockConversationData));
        }
        if (key === '@conversation_history') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });

      await conversationManager.initialize();
      const context = conversationManager.getConversationContext();
      
      expect(context).toBeTruthy();
      expect(context?.focusedBudgets).toEqual([]);
    });
  });

  describe('Conversation Management', () => {
    it('starts new conversation', async () => {
      const conversationId = await conversationManager.startNewConversation();
      
      expect(conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('adds messages to conversation', async () => {
      await conversationManager.startNewConversation();
      
      const message = {
        id: 'msg1',
        content: 'Test message',
        role: 'user' as const,
        timestamp: new Date(),
        status: 'sent' as const,
      };

      await conversationManager.addMessage(message);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@conversation_history',
        expect.stringContaining('Test message')
      );
    });
  });

  describe('Follow-up Query Processing', () => {
    beforeEach(async () => {
      await conversationManager.startNewConversation();
      await conversationManager.updateConversationContext({
        focusedCategories: ['1'],
        focusedBudgets: ['1'],
        lastQueryType: 'budget',
      });
    });

    it('handles referential queries for transactions', async () => {
      const result = await conversationManager.handleFollowUpQuery(
        'Show me those transactions',
        {}
      );

      expect(result.contextualQuery).toContain('previously shown transactions');
      expect(result.enhancedContext).toBeTruthy();
    });

    it('handles category reference queries', async () => {
      const result = await conversationManager.handleFollowUpQuery(
        'Which categories are these?',
        {}
      );

      expect(result.contextualQuery).toContain('categories:');
      expect(result.referenceData.categories).toBeTruthy();
    });

    it('maintains topic focus for related queries', async () => {
      const result = await conversationManager.maintainTopicFocus(
        'What about my budget?',
        { currentScreen: 'ai_chat' }
      );

      expect(result.userPreferences?.focusedBudgets).toEqual(['1']);
    });
  });

  describe('Context Updates', () => {
    it('updates conversation context', async () => {
      await conversationManager.startNewConversation();
      
      const updates = {
        focusedCategories: ['1', '2'],
        lastQueryType: 'spending',
      };

      await conversationManager.updateConversationContext(updates);
      
      const context = conversationManager.getConversationContext();
      expect(context?.focusedCategories).toEqual(['1', '2']);
      expect(context?.lastQueryType).toBe('spending');
    });

    it('persists context to storage', async () => {
      await conversationManager.startNewConversation();
      await conversationManager.updateConversationContext({
        focusedCategories: ['1'],
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@conversation_context',
        expect.stringContaining('"focusedCategories":["1"]')
      );
    });
  });

  describe('Conversation History', () => {
    it('returns empty history for new conversation', () => {
      const history = conversationManager.getConversationHistory();
      expect(history).toEqual([]);
    });

    it('clears conversation data', async () => {
      await conversationManager.clearConversation();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@conversation_context');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@conversation_history');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@langchain_memory');
    });
  });
});