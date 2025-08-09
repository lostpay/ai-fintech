import PrivacyManager from '../../../src/services/ai/PrivacyManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('PrivacyManager', () => {
  let privacyManager: PrivacyManager;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    privacyManager = PrivacyManager.getInstance();
  });

  describe('Initialization', () => {
    it('initializes with default preferences', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      await privacyManager.initialize();
      const preferences = privacyManager.getPrivacyPreferences();
      
      expect(preferences.processingType).toBe('on-device');
      expect(preferences.allowCloudProcessing).toBe(false);
    });

    it('loads existing preferences from storage', async () => {
      const storedPreferences = {
        processingType: 'hugging-face',
        allowCloudProcessing: true,
        anonymizationLevel: 'minimal',
        consentTimestamp: new Date().toISOString(),
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPreferences));
      
      await privacyManager.initialize();
      const preferences = privacyManager.getPrivacyPreferences();
      
      expect(preferences.processingType).toBe('hugging-face');
      expect(preferences.allowCloudProcessing).toBe(true);
    });
  });

  describe('Privacy Preferences Management', () => {
    it('updates privacy preferences', async () => {
      await privacyManager.updatePrivacyPreferences({
        processingType: 'hugging-face',
        allowCloudProcessing: true,
      });

      const preferences = privacyManager.getPrivacyPreferences();
      expect(preferences.processingType).toBe('hugging-face');
      expect(preferences.allowCloudProcessing).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Consent Management', () => {
    it('grants consent for on-device processing', async () => {
      const hasConsent = await privacyManager.requestConsent(
        'query_processing',
        'on-device',
        ['financial_data']
      );

      expect(hasConsent).toBe(true);
    });

    it('requires explicit consent for cloud processing', async () => {
      const hasConsent = await privacyManager.requestConsent(
        'query_processing',
        'hugging-face',
        ['financial_data']
      );

      expect(hasConsent).toBe(false); // Should require user consent
    });

    it('grants consent when cloud processing is already allowed', async () => {
      await privacyManager.updatePrivacyPreferences({
        allowCloudProcessing: true,
      });

      const hasConsent = await privacyManager.requestConsent(
        'query_processing',
        'hugging-face',
        ['financial_data']
      );

      expect(hasConsent).toBe(true);
    });
  });

  describe('Data Anonymization', () => {
    const mockTransactions = [
      {
        id: 1,
        amount: 2500, // $25 in cents
        description: 'Coffee at Starbucks',
        category: { name: 'Dining' },
        date: new Date('2023-01-01'),
        transaction_type: 'expense' as const,
      },
    ];

    it('anonymizes transactions with minimal level', () => {
      const anonymized = privacyManager.anonymizeTransactions(mockTransactions, 'minimal');
      
      expect(anonymized[0].amount).toBe(2500); // Amount preserved
      expect(anonymized[0].description).toBe('Coffee at Starbucks'); // Description preserved for minimal
      expect(anonymized[0].id).toMatch(/^tx_[a-z0-9]+$/); // ID anonymized
    });

    it('anonymizes transactions with full level', () => {
      const anonymized = privacyManager.anonymizeTransactions(mockTransactions, 'full');
      
      expect(anonymized[0].amount).toBe(2500); // Rounded to nearest $5 (500 cents)
      expect(anonymized[0].description).toBe('expense_transaction'); // Generic description
      expect(anonymized[0].category).toBe('Category_undefined'); // Category anonymized
    });

    it('preserves data with none level', () => {
      const anonymized = privacyManager.anonymizeTransactions(mockTransactions, 'none');
      
      expect(anonymized[0].amount).toBe(2500);
      expect(anonymized[0].description).toBe('Coffee at Starbucks');
      expect(anonymized[0].category).toBe('Dining');
    });
  });

  describe('Processing Type Determination', () => {
    it('requires on-device processing for sensitive data', () => {
      const shouldProcessOnDevice = privacyManager.shouldProcessOnDevice([
        'financial_amounts',
        'personal_descriptions',
      ]);

      expect(shouldProcessOnDevice).toBe(true);
    });

    it('allows cloud processing for non-sensitive data with consent', async () => {
      await privacyManager.updatePrivacyPreferences({
        processingType: 'hugging-face',
        allowCloudProcessing: true,
      });

      const shouldProcessOnDevice = privacyManager.shouldProcessOnDevice([
        'general_queries',
      ]);

      expect(shouldProcessOnDevice).toBe(false);
    });
  });

  describe('UI Indicators', () => {
    it('provides correct indicator for on-device processing', () => {
      const indicator = privacyManager.getProcessingTypeIndicator('on-device');
      
      expect(indicator.icon).toBe('security');
      expect(indicator.label).toBe('On-device processing');
      expect(indicator.color).toBe('#4CAF50');
    });

    it('provides correct indicator for cloud processing', () => {
      const indicator = privacyManager.getProcessingTypeIndicator('hugging-face');
      
      expect(indicator.icon).toBe('cloud');
      expect(indicator.label).toBe('Cloud AI processing');
      expect(indicator.color).toBe('#2196F3');
    });
  });

  describe('Consent History', () => {
    it('logs consent actions', async () => {
      await privacyManager.requestConsent(
        'test_action',
        'on-device',
        ['test_data']
      );

      const history = await privacyManager.getConsentHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('test_action');
      expect(history[0].processingType).toBe('on-device');
      expect(history[0].granted).toBe(true);
    });

    it('returns empty history when no consent logged', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const history = await privacyManager.getConsentHistory();
      expect(history).toEqual([]);
    });
  });
});