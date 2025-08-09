import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../../types/Transaction';
import { Budget } from '../../types/Budget';
import { Category } from '../../types/Category';

// Storage keys for privacy preferences
const PRIVACY_STORAGE_KEYS = {
  PROCESSING_PREFERENCE: '@privacy_processing_preference',
  DATA_ANONYMIZATION: '@privacy_data_anonymization',
  CONSENT_HISTORY: '@privacy_consent_history',
};

// Privacy processing types
export type ProcessingType = 'on-device' | 'hugging-face';

// Data anonymization levels
export type AnonymizationLevel = 'none' | 'minimal' | 'full';

// User privacy preferences
export interface PrivacyPreferences {
  processingType: ProcessingType;
  anonymizationLevel: AnonymizationLevel;
  allowCloudProcessing: boolean;
  consentTimestamp: Date;
}

// Anonymized data structures
export interface AnonymizedTransaction {
  id: string;
  amount: number; // Preserved for analysis
  description: string; // Anonymized
  category: string; // Anonymized category name
  date: Date; // Preserved for trend analysis
  type: 'expense' | 'income';
}

export interface AnonymizedBudget {
  id: string;
  amount: number; // Preserved for analysis
  category: string; // Anonymized category name
  spentAmount: number; // Preserved for analysis
  percentage: number; // Calculated value
}

// Consent tracking
export interface ConsentRecord {
  action: string;
  timestamp: Date;
  processingType: ProcessingType;
  dataTypes: string[];
  granted: boolean;
}

/**
 * PrivacyManager handles data anonymization and privacy controls
 * for AI processing while maintaining analytical value
 */
export class PrivacyManager {
  private static instance: PrivacyManager;
  private preferences: PrivacyPreferences | null = null;

  private constructor() {}

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * Initialize privacy manager and load user preferences
   */
  async initialize(): Promise<void> {
    try {
      await this.loadPrivacyPreferences();
      console.log('PrivacyManager initialized successfully');
    } catch (error) {
      console.error('PrivacyManager initialization failed:', error);
      // Set default preferences
      this.preferences = this.getDefaultPreferences();
    }
  }

  /**
   * Get current privacy preferences
   */
  getPrivacyPreferences(): PrivacyPreferences {
    return this.preferences || this.getDefaultPreferences();
  }

  /**
   * Update privacy preferences
   */
  async updatePrivacyPreferences(preferences: Partial<PrivacyPreferences>): Promise<void> {
    this.preferences = {
      ...this.getPrivacyPreferences(),
      ...preferences,
      consentTimestamp: new Date(),
    };

    await this.savePrivacyPreferences();
    
    // Log consent change
    await this.logConsent('preference_update', preferences.processingType || 'on-device', ['preferences'], true);
  }

  /**
   * Request user consent for specific data processing
   */
  async requestConsent(
    action: string, 
    processingType: ProcessingType, 
    dataTypes: string[]
  ): Promise<boolean> {
    const preferences = this.getPrivacyPreferences();
    
    // Check existing consent
    if (processingType === 'on-device') {
      // On-device processing doesn't require additional consent
      await this.logConsent(action, processingType, dataTypes, true);
      return true;
    }

    if (processingType === 'hugging-face' && preferences.allowCloudProcessing) {
      // User has already consented to cloud processing
      await this.logConsent(action, processingType, dataTypes, true);
      return true;
    }

    // Need to request consent from user
    // This would typically show a consent dialog
    // For now, return false to indicate consent is needed
    await this.logConsent(action, processingType, dataTypes, false);
    return false;
  }

  /**
   * Anonymize transaction data for AI processing
   */
  anonymizeTransactions(
    transactions: Transaction[], 
    level: AnonymizationLevel = 'minimal'
  ): AnonymizedTransaction[] {
    return transactions.map(transaction => this.anonymizeTransaction(transaction, level));
  }

  /**
   * Anonymize budget data for AI processing
   */
  anonymizeBudgets(
    budgets: Budget[], 
    level: AnonymizationLevel = 'minimal'
  ): AnonymizedBudget[] {
    return budgets.map(budget => this.anonymizeBudget(budget, level));
  }

  /**
   * Determine if data should be processed on-device or cloud
   */
  shouldProcessOnDevice(dataTypes: string[]): boolean {
    const preferences = this.getPrivacyPreferences();
    
    // Always process on-device if that's the preference
    if (preferences.processingType === 'on-device') {
      return true;
    }

    // Check for sensitive data types that should stay on-device
    const sensitiveTypes = ['financial_amounts', 'personal_descriptions', 'detailed_transactions'];
    const hasSensitiveData = dataTypes.some(type => sensitiveTypes.includes(type));
    
    if (hasSensitiveData && !preferences.allowCloudProcessing) {
      return true;
    }

    return false;
  }

  /**
   * Get processing type indicator for UI display
   */
  getProcessingTypeIndicator(processingType: ProcessingType): {
    icon: string;
    label: string;
    color: string;
  } {
    switch (processingType) {
      case 'on-device':
        return {
          icon: 'security',
          label: 'On-device processing',
          color: '#4CAF50',
        };
      case 'hugging-face':
        return {
          icon: 'cloud',
          label: 'Cloud AI processing',
          color: '#2196F3',
        };
      default:
        return {
          icon: 'help',
          label: 'Unknown processing',
          color: '#FF9800',
        };
    }
  }

