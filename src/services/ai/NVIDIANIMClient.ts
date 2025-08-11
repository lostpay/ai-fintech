import { OpenAI } from 'openai';
import Constants from 'expo-constants';
import { 
  ModelResponse,
  ClassificationResponse,
  ConversationalResponse,
  QueryType
} from '../../types/ai';

interface NVIDIANIMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  timeout: number;
  retryAttempts: number;
}

class NVIDIANIMClient {
  private client: OpenAI | null = null;
  private config: NVIDIANIMConfig | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      // Get API key from environment variables
      const apiKey = Constants.expoConfig?.extra?.NVIDIA_API_KEY;
      
      if (!apiKey) {
        console.warn('No NVIDIA API key found. Please set NVIDIA_API_KEY in your .env file.');
        return;
      }

      this.config = {
        apiKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
        model: Constants.expoConfig?.extra?.NVIDIA_MODEL || 'openai/gpt-oss-20b',
        timeout: Number(Constants.expoConfig?.extra?.AI_SERVICE_TIMEOUT) || 30000,
        retryAttempts: 3
      };

      this.client = new OpenAI({
        baseURL: this.config.baseURL,
        apiKey: this.config.apiKey,
      });

      this.initialized = true;
      console.log('NVIDIA NIM client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NVIDIA NIM client:', error);
      this.initialized = false;
    }
  }

  async classifyQuery(query: string, candidateLabels: string[]): Promise<ClassificationResponse> {
    if (!this.client || !this.initialized) {
      throw new Error('NVIDIA NIM client not initialized');
    }

    try {
      const prompt = `Classify the following financial query into one of these categories: ${candidateLabels.join(', ')}.

Query: "${query}"

Respond with just the most appropriate category and a confidence score (0-1).
Format: category: confidence_score`;

      const completion = await this.client.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial query classifier. Classify queries into the given categories and provide confidence scores.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const response = completion.choices[0]?.message?.content?.trim() || '';
      
      // Parse the response
      const match = response.match(/^([^:]+):\s*([\d.]+)$/);
      if (match) {
        const [, category, scoreStr] = match;
        const score = parseFloat(scoreStr);
        const normalizedCategory = candidateLabels.find(label => 
          label.toLowerCase().includes(category.trim().toLowerCase()) ||
          category.trim().toLowerCase().includes(label.toLowerCase())
        ) || candidateLabels[0];
        
        return {
          labels: [normalizedCategory, ...candidateLabels.filter(l => l !== normalizedCategory)],
          scores: [score, ...candidateLabels.filter(l => l !== normalizedCategory).map(() => (1 - score) / (candidateLabels.length - 1))],
          sequence: query
        };
      }

      // Fallback classification
      return this.fallbackClassification(query, candidateLabels);
    } catch (error) {
      console.error('NVIDIA NIM classification failed:', error);
      return this.fallbackClassification(query, candidateLabels);
    }
  }

  async generateConversationalResponse(
    query: string,
    financialContext?: string,
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>
  ): Promise<ConversationalResponse> {
    if (!this.client || !this.initialized) {
      throw new Error('NVIDIA NIM client not initialized');
    }

    try {
      const systemPrompt = `You are a helpful financial assistant. You help users understand their spending, budgets, and financial goals.

Key guidelines:
- Be concise and specific in your responses
- Reference actual financial data when provided
- Focus on actionable insights
- Use a friendly, professional tone
- If you don't have specific data, acknowledge this and provide general guidance

${financialContext ? `Current financial context: ${financialContext}` : ''}`;

      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-6)); // Keep last 6 messages for context
      }

      // Add current query
      messages.push({
        role: 'user',
        content: query
      });

      const completion = await this.client.chat.completions.create({
        model: this.config!.model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
        top_p: 0.9
      });

      const generated_text = completion.choices[0]?.message?.content?.trim() || 
        'I can help you with financial questions about spending, budgets, and transactions.';

      return {
        generated_text,
        conversation: {
          past_user_inputs: conversationHistory?.filter(m => m.role === 'user').map(m => m.content) || [],
          generated_responses: conversationHistory?.filter(m => m.role === 'assistant').map(m => m.content) || []
        }
      };
    } catch (error) {
      console.error('NVIDIA NIM conversation generation failed:', error);
      
      // Fallback response
      const generated_text = `Based on your question "${query}", I can help you with financial analysis. ${financialContext ? `Here's what I found: ${financialContext}` : 'Please provide more details about what you\'d like to know.'}`;
      
      return {
        generated_text,
        conversation: {
          past_user_inputs: conversationHistory?.filter(m => m.role === 'user').map(m => m.content) || [],
          generated_responses: conversationHistory?.filter(m => m.role === 'assistant').map(m => m.content) || []
        }
      };
    }
  }

  async generateFinancialAnalysis(
    query: string, 
    financialData: any
  ): Promise<ModelResponse> {
    if (!this.client || !this.initialized) {
      throw new Error('NVIDIA NIM client not initialized');
    }

    try {
      const startTime = Date.now();
      
      const systemPrompt = `You are a financial analyst. Analyze the provided financial data and answer the user's question with specific insights.

Financial Data: ${JSON.stringify(financialData, null, 2)}

Provide a clear, data-driven response that:
1. Directly answers the user's question
2. References specific amounts, dates, and categories from the data
3. Offers actionable insights or recommendations
4. Keeps the response concise but informative`;

      const completion = await this.client.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 400
      });

      const processingTime = Date.now() - startTime;
      const analysisText = completion.choices[0]?.message?.content?.trim() || 
        'Unable to generate financial analysis at this time.';

      return {
        text: analysisText,
        metadata: {
          model: this.config!.model,
          processingTime,
          provider: 'nvidia-nim'
        }
      };
    } catch (error) {
      console.error('NVIDIA NIM financial analysis failed:', error);
      throw error;
    }
  }

  private fallbackClassification(query: string, candidateLabels: string[]): ClassificationResponse {
    const lowerQuery = query.toLowerCase();
    let bestLabel = candidateLabels[0];
    let bestScore = 0.5;

    // Simple pattern matching
    candidateLabels.forEach(label => {
      const labelWords = label.toLowerCase().replace('_', ' ').split(' ');
      const matchCount = labelWords.filter(word => lowerQuery.includes(word)).length;
      const score = Math.min(0.9, 0.3 + (matchCount / labelWords.length) * 0.6);
      
      if (score > bestScore) {
        bestLabel = label;
        bestScore = score;
      }
    });

    return {
      labels: [bestLabel, ...candidateLabels.filter(l => l !== bestLabel)],
      scores: [bestScore, ...candidateLabels.filter(l => l !== bestLabel).map(() => (1 - bestScore) / (candidateLabels.length - 1))],
      sequence: query
    };
  }

  isInitialized(): boolean {
    return this.initialized && this.client !== null;
  }

  getModel(): string {
    return this.config?.model || 'openai/gpt-oss-20b';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.initialized) {
      return false;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      });

      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('NVIDIA NIM health check failed:', error);
      return false;
    }
  }
}

export default new NVIDIANIMClient();