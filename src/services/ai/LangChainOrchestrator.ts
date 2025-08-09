import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import HuggingFaceModelManager from './HuggingFaceModelManager';
import { QueryType, FinancialData } from '../../types/ai';

class LangChainOrchestrator {
  private chain: RunnableSequence | null = null;
  private conversationHistory: Array<{input: string, output: string}> = [];
  private promptTemplate: ChatPromptTemplate | null = null;

  private readonly FINANCIAL_ANALYSIS_SYSTEM_MESSAGE = `You are a financial assistant helping users understand their spending and budgets.

Context: You have access to the user's financial data and should provide helpful, accurate responses.
Always be concise and focus on the specific question asked.

When provided with financial data, reference specific amounts, timeframes, and categories in your response.
If no specific data is available, provide general guidance and suggest what information would be helpful.`;

  async initialize(): Promise<void> {
    try {
      // Create modern LangChain prompt template
      this.promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", this.FINANCIAL_ANALYSIS_SYSTEM_MESSAGE],
        ["human", "Financial context: {context}\n\nUser question: {question}"]
      ]);

      // Create the chain using LCEL (LangChain Expression Language)
      // Note: We'll use HuggingFace models through our ModelManager
      this.chain = RunnableSequence.from([
        this.promptTemplate,
        // We could add a chat model here when available
        new StringOutputParser()
      ]);

      console.log('LangChain orchestrator initialized with modern LCEL');
    } catch (error) {
      console.error('Failed to initialize LangChain orchestrator:', error);
      // Don't throw - fall back to simple mode
      this.promptTemplate = null;
      this.chain = null;
    }
  }

  async createFinancialChain(): Promise<RunnableSequence | null> {
    if (!this.chain) {
      await this.initialize();
    }
    return this.chain;
  }

  async processFinancialQuery(
    query: string,
    financialData?: FinancialData
  ): Promise<string> {
    try {
      // Try to use LangChain if available
      if (this.promptTemplate) {
        const context = financialData ? this.formatFinancialContext(financialData) : 'No specific financial data provided.';
        
        // Format the prompt
        const formattedPrompt = await this.promptTemplate.format({
          context,
          question: query
        });

        // For now, we'll use HuggingFace through our ModelManager
        // In a full implementation, this would go through the LangChain chain
        try {
          const response = await HuggingFaceModelManager.generateConversationalResponse(
            formattedPrompt,
            this.conversationHistory.map(h => h.input).slice(-3),
            this.conversationHistory.map(h => h.output).slice(-3)
          );
          
          const generatedText = response.generated_text;
          
          // Add to conversation history
          this.addToHistory(query, generatedText);
          
          return generatedText;
        } catch (hfError) {
          console.log('HuggingFace unavailable, using template response');
        }
      }

      // Fallback to template-based response
      let response = `Based on your question "${query}", `;
      
      if (financialData) {
        const context = this.formatFinancialContext(financialData);
        response += `here's what I found: ${context}`;
      } else {
        response += `I can help you with financial questions about spending, budgets, and transactions.`;
      }

      // Add to conversation history
      this.addToHistory(query, response);

      return response;
    } catch (error) {
      console.error('Error processing financial query:', error);
      throw error;
    }
  }

  private formatFinancialContext(data: FinancialData): string {
    let context = '';
    
    if (data.amount !== undefined) {
      context += `Amount: $${data.amount}`;
    }
    
    if (data.timeframe) {
      context += ` for ${data.timeframe}`;
    }
    
    if (data.categories && data.categories.length > 0) {
      context += ` in ${data.categories.join(', ')} categories`;
    }
    
    if (data.transactions && data.transactions.length > 0) {
      context += ` (${data.transactions.length} transactions)`;
    }
    
    return context || 'financial data available';
  }

  private addToHistory(input: string, output: string): void {
    this.conversationHistory.push({ input, output });
    // Keep only last 10 exchanges
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  async clearMemory(): Promise<void> {
    this.conversationHistory = [];
  }

  isInitialized(): boolean {
    return this.promptTemplate !== null;
  }

  getMemory(): Array<{input: string, output: string}> {
    return this.conversationHistory;
  }
}

export default new LangChainOrchestrator();