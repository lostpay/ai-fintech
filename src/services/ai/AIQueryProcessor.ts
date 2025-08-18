import HuggingFaceModelManager from './HuggingFaceModelManager';
import { HybridIntentRouter } from './HybridIntentRouter';
import {
  ParsedQuery,
  QueryClassification,
  QueryParsingResult,
  QueryTemplate,
  QueryType,
  FinancialIntent,
  ProcessingType,
  QueryEntity,
  TimeFrame
} from '../../types/ai';

class AIQueryProcessor {
  private hybridRouter = HybridIntentRouter.getInstance();
  private initialized = false;

  // Legacy query templates for fallback compatibility
  private queryTemplates: QueryTemplate[] = [
    {
      pattern: /how much (did I|have I) spend/i,
      queryType: 'spending_summary',
      intent: 'spending_analysis',
      requiredEntities: ['timeframe'],
      examples: ['How much did I spend this month?', 'How much have I spent on food?']
    },
    {
      pattern: /(what's my|check my|show me my) budget/i,
      queryType: 'budget_status',
      intent: 'budget_check',
      requiredEntities: ['category'],
      examples: ["What's my dining budget status?", "Check my entertainment budget"]
    },
    {
      pattern: /(what's my|show me my|check my) balance/i,
      queryType: 'balance_inquiry',
      intent: 'balance_inquiry',
      requiredEntities: [],
      examples: ["What's my account balance?", "Show me my current balance"]
    },
    {
      pattern: /(find|show|search) (transactions?|expenses?)/i,
      queryType: 'transaction_search',
      intent: 'transaction_lookup',
      requiredEntities: ['category', 'timeframe'],
      examples: ['Find transactions for groceries', 'Show expenses from last week']
    }
  ];

  private timePatterns = [
    { pattern: /this month/i, type: 'month' as const, value: 'current' },
    { pattern: /last month/i, type: 'month' as const, value: 'previous' },
    { pattern: /this week/i, type: 'week' as const, value: 'current' },
    { pattern: /last week/i, type: 'week' as const, value: 'previous' },
    { pattern: /this year/i, type: 'year' as const, value: 'current' },
    { pattern: /today/i, type: 'day' as const, value: 'current' },
    { pattern: /yesterday/i, type: 'day' as const, value: 'previous' }
  ];

  private categoryPatterns = [
    'food', 'dining', 'groceries', 'entertainment', 'transport', 'transportation',
    'utilities', 'shopping', 'health', 'medical', 'insurance', 'gas', 'fuel'
  ];

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.hybridRouter.initialize();
      this.initialized = true;
      console.log('✅ AIQueryProcessor initialized with hybrid routing');
    } catch (error) {
      console.warn('Hybrid router initialization failed, using legacy processing:', error);
      this.initialized = false;
    }
  }

  async parseQuery(query: string): Promise<ParsedQuery> {
    const entities = this.extractEntities(query);
    const intent = await this.determineIntent(query);
    const timeframe = this.extractTimeframe(query);

    return {
      intent,
      entities,
      timeframe,
      category: this.extractCategory(query),
      amount: this.extractAmount(query)
    };
  }

  determineProcessingType(query: ParsedQuery): ProcessingType {
    // Simple queries can be processed on-device
    if (query.entities.length <= 2 && !query.intent.includes('complex')) {
      return 'on-device';
    }
    
    // Complex queries need Hugging Face models
    return 'hugging-face';
  }

  async classifyIntent(query: string): Promise<FinancialIntent> {
    try {
      if (!HuggingFaceModelManager.isInitialized()) {
        await HuggingFaceModelManager.initialize();
      }

      const candidateLabels = [
        'spending_analysis',
        'budget_check', 
        'balance_inquiry',
        'transaction_lookup'
      ];

      const result = await HuggingFaceModelManager.classifyText(query, candidateLabels);
      
      // Return the highest scoring intent
      if (result.scores.length > 0) {
        return result.labels[0] as FinancialIntent;
      }

      return 'unknown';
    } catch (error) {
      console.error('Intent classification failed:', error);
      return this.fallbackIntentClassification(query);
    }
  }

