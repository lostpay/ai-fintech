export interface AIQueryContext {
  userId?: string;
  sessionId: string;
  timestamp: Date;
  previousQueries?: string[];
  currentScreen?: string;
  userPreferences?: any;
  recentTransactions?: any[];
  activeBudgets?: any[];
}

export interface AIResponse {
  message: string;
  content: string;
  confidence: number;
  queryType: QueryType;
  embeddedData?: import('./EmbeddedDataTypes').EmbeddedFinancialData;
  suggestedActions?: string[];
  financialData?: FinancialData;
  error?: string;
  suggestions?: string[];
}

export interface FinancialData {
  amount?: number;
  transactions?: any[];
  budgetStatus?: any;
  timeframe?: string;
  categories?: string[];
}

export interface ParsedQuery {
  intent: string;
  entities: QueryEntity[];
  timeframe?: TimeFrame;
  category?: string;
  amount?: number;
}

export interface QueryEntity {
  type: 'amount' | 'category' | 'timeframe' | 'action' | 'merchant' | 'top_n';
  value: string;
  confidence: number;
}

export interface TimeFrame {
  type: 'month' | 'week' | 'year' | 'day' | 'custom';
  value: string;
  startDate?: Date;
  endDate?: Date;
}

export type QueryType = 
  | 'spending_summary'
  | 'budget_status' 
  | 'balance_inquiry'
  | 'transaction_search'
  | 'unknown';

export type FinancialIntent = 
  | 'spending_analysis'
  | 'budget_check'
  | 'balance_inquiry'
  | 'transaction_lookup'
  | 'unknown';

export type ProcessingType = 'on-device' | 'hugging-face';

export interface ModelConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}