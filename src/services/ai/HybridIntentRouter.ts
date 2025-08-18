import HuggingFaceModelManager from './HuggingFaceModelManager';
import { QueryType } from '../../types/ai';

// Define canonical actions based on solution document
interface CanonicalAction {
  intent: string;
  examples: string[];
}

interface RouteResult {
  intent: string;
  confidence: number;
  method: 'rule' | 'embedding' | 'llm' | 'fallback';
  score?: number;
}

interface ExtractedSlots {
  start_date?: string;
  end_date?: string;
  category?: string | null;
  merchant?: string | null;
  transaction_type?: string;
  top_n?: number | null;
  granularity?: string;
  amount_min?: number;
  amount_max?: number;
}

export class HybridIntentRouter {
  private static instance: HybridIntentRouter;
  private initialized = false;
  private embeddings: Map<string, number[]> = new Map();

  // Define canonical actions with paraphrases
  private readonly CANONICAL_ACTIONS: Record<string, CanonicalAction> = {
    spending_summary: {
      intent: 'spending_summary',
      examples: [
        'show my spending summary',
        'how much did I spend',
        'spending overview',
        'spending this month',
        'spending last 30 days',
        'total expenses',
        'money spent',
        'expenditure summary'
      ]
    },
    top_categories: {
      intent: 'top_categories', 
      examples: [
        'top category',
        'number 1 category',
        'biggest spending category',
        'what category do I spend most on',
        'highest expense category',
        'my biggest expense',
        'largest spending area'
      ]
    },
    budget_status: {
      intent: 'budget_status',
      examples: [
        'how am i doing with my budgets',
        'budget left',
        'remaining budget',
        'budget status',
        'budget progress',
        'am I over budget',
        'budget check'
      ]
    },
    trends: {
      intent: 'trends',
      examples: [
        'spending trends',
        'how is my spending changing',
        'trend over time',
        'spending pattern',
        'expense trends',
        'financial trends',
        'spending behavior'
      ]
    },
    merchant_breakdown: {
      intent: 'merchant_breakdown',
      examples: [
        'spending at specific store',
        'transactions from merchant',
        'expenses at shop',
        'purchases from store',
        'spending at restaurant'
      ]
    },
    compare_periods: {
      intent: 'compare_periods',
      examples: [
        'compare this month vs last month',
        'spending comparison',
        'how does this compare',
        'difference between periods',
        'month over month spending'
      ]
    }
  };