  async classifyQuery(query: string): Promise<QueryClassification> {
    const parsedQuery = await this.parseQuery(query);
    const intent = await this.classifyIntent(query);
    const queryType = this.determineQueryType(query, intent);
    const processingType = this.determineProcessingType(parsedQuery);

    // Calculate confidence based on pattern matching and entity extraction
    const confidence = this.calculateConfidence(query, queryType, parsedQuery.entities);

    return {
      type: queryType,
      confidence,
      intent,
      entities: parsedQuery.entities,
      processingType
    };
  }

  async processQuery(query: string): Promise<QueryParsingResult> {
    try {
      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }

      let parsedQuery: ParsedQuery;
      let classification: QueryClassification;

      // Use hybrid routing if available
      if (this.initialized && this.hybridRouter.isInitialized()) {
        const routeResult = await this.hybridRouter.routeIntent(query);
        const extractedSlots = this.hybridRouter.extractSlots(query);
        
        // Convert hybrid router results to legacy format
        parsedQuery = {
          intent: routeResult.intent,
          entities: this.convertSlotsToEntities(extractedSlots),
          timeframe: extractedSlots.start_date && extractedSlots.end_date ? {
            type: extractedSlots.granularity as any || 'month',
            value: 'custom',
            startDate: new Date(extractedSlots.start_date),
            endDate: new Date(extractedSlots.end_date)
          } : undefined,
          category: extractedSlots.category || undefined,
          amount: extractedSlots.amount_min || undefined
        };

        classification = {
          type: this.hybridRouter.mapIntentToQueryType(routeResult.intent),
          confidence: routeResult.confidence,
          intent: routeResult.intent as FinancialIntent,
          entities: parsedQuery.entities,
          processingType: this.determineProcessingType(parsedQuery)
        };
      } else {
        // Fallback to legacy processing
        parsedQuery = await this.parseQuery(query);
        classification = await this.classifyQuery(query);
      }
      
      const validationResult = this.validateQuery(parsedQuery, classification);
      
      return {
        originalQuery: query,
        parsedQuery,
        classification,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        suggestions: this.generateSuggestions(query, classification.type)
      };
    } catch (error) {
      console.error('Query processing failed:', error);
      return {
        originalQuery: query,
        parsedQuery: { intent: 'unknown', entities: [] },
        classification: {
          type: 'unknown',
          confidence: 0,
          intent: 'unknown',
          entities: [],
          processingType: 'on-device'
        },
        isValid: false,
        errors: [`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`],
        suggestions: this.getGeneralSuggestions()
      };
    }
  }

  private convertSlotsToEntities(slots: any): QueryEntity[] {
    const entities: QueryEntity[] = [];
    
    if (slots.category) {
      entities.push({ type: 'category', value: slots.category, confidence: 0.8 });
    }
    
    if (slots.merchant) {
      entities.push({ type: 'merchant', value: slots.merchant, confidence: 0.8 });
    }
    
    if (slots.top_n) {
      entities.push({ type: 'top_n', value: slots.top_n.toString(), confidence: 0.9 });
    }
    
    if (slots.start_date && slots.end_date) {
      entities.push({ type: 'timeframe', value: `${slots.start_date} to ${slots.end_date}`, confidence: 0.9 });
    }
    
    return entities;
  }

  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];
    
    // Extract timeframe
    const timeframe = this.extractTimeframe(query);
    if (timeframe) {
      entities.push({
        type: 'timeframe',
        value: timeframe.value,
        confidence: 0.9
      });
    }

    // Extract category
    const category = this.extractCategory(query);
    if (category) {
      entities.push({
        type: 'category',
        value: category,
        confidence: 0.8
      });
    }

    // Extract amount
    const amount = this.extractAmount(query);
    if (amount) {
      entities.push({
        type: 'amount',
        value: amount.toString(),
        confidence: 0.7
      });
    }

    return entities;
  }

  private extractTimeframe(query: string): TimeFrame | undefined {
    for (const pattern of this.timePatterns) {
      if (pattern.pattern.test(query)) {
        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (pattern.type) {
          case 'month':
            if (pattern.value === 'current') {
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else {
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            }
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            if (pattern.value === 'current') {
              startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
              endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
            } else {
              endDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000 - 1);
              startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
            }
            break;
          case 'day':
            if (pattern.value === 'current') {
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
            } else {
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
              endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
            }
            break;
        }

        return {
          type: pattern.type,
          value: pattern.value,
          startDate,
          endDate
        };
      }
    }
    return undefined;
  }

  private extractCategory(query: string): string | undefined {
    for (const category of this.categoryPatterns) {
      if (query.toLowerCase().includes(category)) {
        return category;
      }
    }
    return undefined;
  }

  private extractAmount(query: string): number | undefined {
    const amountMatch = query.match(/\$?(\d+(?:\.\d{2})?)/);
    return amountMatch ? parseFloat(amountMatch[1]) : undefined;
  }

  private async determineIntent(query: string): Promise<string> {
    // First try local pattern matching
    for (const template of this.queryTemplates) {
      if (template.pattern.test(query)) {
        return template.intent;
      }
    }

    // Fallback to AI classification if initialized
    try {
      const intent = await this.classifyIntent(query);
      return intent;
    } catch (error) {
      return 'unknown';
    }
  }

  private determineQueryType(query: string, intent: FinancialIntent): QueryType {
    switch (intent) {
      case 'spending_analysis':
        return 'spending_summary';
      case 'budget_check':
        return 'budget_status';
      case 'balance_inquiry':
        return 'balance_inquiry';
      case 'transaction_lookup':
        return 'transaction_search';
      default:
        return 'unknown';
    }
  }

  private calculateConfidence(query: string, queryType: QueryType, entities: QueryEntity[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for pattern matches
    for (const template of this.queryTemplates) {
      if (template.queryType === queryType && template.pattern.test(query)) {
        confidence += 0.3;
        break;
      }
    }

    // Increase confidence based on entity extraction
    confidence += entities.length * 0.1;

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  private validateQuery(parsedQuery: ParsedQuery, classification: QueryClassification): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Find matching template for validation
    const template = this.queryTemplates.find(t => t.queryType === classification.type);
    if (!template) {
      return { isValid: true }; // No specific validation rules
    }

    // Check required entities
    for (const requiredEntity of template.requiredEntities) {
      const hasEntity = parsedQuery.entities.some(entity => 
        entity.type === requiredEntity || 
        (requiredEntity === 'category' && parsedQuery.category) ||
        (requiredEntity === 'timeframe' && parsedQuery.timeframe)
      );

      if (!hasEntity) {
        errors.push(`Missing ${requiredEntity} in query`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private generateSuggestions(query: string, queryType: QueryType): string[] {
    const template = this.queryTemplates.find(t => t.queryType === queryType);
    if (template) {
      return template.examples.slice(0, 2); // Return first 2 examples
    }

    return this.getGeneralSuggestions();
  }

  private getGeneralSuggestions(): string[] {
    return [
      "Try asking: 'How much did I spend this month?'",
      "Try asking: 'What's my dining budget status?'",
      "Try asking: 'Show me my account balance'"
    ];
  }

  private fallbackIntentClassification(query: string): FinancialIntent {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('spend') || lowerQuery.includes('spent')) {
      return 'spending_analysis';
    }
    if (lowerQuery.includes('budget')) {
      return 'budget_check';
    }
    if (lowerQuery.includes('balance')) {
      return 'balance_inquiry';
    }
    if (lowerQuery.includes('transaction') || lowerQuery.includes('expense')) {
      return 'transaction_lookup';
    }
    
    return 'unknown';
  }
}

export default new AIQueryProcessor();