  /**
   * Get consent history for audit purposes
   */
  async getConsentHistory(): Promise<ConsentRecord[]> {
    try {
      const historyData = await AsyncStorage.getItem(PRIVACY_STORAGE_KEYS.CONSENT_HISTORY);
      if (historyData) {
        const history = JSON.parse(historyData);
        return history.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to get consent history:', error);
    }
    return [];
  }

  // Private helper methods

  private getDefaultPreferences(): PrivacyPreferences {
    return {
      processingType: 'on-device',
      anonymizationLevel: 'minimal',
      allowCloudProcessing: false,
      consentTimestamp: new Date(),
    };
  }

  private anonymizeTransaction(
    transaction: Transaction, 
    level: AnonymizationLevel
  ): AnonymizedTransaction {
    switch (level) {
      case 'none':
        return {
          id: transaction.id.toString(),
          amount: transaction.amount,
          description: transaction.description,
          category: 'Unknown',
          date: new Date(transaction.date),
          type: transaction.transaction_type,
        };
        
      case 'minimal':
        return {
          id: `tx_${Math.random().toString(36).substr(2, 9)}`,
          amount: transaction.amount,
          description: this.anonymizeDescription(transaction.description),
          category: 'Category',
          date: new Date(transaction.date),
          type: transaction.transaction_type,
        };
        
      case 'full':
        return {
          id: `tx_${Math.random().toString(36).substr(2, 9)}`,
          amount: this.roundAmount(transaction.amount),
          description: `${transaction.transaction_type}_transaction`,
          category: `Category_${transaction.category_id}`,
          date: this.anonymizeDate(new Date(transaction.date)),
          type: transaction.transaction_type,
        };
        
      default:
        return this.anonymizeTransaction(transaction, 'minimal');
    }
  }

  private anonymizeBudget(
    budget: Budget, 
    level: AnonymizationLevel
  ): AnonymizedBudget {
    switch (level) {
      case 'none':
        return {
          id: budget.id.toString(),
          amount: budget.amount,
          category: 'Unknown',
          spentAmount: 0,
          percentage: 0,
        };
        
      case 'minimal':
        return {
          id: `budget_${Math.random().toString(36).substr(2, 9)}`,
          amount: budget.amount,
          category: 'Category',
          spentAmount: 0,
          percentage: 0,
        };
        
      case 'full':
        return {
          id: `budget_${Math.random().toString(36).substr(2, 9)}`,
          amount: this.roundAmount(budget.amount),
          category: `Category_${budget.category_id}`,
          spentAmount: this.roundAmount(0),
          percentage: Math.round(0 / 10) * 10, // Round to nearest 10%
        };
        
      default:
        return this.anonymizeBudget(budget, 'minimal');
    }
  }

  private anonymizeDescription(description: string): string {
    // Replace specific merchant names and personal details with generic terms
    const patterns = [
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD_NUMBER]' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
    ];

    let anonymized = description;
    patterns.forEach(({ pattern, replacement }) => {
      anonymized = anonymized.replace(pattern, replacement);
    });

    return anonymized;
  }

  private roundAmount(amount: number): number {
    // Round to nearest $5 for privacy
    return Math.round(amount / 500) * 500; // amount is in cents
  }

  private anonymizeDate(date: Date): Date {
    // Round to nearest week for privacy
    const dayOfWeek = date.getDay();
    const anonymizedDate = new Date(date);
    anonymizedDate.setDate(date.getDate() - dayOfWeek);
    return anonymizedDate;
  }

  private async loadPrivacyPreferences(): Promise<void> {
    try {
      const preferencesData = await AsyncStorage.getItem(PRIVACY_STORAGE_KEYS.PROCESSING_PREFERENCE);
      if (preferencesData) {
        this.preferences = {
          ...JSON.parse(preferencesData),
          consentTimestamp: new Date(JSON.parse(preferencesData).consentTimestamp),
        };
      }
    } catch (error) {
      console.error('Failed to load privacy preferences:', error);
    }
  }

  private async savePrivacyPreferences(): Promise<void> {
    if (!this.preferences) return;

    try {
      const preferencesData = {
        ...this.preferences,
        consentTimestamp: this.preferences.consentTimestamp.toISOString(),
      };
      
      await AsyncStorage.setItem(
        PRIVACY_STORAGE_KEYS.PROCESSING_PREFERENCE, 
        JSON.stringify(preferencesData)
      );
    } catch (error) {
      console.error('Failed to save privacy preferences:', error);
    }
  }

  private async logConsent(
    action: string, 
    processingType: ProcessingType, 
    dataTypes: string[], 
    granted: boolean
  ): Promise<void> {
    try {
      const consentRecord: ConsentRecord = {
        action,
        timestamp: new Date(),
        processingType,
        dataTypes,
        granted,
      };

      const historyData = await AsyncStorage.getItem(PRIVACY_STORAGE_KEYS.CONSENT_HISTORY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      history.push({
        ...consentRecord,
        timestamp: consentRecord.timestamp.toISOString(),
      });

      // Keep only last 100 consent records
      const trimmedHistory = history.slice(-100);
      
      await AsyncStorage.setItem(
        PRIVACY_STORAGE_KEYS.CONSENT_HISTORY, 
        JSON.stringify(trimmedHistory)
      );
    } catch (error) {
      console.error('Failed to log consent:', error);
    }
  }
}

export default PrivacyManager;