  // Rule-based patterns for high-precision matches
  private readonly RULE_PATTERNS = [
    { pattern: /\b(top|#?1|number\s*1|biggest|highest|largest)\b/i, intent: 'top_categories' },
    { pattern: /\b(budget|budgets)\b/i, intent: 'budget_status' },
    { pattern: /\btrend(s)?\b/i, intent: 'trends' },
    { pattern: /\b(spend|spending|summary|total|expenditure)\b/i, intent: 'spending_summary' },
    { pattern: /\b(compare|comparison|vs|versus)\b/i, intent: 'compare_periods' },
    { pattern: /\b(merchant|store|shop|restaurant|place)\b/i, intent: 'merchant_breakdown' }
  ];

  public static getInstance(): HybridIntentRouter {
    if (!HybridIntentRouter.instance) {
      HybridIntentRouter.instance = new HybridIntentRouter();
    }
    return HybridIntentRouter.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize HuggingFace models for embeddings
      await HuggingFaceModelManager.initialize();
      
      // Pre-compute embeddings for canonical examples
      await this.precomputeEmbeddings();
      
      this.initialized = true;
      console.log('✅ Hybrid Intent Router initialized');
    } catch (error) {
      console.error('Failed to initialize HybridIntentRouter:', error);
      this.initialized = false;
    }
  }

  private async precomputeEmbeddings(): Promise<void> {
    try {
      const actions = Object.entries(this.CANONICAL_ACTIONS);
      for (const [actionKey, action] of actions) {
        for (const example of action.examples) {
          // Generate embeddings using HuggingFace
          const embedding = await HuggingFaceModelManager.generateEmbedding(example);
          this.embeddings.set(`${actionKey}:${example}`, embedding);
        }
      }
      console.log(`📊 Pre-computed ${this.embeddings.size} embeddings`);
    } catch (error) {
      console.error('Failed to pre-compute embeddings:', error);
    }
  }

  /**
   * Route user query using hybrid approach: rules → embeddings → LLM fallback
   */
  async routeIntent(
    utterance: string, 
    ruleFirst = true, 
    embeddingThreshold = 0.42
  ): Promise<RouteResult> {
    const cleanUtterance = utterance.trim().toLowerCase();

    // Step 1: Rule-based routing (fast, deterministic)
    if (ruleFirst) {
      for (const rule of this.RULE_PATTERNS) {
        if (rule.pattern.test(utterance)) {
          return {
            intent: rule.intent,
            confidence: 0.95,
            method: 'rule'
          };
        }
      }
    }

    // Step 2: Embedding-based semantic matching
    if (this.initialized && this.embeddings.size > 0) {
      try {
        const queryEmbedding = await HuggingFaceModelManager.generateEmbedding(cleanUtterance);
        const semanticMatch = await this.findBestSemanticMatch(queryEmbedding, embeddingThreshold);
        
        if (semanticMatch) {
          return semanticMatch;
        }
      } catch (error) {
        console.warn('Embedding matching failed:', error);
      }
    }

    // Step 3: LLM fallback (structured output)
    try {
      const llmResult = await this.llmFallbackRouting(utterance);
      if (llmResult) {
        return llmResult;
      }
    } catch (error) {
      console.warn('LLM fallback routing failed:', error);
    }

    // Step 4: Safe default fallback
    return {
      intent: 'spending_summary',
      confidence: 0.3,
      method: 'fallback'
    };
  }

  private async findBestSemanticMatch(
    queryEmbedding: number[], 
    threshold: number
  ): Promise<RouteResult | null> {
    let bestMatch: { intent: string; score: number } | null = null;
    
    const embeddingEntries = Array.from(this.embeddings.entries());
    for (const [key, embedding] of embeddingEntries) {
      const [actionKey] = key.split(':');
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity > threshold && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { intent: actionKey, score: similarity };
      }
    }

    if (bestMatch) {
      return {
        intent: bestMatch.intent,
        confidence: Math.min(bestMatch.score * 1.2, 1.0), // Boost confidence slightly
        method: 'embedding',
        score: bestMatch.score
      };
    }

    return null;
  }

  private async llmFallbackRouting(utterance: string): Promise<RouteResult | null> {
    try {
      // Use HuggingFace classification as LLM fallback
      const candidateLabels = Object.keys(this.CANONICAL_ACTIONS);
      const result = await HuggingFaceModelManager.classifyText(utterance, candidateLabels);
      
      if (result.scores.length > 0 && result.scores[0] > 0.4) {
        return {
          intent: result.labels[0],
          confidence: result.scores[0],
          method: 'llm'
        };
      }
    } catch (error) {
      console.error('LLM fallback failed:', error);
    }
    
    return null;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Extract slots from user query using multiple techniques
   */
  extractSlots(utterance: string): ExtractedSlots {
    const slots: ExtractedSlots = {};
    
    // Extract top_n
    const topN = this.detectTopN(utterance);
    if (topN) slots.top_n = topN;
    
    // Extract timeframe (delegate to existing parser for now)
    const timeframe = this.extractTimeframe(utterance);
    if (timeframe) {
      slots.start_date = timeframe.start_date;
      slots.end_date = timeframe.end_date;
      slots.granularity = timeframe.granularity;
    }
    
    // Extract category
    const category = this.extractCategory(utterance);
    if (category) slots.category = category;
    
    // Extract merchant
    const merchant = this.extractMerchant(utterance);
    if (merchant) slots.merchant = merchant;
    
    // Extract amounts
    const amounts = this.extractAmounts(utterance);
    if (amounts.min) slots.amount_min = amounts.min;
    if (amounts.max) slots.amount_max = amounts.max;
    
    // Default transaction type
    slots.transaction_type = 'expense'; // Default as per solution
    
    return this.normalizeSlots(slots);
  }

  private detectTopN(text: string): number | null {
    // Match patterns like "top 3", "number 1", "#1"
    const match = text.match(/\b(?:top|number\s*)(\d+)|#\s?(\d+)\b/i);
    if (match) {
      const n = parseInt(match[1] || match[2]);
      return Math.max(1, Math.min(n, 10)); // Clamp between 1-10
    }
    
    // Match patterns like "top", "#1", "number 1"  
    if (/\b(top|#?1|number\s*1)\b/i.test(text)) {
      return 1;
    }
    
    return null;
  }

  private extractTimeframe(text: string): {
    start_date: string;
    end_date: string;
    granularity: string;
  } | null {
    const now = new Date();
    
    // This month
    if (/\bthis month\b/i.test(text)) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        granularity: 'month'
      };
    }
    
    // Last month
    if (/\blast month\b/i.test(text)) {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        granularity: 'month'
      };
    }
    
    // Last N days
    const daysMatch = text.match(/\blast (\d+) days?\b/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const end = new Date(now);
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        granularity: 'day'
      };
    }
    
