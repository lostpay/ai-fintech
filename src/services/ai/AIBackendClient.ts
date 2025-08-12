/**
 * AI Backend Client Service
 * Handles communication with the FastAPI AI backend
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Types
export interface AIQueryRequest {
  query: string;
  session_id?: string;
  context?: Record<string, any>;
  user_id?: string;
}

export interface AIQueryResponse {
  message: string;
  confidence: number;
  query_type: string;
  processing_type: string;
  embedded_data?: EmbeddedComponentData;
  suggested_actions: string[];
  conversation_context?: AIQueryContext;
  model_used?: string;
  processing_time_ms?: number;
}

export interface EmbeddedComponentData {
  component_type: string;
  title: string;
  data: Record<string, any>;
  size: string;
}

export interface AIQueryContext {
  session_id: string;
  timestamp: string;
  conversation_history: string[];
  last_query_type?: string;
}

export interface ConversationHistoryResponse {
  session_id: string;
  exchanges: ConversationExchange[];
  total_exchanges: number;
  session_start: string;
}

export interface ConversationExchange {
  query: string;
  response: {
    message: string;
    confidence: number;
    query_type: string;
    processing_type: string;
  };
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  version: string;
  timestamp: string;
  components?: Record<string, string>;
}

export interface DatabaseStats {
  total_transactions: number;
  total_categories: number;
  total_budgets: number;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  last_transaction_date?: string;
}

// Configuration with environment detection
const getBaseUrl = () => {
  // Check if we're in web environment (Expo web, browser)
  if (typeof window !== 'undefined' && window.location) {
    return 'http://localhost:8000/api'; // Web/browser environment
  }
  
  // Mobile platform detection
  return Platform.select({
    ios: 'http://localhost:8000/api', // iOS simulator uses localhost
    android: 'http://192.168.1.12:8000/api', // Real Android device - your computer's IP
    web: 'http://localhost:8000/api', // Web browser
    default: 'http://localhost:8000/api'
  });
};

const DEFAULT_CONFIG = {
  baseUrl: getBaseUrl(),
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000
};

export class AIBackendClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private sessionId: string | null = null;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl;
    this.timeout = config.timeout || DEFAULT_CONFIG.timeout;
    this.retries = config.retries || DEFAULT_CONFIG.retries;
    this.retryDelay = config.retryDelay || DEFAULT_CONFIG.retryDelay;
    
    console.log('🌐 AIBackendClient initialized with baseUrl:', this.baseUrl);
    console.log('🔧 Timeout:', this.timeout, 'Retries:', this.retries);
    
    this.initializeSession();
  }

  /**
   * Initialize session ID
   */
  private async initializeSession(): Promise<void> {
    try {
      let sessionId = await AsyncStorage.getItem('@ai_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@ai_session_id', sessionId);
      }
      this.sessionId = sessionId;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Fallback to in-memory session
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (retryCount === 0) {
      console.log(`🚀 Making request to: ${url}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Request timeout after ${this.timeout}ms: ${url}`);
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`❌ HTTP Error ${response.status}: ${response.statusText} for ${url}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (retryCount === 0) {
        console.log(`✅ Request successful: ${url}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (retryCount < this.retries && this.shouldRetry(error)) {
        console.warn(`Request failed, retrying (${retryCount + 1}/${this.retries}):`, error);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and certain HTTP errors
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      (error.message && error.message.includes('HTTP 50'))
    );
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // AI Query Methods

  /**
   * Process a natural language financial query
   */
  async processQuery(query: string, context?: Record<string, any>): Promise<AIQueryResponse> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    const request: AIQueryRequest = {
      query,
      session_id: this.sessionId,
      context,
    };

    return this.makeRequest<AIQueryResponse>('/ai/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get conversation history for current session
   */
  async getConversationHistory(): Promise<ConversationHistoryResponse> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    return this.makeRequest<ConversationHistoryResponse>(`/ai/conversation/${this.sessionId}`);
  }

  /**
   * Clear conversation history for current session
   */
  async clearConversationHistory(): Promise<void> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    await this.makeRequest(`/ai/conversation/${this.sessionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get smart query suggestions based on conversation context
   */
  async getQuerySuggestions(): Promise<string[]> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    const response = await this.makeRequest<{ suggestions: string[] }>(`/ai/session/${this.sessionId}/suggestions`);
    return response.suggestions;
  }

  // Health and System Methods

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health');
  }

  /**
   * Check detailed backend health
   */
  async checkDetailedHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health/detailed');
  }

  /**
   * Run system tests
   */
  async runSystemTest(): Promise<any> {
    return this.makeRequest('/ai/system/test');
  }

  /**
   * Get AI models status
   */
  async getModelsStatus(): Promise<any> {
    return this.makeRequest('/ai/models/status');
  }

  // Database Methods

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    return this.makeRequest<DatabaseStats>('/database/stats');
  }

  /**
   * Get transactions with optional filtering
   */
  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    category?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/database/transactions?${queryString}` : '/database/transactions';
    
    return this.makeRequest(endpoint);
  }

  /**
   * Get budgets information
   */
  async getBudgets(): Promise<any> {
    return this.makeRequest('/database/budgets');
  }

  /**
   * Get categories information
   */
  async getCategories(): Promise<any> {
    return this.makeRequest('/database/categories');
  }

  /**
   * Get spending summary
   */
  async getSpendingSummary(params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value);
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/database/spending-summary?${queryString}` : '/database/spending-summary';
    
    return this.makeRequest(endpoint);
  }

  // Utility Methods

  /**
   * Test backend connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      console.log('🔍 Testing backend connectivity...');
      const result = await this.makeRequest('/ping');
      console.log('✅ Backend connectivity test successful:', result);
      return true;
    } catch (error) {
      console.error('❌ Backend connectivity test failed:', error);
      console.log('🔧 Attempted URL:', `${this.baseUrl}/ping`);
      return false;
    }
  }

  /**
   * Get detailed connection status for debugging
   */
  async getConnectionStatus(): Promise<{
    url: string;
    connected: boolean;
    error?: string;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    
    try {
      await this.makeRequest('/ping');
      return {
        url: this.baseUrl,
        connected: true,
        timestamp
      };
    } catch (error) {
      return {
        url: this.baseUrl,
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp
      };
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Reset session (creates new session ID)
   */
  async resetSession(): Promise<void> {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      await AsyncStorage.setItem('@ai_session_id', this.sessionId);
    } catch (error) {
      console.error('Failed to save new session ID:', error);
    }
  }

  /**
   * Update backend configuration
   */
  updateConfig(config: Partial<typeof DEFAULT_CONFIG>): void {
    this.baseUrl = config.baseUrl || this.baseUrl;
    this.timeout = config.timeout || this.timeout;
    this.retries = config.retries || this.retries;
    this.retryDelay = config.retryDelay || this.retryDelay;
  }
}

// Singleton instance
let backendClientInstance: AIBackendClient | null = null;

/**
 * Get singleton instance of AIBackendClient
 */
export const getAIBackendClient = (): AIBackendClient => {
  if (!backendClientInstance) {
    backendClientInstance = new AIBackendClient();
  }
  return backendClientInstance;
};

/**
 * Initialize AIBackendClient with custom configuration
 */
export const initializeAIBackendClient = (config: Partial<typeof DEFAULT_CONFIG>): AIBackendClient => {
  backendClientInstance = new AIBackendClient(config);
  return backendClientInstance;
};