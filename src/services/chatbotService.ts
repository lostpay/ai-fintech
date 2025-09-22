/**
 * Chatbot Service for React Native App
 * Handles communication with the AI chatbot backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_CHATBOT_API_URL || 'http://192.168.1.103:7000';
const DEFAULT_LANGUAGE = 'zh';

// Types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  data?: any;
  sources?: Source[];
  confidence?: number;
}

export interface Source {
  id: string;
  title: string;
  content: string;
  score: number;
}

export interface ChatResponse {
  type: 'final' | 'streaming';
  text: string;
  data?: any;
  sources?: Source[];
  confidence: number;
}

export interface ExpenseData {
  columns: string[];
  rows: any[][];
  summary?: string;
}

class ChatbotService {
  private sessionId: string;
  private userId: string;
  private language: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = 'user_default';
    this.language = DEFAULT_LANGUAGE;
    this.loadUserSettings();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load user settings from storage
   */
  private async loadUserSettings() {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const language = await AsyncStorage.getItem('language');

      if (userId) this.userId = userId;
      if (language) this.language = language;
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }

  /**
   * Set user ID
   */
  public async setUserId(userId: string) {
    this.userId = userId;
    await AsyncStorage.setItem('userId', userId);
  }

  /**
   * Set language preference
   */
  public async setLanguage(language: 'zh' | 'en') {
    this.language = language;
    await AsyncStorage.setItem('language', language);
  }

  /**
   * Send a message to the chatbot
   */
  public async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
          message: message,
          lang: this.language,
          session_id: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get chat history from local storage
   */
  public async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const historyJson = await AsyncStorage.getItem(`chat_history_${this.sessionId}`);
      if (historyJson) {
        return JSON.parse(historyJson);
      }
      return [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  /**
   * Save chat history to local storage
   */
  public async saveChatHistory(messages: ChatMessage[]) {
    try {
      await AsyncStorage.setItem(
        `chat_history_${this.sessionId}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  /**
   * Clear chat history
   */
  public async clearChatHistory() {
    try {
      await AsyncStorage.removeItem(`chat_history_${this.sessionId}`);
      this.sessionId = this.generateSessionId();
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }

  /**
   * Format expense data for display
   */
  public formatExpenseData(data: any): ExpenseData | null {
    if (!data || !Array.isArray(data)) {
      return null;
    }

    if (data.length === 0) {
      return {
        columns: [],
        rows: [],
        summary: this.language === 'zh' ? '没有找到数据' : 'No data found',
      };
    }

    // Extract columns from first row
    const columns = Object.keys(data[0]);

    // Convert to rows array
    const rows = data.map(item => columns.map(col => item[col]));

    // Generate summary if it's expense data
    let summary = '';
    if (columns.includes('total_amount')) {
      const total = data[0].total_amount;
      summary = this.language === 'zh'
        ? `总计: ¥${total?.toFixed(2) || '0.00'}`
        : `Total: $${total?.toFixed(2) || '0.00'}`;
    }

    return {
      columns,
      rows,
      summary,
    };
  }

  /**
   * Check service health
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ChatbotService();