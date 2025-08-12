import { Transaction } from '../Transaction';
import { Budget } from '../Budget';
import { Category } from '../Category';

// Processing type for AI responses
export type ProcessingType = 'on-device' | 'hugging-face';

/**
 * Types for embedding financial components within AI chat responses
 */

// Component types that can be embedded
export type EmbeddedComponentType = 
  | 'BudgetCard' 
  | 'TransactionList' 
  | 'BudgetPerformanceChart'
  | 'CategoryBreakdownChart'
  | 'SpendingTrendChart';

// Size variants for embedded components in chat
export type EmbeddedComponentSize = 'compact' | 'full';

// Base interface for all embedded financial data
export interface BaseEmbeddedData {
  type: EmbeddedComponentType;
  title?: string;
  size: EmbeddedComponentSize;
  chatContext: boolean;
}

// Budget card embedding data
export interface EmbeddedBudgetCardData extends BaseEmbeddedData {
  type: 'BudgetCard';
  budgetData: Budget;
  progressData: {
    spent: number;
    remaining: number;
    percentage: number;
  };
}

// Transaction list embedding data
export interface EmbeddedTransactionListData extends BaseEmbeddedData {
  type: 'TransactionList';
  transactions: Transaction[];
  totalCount?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: Category[];
}

// Chart data interfaces
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface EmbeddedChartData extends BaseEmbeddedData {
  type: 'BudgetPerformanceChart' | 'CategoryBreakdownChart' | 'SpendingTrendChart';
  chartData: ChartDataPoint[];
  metadata: {
    totalAmount?: number;
    currency?: string;
    period?: string;
    categories?: Category[];
  };
}

// Union type for all embedded data types
export type EmbeddedFinancialData = 
  | EmbeddedBudgetCardData 
  | EmbeddedTransactionListData 
  | EmbeddedChartData;

// Props for the EmbeddedFinancialCard component
export interface EmbeddedFinancialCardProps {
  embeddedData: EmbeddedFinancialData;
  onInteraction?: (action: string, data?: any) => void;
  maxHeight?: number;
  style?: any;
}

// Configuration for responsive embedding
export interface EmbeddedComponentConfig {
  componentType: EmbeddedComponentType;
  defaultSize: EmbeddedComponentSize;
  allowResize: boolean;
  maxItems?: number; // For lists like TransactionList
  showControls: boolean; // Show interaction buttons
}

// Rendering props for embedded components
export interface EmbeddedRenderProps {
  compact?: boolean;
  maxHeight?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}

// Context data for maintaining conversation state
export interface ConversationFinancialContext {
  focusedBudgets: string[]; // Budget IDs currently being discussed
  focusedCategories: string[]; // Category IDs in focus
  timeframe: {
    start: Date;
    end: Date;
  } | null;
  lastQueryType: string;
  embeddedComponents: EmbeddedFinancialData[];
}

// Extended chat message with financial data embedding
export interface ExtendedChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  embeddedData?: EmbeddedFinancialData;
  processingType?: 'on-device' | 'hugging-face';
  modelUsed?: string;
  conversationContext?: ConversationFinancialContext;
}

// Response from AI service with embedded data
export interface AIResponseWithEmbedding {
  content: string;
  embeddedData?: EmbeddedFinancialData;
  suggestedActions?: string[];
  processingType: 'on-device' | 'hugging-face';
  modelUsed: string;
  contextUpdates?: Partial<ConversationFinancialContext>;
}

// Embedding utility functions interface
export interface EmbeddingUtilities {
  prepareData: (componentType: EmbeddedComponentType, rawData: any) => EmbeddedFinancialData;
  validateEmbedding: (embeddedData: EmbeddedFinancialData) => boolean;
  formatForChat: (embeddedData: EmbeddedFinancialData, size: EmbeddedComponentSize) => EmbeddedRenderProps;
  extractContextData: (embeddedData: EmbeddedFinancialData) => Partial<ConversationFinancialContext>;
}

// Error types for embedding failures
export interface EmbeddingError {
  type: 'data_validation' | 'component_render' | 'context_update';
  message: string;
  componentType?: EmbeddedComponentType;
  fallbackContent?: string;
}