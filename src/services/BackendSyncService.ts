import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/Transaction';
import { Budget } from '../types/Budget';
import { Category } from '../types/Category';

// DEPRECATED: This service is no longer needed since we use a single shared database
// Keeping for backward compatibility but all methods now return success without actual syncing

interface BackendConfig {
  baseUrl: string;
  timeout: number;
  enabled: boolean;
}

interface SyncResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

interface TransactionSyncData {
  amount: number;
  description: string;
  category_name: string;
  transaction_type: 'expense' | 'income';
  date: string;
  source?: string;
}

interface BudgetSyncData {
  category_name: string;
  amount: number;
  period_start: string;
  period_end: string;
  source?: string;
}

interface CategorySyncData {
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  source?: string;
}

export class BackendSyncService {
  private static instance: BackendSyncService;
  private config: BackendConfig = {
    baseUrl: 'http://localhost:8000/api',
    timeout: 10000,
    enabled: false // Disabled by default since we use single database
  };

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): BackendSyncService {
    if (!BackendSyncService.instance) {
      BackendSyncService.instance = new BackendSyncService();
    }
    return BackendSyncService.instance;
  }

  /**
   * Load configuration from AsyncStorage
   */
  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('backend_sync_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load backend sync config:', error);
    }
  }

  /**
   * Save configuration to AsyncStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('backend_sync_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save backend sync config:', error);
    }
  }

  /**
   * Configure the backend sync service
   */
  public async configure(config: Partial<BackendConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfig();
  }

  /**
   * Enable or disable backend sync
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;
    await this.saveConfig();
  }

  /**
   * Check if backend sync is enabled and configured
   */
  public isEnabled(): boolean {
    return this.config.enabled && !!this.config.baseUrl;
  }

  /**
   * Test connection to backend
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled()) {
      return { success: false, message: 'Backend sync is disabled' };
    }

    try {
      const response = await this.makeRequest('/database/health', 'GET');
      if (response.ok) {
        const data = await response.json();
        return { 
          success: data.health?.status === 'healthy', 
          message: data.health?.status || 'Unknown status' 
        };
      } else {
        return { success: false, message: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  /**
   * Sync a transaction to the backend (DEPRECATED - returns success without syncing)
   */
  public async syncTransaction(transaction: Transaction, categoryName?: string): Promise<boolean> {
    // No longer needed since we use single shared database
    // Return success for backward compatibility
    console.log('BackendSyncService.syncTransaction: No sync needed - using shared database');
    return true;
  }

  /**
   * Sync a budget to the backend (DEPRECATED - returns success without syncing)
   */
  public async syncBudget(budget: Budget, categoryName?: string): Promise<boolean> {
    // No longer needed since we use single shared database
    // Return success for backward compatibility
    console.log('BackendSyncService.syncBudget: No sync needed - using shared database');
    return true;
  }

  /**
   * Sync a category to the backend (DEPRECATED - returns success without syncing)
   */
  public async syncCategory(category: Category): Promise<boolean> {
    // No longer needed since we use single shared database
    // Return success for backward compatibility
    console.log('BackendSyncService.syncCategory: No sync needed - using shared database');
    return true;
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<{ 
    lastSync: string | null; 
    totalSynced: number; 
    failures: number; 
  }> {
    try {
      const stats = await AsyncStorage.getItem('backend_sync_stats');
      if (stats) {
        return JSON.parse(stats);
      }
    } catch (error) {
      console.warn('Failed to load sync stats:', error);
    }
    
    return { lastSync: null, totalSynced: 0, failures: 0 };
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStats(success: boolean): Promise<void> {
    try {
      const stats = await this.getSyncStats();
      stats.lastSync = new Date().toISOString();
      
      if (success) {
        stats.totalSynced += 1;
      } else {
        stats.failures += 1;
      }

      await AsyncStorage.setItem('backend_sync_stats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to update sync stats:', error);
    }
  }

  /**
   * Make HTTP request to backend
   */
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    body?: any
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FinanceFlow-Mobile/1.0',
      },
    };

    // Set timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    options.signal = controller.signal;

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Any cleanup logic if needed
  }
}

export default BackendSyncService;