/**
 * AI Backend Client Service
 * Manages HTTP communication with the chatbot gateway service.
 * Provides query processing, session management, and health monitoring.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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

// Determine base URL based on environment (Expo config, env var, or platform default)
const getBaseUrl = () => {
  const expoUrl = Constants.expoConfig?.extra?.chatbotApiUrl;
  if (expoUrl) {
    console.log('Using Chatbot API URL from Expo config:', expoUrl);
    return expoUrl;
  }

  if (process.env.EXPO_PUBLIC_CHATBOT_API_URL) {
    console.log('Using Chatbot API URL from env:', process.env.EXPO_PUBLIC_CHATBOT_API_URL);
    return process.env.EXPO_PUBLIC_CHATBOT_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    return 'http://192.168.1.103:7000';
  }

  const defaultUrl = Platform.select({
    ios: 'http://localhost:7000',
    android: 'http://192.168.1.103:7000',
    web: 'http://192.168.1.103:7000',
    default: 'http://192.168.1.103:7000'
  });

  console.log('Using default Chatbot API URL:', defaultUrl);
  return defaultUrl;
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

  // Load or create a persistent session ID from async storage
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
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Execute HTTP request with automatic retries on failure
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

  // Check if error is retryable (network errors, timeouts, 5xx responses)
  private shouldRetry(error: any): boolean {
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      (error.message && error.message.includes('HTTP 50'))
    );
  }

  // Asynchronous delay utility for retry backoff
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Send natural language query to chatbot and receive structured response
  async processQuery(query: string, context?: Record<string, any>): Promise<AIQueryResponse> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    const request = {
      user_id: context?.user_id || 'default-user',
      message: query,
      lang: context?.lang || 'en',
      session_id: this.sessionId
    };

    const response = await this.makeRequest<any>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // Normalize chatbot response to standard AIQueryResponse format
    return {
      message: response.text || response.message,
      confidence: response.confidence || 0.95,
      query_type: response.type || 'general',
      processing_type: 'backend',
      embedded_data: response.data ? {
        component_type: 'data',
        title: 'Query Results',
        data: response.data,
        size: 'medium'
      } : undefined,
      suggested_actions: [],
      model_used: 'qwen2.5:7b',
      processing_time_ms: 0
    };
  }

  // Retrieve conversation history (not implemented in chatbot backend)
  async getConversationHistory(): Promise<ConversationHistoryResponse> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    return {
      session_id: this.sessionId || '',
      exchanges: [],
      total_exchanges: 0,
      session_start: new Date().toISOString()
    };
  }

  // Reset conversation by generating new session ID
  async clearConversationHistory(): Promise<void> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('@ai_session_id', this.sessionId);
  }

  // Return predefined query suggestions (backend endpoint not available)
  async getQuerySuggestions(): Promise<string[]> {
    return [
      'How much did I spend this month?',
      'Show my budget status',
      'What are my recent transactions?',
      'Show spending by category'
    ];
  }

  // Verify backend service is running and healthy
  async checkHealth(): Promise<HealthResponse> {
    const response = await this.makeRequest<any>('/health');
    return {
      status: response.status || 'unknown',
      message: response.message || 'Chatbot Gateway Service',
      version: '1.0.0',
      timestamp: response.timestamp || new Date().toISOString(),
      components: response.components
    };
  }

  /**
   * Check detailed backend health
   */
  async checkDetailedHealth(): Promise<HealthResponse> {
    // Chatbot backend only has /health endpoint
    return this.checkHealth();
  }

  /**
   * Run system tests
   */
  async runSystemTest(): Promise<any> {
    // Not available in chatbot backend, return health check instead
    return this.checkHealth();
  }

  /**
   * Get AI models status
   */
  async getModelsStatus(): Promise<any> {
    // Not available in chatbot backend
    return { status: 'using_chatbot_backend', model: 'qwen2.5:7b' };
  }

  // Database Methods

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    // Chatbot backend doesn't have this endpoint
    // Return mock stats for now
    return {
      total_transactions: 0,
      total_categories: 0,
      total_budgets: 0,
      date_range: {
        earliest: null,
        latest: null
      }
    };
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

    // Chatbot backend doesn't have this endpoint
    return [];
  }

  /**
   * Get budgets information
   */
  async getBudgets(): Promise<any> {
    // Chatbot backend doesn't have this endpoint
    return [];
  }

  /**
   * Get categories information
   */
  async getCategories(): Promise<any> {
    // Chatbot backend doesn't have this endpoint
    return [];
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

    // Chatbot backend doesn't have this endpoint
    return { total: 0, by_category: {} };
  }

  // Utility Methods

  /**
   * Test backend connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      console.log('🔍 Testing chatbot backend connectivity...');
      const result = await this.makeRequest('/health');
      console.log('✅ Chatbot backend connectivity test successful:', result);
      return result.status === 'healthy';
    } catch (error) {
      console.error('❌ Chatbot backend connectivity test failed:', error);
      console.log('🔧 Attempted URL:', `${this.baseUrl}/health`);
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
      const result = await this.makeRequest('/health');
      return {
        url: this.baseUrl,
        connected: result.status === 'healthy',
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