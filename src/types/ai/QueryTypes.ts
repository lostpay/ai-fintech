import type { QueryType, FinancialIntent, QueryEntity, ProcessingType, ParsedQuery } from './AITypes';

export interface QueryClassification {
  type: QueryType;
  confidence: number;
  intent: FinancialIntent;
  entities: QueryEntity[];
  processingType: ProcessingType;
}

export interface QueryParsingResult {
  originalQuery: string;
  parsedQuery: ParsedQuery;
  classification: QueryClassification;
  isValid: boolean;
  errors?: string[];
  suggestions?: string[];
}

export interface QueryTemplate {
  pattern: RegExp;
  queryType: QueryType;
  intent: FinancialIntent;
  requiredEntities: string[];
  examples: string[];
}

export interface QueryValidationResult {
  isValid: boolean;
  missingEntities?: string[];
  errors?: string[];
  confidence: number;
}