// Chat and Conversation Types (existing)
export type { ChatMessage, Conversation } from './ChatTypes';

// Core AI Types (with overlapping types from AITypes taking precedence)
export type {
  AIQueryContext,
  AIResponse,
  FinancialData,
  ParsedQuery,
  QueryEntity,
  TimeFrame,
  QueryType,
  FinancialIntent,
  ProcessingType,
  ModelConfig
} from './AITypes';

// Query Processing Types  
export type {
  QueryClassification,
  QueryParsingResult,
  QueryTemplate,
  QueryValidationResult
} from './QueryTypes';

// Hugging Face Model Types
export type {
  HuggingFaceModel,
  ModelType,
  HuggingFaceConfig,
  ModelResponse,
  ClassificationResponse,
  ConversationalResponse,
  ModelLoadingState,
  HuggingFaceError
} from './HuggingFaceTypes';

// Embedded Financial Data Types
export type {
  EmbeddedComponentType,
  EmbeddedComponentSize,
  BaseEmbeddedData,
  EmbeddedBudgetCardData,
  EmbeddedTransactionListData,
  EmbeddedChartData,
  EmbeddedFinancialData,
  EmbeddedFinancialCardProps,
  EmbeddedComponentConfig,
  EmbeddedRenderProps,
  ConversationFinancialContext,
  ExtendedChatMessage,
  AIResponseWithEmbedding,
  EmbeddingUtilities,
  EmbeddingError,
  ChartDataPoint
} from './EmbeddedDataTypes';