    // Default to month-to-date
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
      granularity: 'month'
    };
  }

  private extractCategory(text: string): string | null {
    const categories = [
      'food', 'dining', 'groceries', 'restaurants', 'entertainment', 
      'transport', 'transportation', 'utilities', 'shopping', 'health', 
      'medical', 'insurance', 'gas', 'fuel', 'travel', 'education',
      'clothing', 'home', 'personal', 'gifts', 'donations'
    ];
    
    for (const category of categories) {
      if (text.toLowerCase().includes(category)) {
        return category;
      }
    }
    
    return null;
  }

  private extractMerchant(text: string): string | null {
    // Extract potential merchant names - this is a basic implementation
    const merchantPatterns = [
      /\bat\s+([A-Z][a-zA-Z\s&'-]+)(?:\s|$)/,
      /\bfrom\s+([A-Z][a-zA-Z\s&'-]+)(?:\s|$)/,
      /\b([A-Z][a-zA-Z\s&'-]+)\s+store\b/i,
    ];
    
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractAmounts(text: string): { min?: number; max?: number } {
    const amounts: { min?: number; max?: number } = {};
    
    // Look for "over X" or "above X"
    const overMatch = text.match(/\b(?:over|above|more than)\s*\$?(\d+(?:\.\d{2})?)\b/i);
    if (overMatch) {
      amounts.min = parseFloat(overMatch[1]);
    }
    
    // Look for "under X" or "below X"
    const underMatch = text.match(/\b(?:under|below|less than)\s*\$?(\d+(?:\.\d{2})?)\b/i);
    if (underMatch) {
      amounts.max = parseFloat(underMatch[1]);
    }
    
    return amounts;
  }

  private normalizeSlots(slots: ExtractedSlots): ExtractedSlots {
    // Normalize null/empty values
    for (const [key, value] of Object.entries(slots)) {
      if (value === null || value === '' || value === 'null' || value === 'None' || value === 'undefined' || value === 'all') {
        delete (slots as any)[key];
      }
    }
    
    return slots;
  }

  /**
   * Map intent to QueryType for backwards compatibility
   */
  mapIntentToQueryType(intent: string): QueryType {
    const mapping: Record<string, QueryType> = {
      'spending_summary': 'spending_summary',
      'top_categories': 'spending_summary', // Top categories is a type of spending analysis
      'budget_status': 'budget_status',
      'trends': 'spending_summary', // Trends are spending analysis over time
      'merchant_breakdown': 'transaction_search', // Merchant analysis uses transaction search
      'compare_periods': 'spending_summary', // Comparison is spending analysis
    };
    
    return mapping[intent] || 'unknown';
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default HybridIntentRouter;