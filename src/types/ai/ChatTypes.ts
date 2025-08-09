export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIResponse {
  content: string;
  embeddedData?: EmbeddedFinancialData;
  suggestedActions?: string[];
}

export interface EmbeddedFinancialData {
  type: 'budget_card' | 'transaction_list' | 'category_breakdown' | 'analytics';
  data: any;
  title?: string;
}

export interface AIQueryContext {
  currentScreen?: string;
  userPreferences?: any;
  recentTransactions?: any[];
  activeBudgets?: any[];
}