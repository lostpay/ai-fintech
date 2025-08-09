import { AIService } from '../../../src/services/ai/AIService';
import { AIQueryContext } from '../../../src/types/ai';

// Mock the delay function for faster tests
jest.mock('../../../src/services/ai/AIService', () => {
  const actualModule = jest.requireActual('../../../src/services/ai/AIService');
  return {
    ...actualModule,
    AIService: class extends actualModule.AIService {
      private delay(ms: number): Promise<void> {
        return Promise.resolve(); // Remove delay for tests
      }
    }
  };
});

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = AIService.getInstance();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('processQuery', () => {
    it('returns response for budget queries', async () => {
      const response = await aiService.processQuery('Show me my budget');
      
      expect(response.content).toContain('budget');
      expect(response.embeddedData?.type).toBe('budget_card');
      expect(response.suggestedActions).toHaveLength(3);
    });

    it('returns response for transaction queries', async () => {
      const response = await aiService.processQuery('Show recent transactions');
      
      expect(response.content).toContain('transactions');
      expect(response.embeddedData?.type).toBe('transaction_list');
    });

    it('returns response for category queries', async () => {
      const response = await aiService.processQuery('Show spending by category');
      
      expect(response.content).toContain('category');
      expect(response.embeddedData?.type).toBe('category_breakdown');
    });

    it('returns default response for unknown queries', async () => {
      const response = await aiService.processQuery('Hello world');
      
      expect(response.content).toContain('Hello world');
      expect(response.suggestedActions).toBeDefined();
    });

    it('processes query with context', async () => {
      const context: AIQueryContext = {
        currentScreen: 'Home',
        userPreferences: {},
      };
      
      const response = await aiService.processQuery('Budget status', context);
      expect(response).toBeDefined();
    });
  });

  describe('getSuggestedQueries', () => {
    it('returns array of suggested queries', () => {
      const suggestions = aiService.getSuggestedQueries();
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('spent');
    });

    it('returns suggestions with context', () => {
      const context: AIQueryContext = {
        currentScreen: 'Budget',
      };
      
      const suggestions = aiService.getSuggestedQueries(context);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('validateQuery', () => {
    it('validates non-empty query', () => {
      const result = aiService.validateQuery('Valid query');
      expect(result.isValid).toBe(true);
    });

    it('rejects empty query', () => {
      const result = aiService.validateQuery('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects too long query', () => {
      const longQuery = 'a'.repeat(501);
      const result = aiService.validateQuery(longQuery);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('accepts query at character limit', () => {
      const maxQuery = 'a'.repeat(500);
      const result = aiService.validateQuery(maxQuery);
      expect(result.isValid).toBe(true);
    });
  });
});