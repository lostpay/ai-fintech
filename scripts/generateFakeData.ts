/**
 * Fake Data Generator for Budget Tracker Supabase Database
 * 
 * This script generates realistic financial data for testing the AI assistant
 * and other app features with multiple budgets, large transaction volumes,
 * and complex financial scenarios.
 */

import { supabase, DEFAULT_USER_ID } from '../src/config/supabase';

// Realistic merchant data
const MERCHANTS = {
  dining: [
    'McDonald\'s', 'Starbucks', 'Subway', 'Pizza Hut', 'KFC', 'Taco Bell',
    'Chipotle Mexican Grill', 'Panera Bread', 'Olive Garden', 'Red Lobster',
    'The Cheesecake Factory', 'Applebee\'s', 'TGI Friday\'s', 'Chili\'s',
    'Outback Steakhouse', 'Buffalo Wild Wings', 'Five Guys', 'In-N-Out Burger',
    'Local Cafe', 'Downtown Bistro', 'Corner Deli', 'Sushi Palace'
  ],
  groceries: [
    'Walmart Supercenter', 'Target', 'Kroger', 'Safeway', 'Whole Foods Market',
    'Trader Joe\'s', 'Costco Wholesale', 'Sam\'s Club', 'Publix', 'H-E-B',
    'Fresh Market', 'Organic Corner', 'Local Grocery', 'Food Lion',
    'Giant Eagle', 'Stop & Shop', 'King Soopers', 'Wegmans'
  ],
  transportation: [
    'Uber', 'Lyft', 'Shell', 'Exxon', 'BP', 'Chevron', 'Marathon',
    'Metro Transit', 'City Bus', 'Airport Parking', 'Taxi Service',
    'Car Rental', 'Gas Station', 'Parking Meter', 'Bridge Toll'
  ],
  entertainment: [
    'Netflix', 'Spotify', 'AMC Theaters', 'Cinemark', 'Steam',
    'PlayStation Store', 'Xbox Live', 'Disney+', 'Hulu', 'Prime Video',
    'Apple Music', 'Concert Venue', 'Sports Stadium', 'Movie Theater',
    'Bowling Alley', 'Mini Golf', 'Arcade', 'Theme Park'
  ],
  shopping: [
    'Amazon', 'eBay', 'Best Buy', 'Target', 'Walmart', 'Macy\'s',
    'Nordstrom', 'Gap', 'H&M', 'Zara', 'Nike', 'Adidas',
    'Home Depot', 'Lowe\'s', 'IKEA', 'Bed Bath & Beyond',
    'CVS Pharmacy', 'Walgreens', 'Office Depot', 'Staples'
  ],
  healthcare: [
    'CVS Pharmacy', 'Walgreens', 'Dr. Smith Clinic', 'City Hospital',
    'Dental Care Center', 'Vision Center', 'Physical Therapy',
    'Urgent Care', 'Lab Corp', 'Quest Diagnostics', 'MRI Center'
  ],
  utilities: [
    'Electric Company', 'Gas & Electric', 'Water Department', 'Trash Service',
    'Comcast Xfinity', 'Verizon', 'AT&T', 'T-Mobile', 'Internet Provider',
    'Cable TV', 'Phone Service'
  ],
  income: [
    'Employer Payroll', 'Freelance Payment', 'Side Gig', 'Investment Return',
    'Tax Refund', 'Bonus Payment', 'Commission', 'Rental Income',
    'Gift Money', 'Cashback Reward', 'Interest Payment', 'Dividend'
  ],
  other: [
    'Bank Fee', 'ATM Withdrawal', 'Money Transfer', 'Subscription Service',
    'Insurance Payment', 'Pet Store', 'Gym Membership', 'Beauty Salon',
    'Auto Service', 'Parking Fee', 'Gift Purchase', 'Donation'
  ]
};

// Price ranges for different categories (in dollars)
const PRICE_RANGES = {
  dining: { min: 8, max: 85, avg: 25 },
  groceries: { min: 15, max: 180, avg: 65 },
  transportation: { min: 5, max: 120, avg: 35 },
  entertainment: { min: 9, max: 150, avg: 45 },
  shopping: { min: 12, max: 300, avg: 80 },
  healthcare: { min: 20, max: 500, avg: 120 },
  utilities: { min: 45, max: 250, avg: 125 },
  income: { min: 500, max: 5000, avg: 2500 },
  other: { min: 10, max: 200, avg: 50 }
};

// Category mapping (you'll need to get the actual IDs from your database)
const CATEGORY_MAPPING: Record<string, number> = {}; // Will be populated dynamically

interface FakeDataOptions {
  userId?: string;
  monthsBack?: number;
  transactionsPerMonth?: number;
  includeBudgets?: boolean;
  includeGoals?: boolean;
  includeAIConversations?: boolean;
}

class FakeDataGenerator {
  private userId: string;
  private categories: any[] = [];

  constructor(userId: string = DEFAULT_USER_ID) {
    this.userId = userId;
  }

  /**
   * Generate comprehensive fake data
   */
  async generateFakeData(options: FakeDataOptions = {}): Promise<void> {
    const {
      monthsBack = 6,
      transactionsPerMonth = 80,
      includeBudgets = true,
      includeGoals = true,
      includeAIConversations = true
    } = options;

    try {
      console.log('🚀 Starting fake data generation...');

      // Load categories first
      await this.loadCategories();
      
      // Generate data in order
      console.log('📝 Generating transactions...');
      await this.generateTransactions(monthsBack, transactionsPerMonth);
      
      if (includeBudgets) {
        console.log('💰 Generating budgets...');
        await this.generateBudgets();
      }
      
      if (includeGoals) {
        console.log('🎯 Generating goals...');
        await this.generateGoals();
      }
      
      if (includeAIConversations) {
        console.log('🤖 Generating AI conversations...');
        await this.generateAIConversations();
      }
      
      console.log('✅ Fake data generation completed successfully!');
      
      // Print summary
      await this.printDataSummary();
      
    } catch (error) {
      console.error('❌ Error generating fake data:', error);
      throw error;
    }
  }

  /**
   * Load existing categories from database
   */
  private async loadCategories(): Promise<void> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id');

    if (error) throw error;
    
    this.categories = data || [];
    
    // Populate category mapping
    this.categories.forEach(category => {
      const categoryKey = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      CATEGORY_MAPPING[categoryKey] = category.id;
    });
    
    console.log(`📂 Loaded ${this.categories.length} categories`);
  }

  /**
   * Generate realistic transactions
   */
  private async generateTransactions(monthsBack: number, transactionsPerMonth: number): Promise<void> {
    const transactions = [];
    const today = new Date();
    
    for (let month = 0; month < monthsBack; month++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - month, 1);
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      
      // Generate transactions for this month
      for (let i = 0; i < transactionsPerMonth; i++) {
        const transaction = this.generateSingleTransaction(monthDate, daysInMonth);
        transactions.push(transaction);
      }
      
      // Add monthly income (2-4 times per month)
      const incomeTransactions = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < incomeTransactions; i++) {
        const incomeTransaction = this.generateIncomeTransaction(monthDate, daysInMonth);
        transactions.push(incomeTransaction);
      }
    }
    
    // Batch insert transactions
    console.log(`💳 Inserting ${transactions.length} transactions...`);
    
    // Insert in batches of 100 to avoid rate limits
    for (let i = 0; i < transactions.length; i += 100) {
      const batch = transactions.slice(i, i + 100);
      const { error } = await supabase
        .from('transactions')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i/100) + 1}:`, error);
        throw error;
      }
      
      console.log(`✓ Inserted batch ${Math.floor(i/100) + 1}/${Math.ceil(transactions.length/100)}`);
    }
  }

  /**
   * Generate a single realistic transaction
   */
  private generateSingleTransaction(monthDate: Date, daysInMonth: number): any {
    // Pick random category (excluding income for expense transactions)
    const expenseCategories = this.categories.filter(c => c.name !== 'Income');
    const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    const categoryName = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Get merchants for this category
    const merchants = MERCHANTS[categoryName as keyof typeof MERCHANTS] || MERCHANTS.other;
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    // Generate realistic amount
    const priceRange = PRICE_RANGES[categoryName as keyof typeof PRICE_RANGES] || PRICE_RANGES.other;
    const amount = this.generateRealisticAmount(priceRange);
    
    // Generate random date in the month
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const transactionDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    
    // Add some time variation
    transactionDate.setHours(
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 60)
    );
    
    return {
      amount: Math.round(amount * 100), // Convert to cents
      description: merchant,
      category_id: category.id,
      transaction_type: 'expense',
      date: transactionDate.toISOString().split('T')[0],
      user_id: this.userId,
      created_at: transactionDate.toISOString(),
      updated_at: transactionDate.toISOString(),
    };
  }

  /**
   * Generate income transaction
   */
  private generateIncomeTransaction(monthDate: Date, daysInMonth: number): any {
    const incomeCategory = this.categories.find(c => c.name === 'Income');
    if (!incomeCategory) throw new Error('Income category not found');
    
    const merchants = MERCHANTS.income;
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    // Income amounts are larger and more varied
    const amount = Math.random() < 0.7 
      ? 2000 + Math.random() * 3000  // Regular payroll
      : 100 + Math.random() * 500;   // Side income
    
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const transactionDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    
    return {
      amount: Math.round(amount * 100), // Convert to cents
      description: merchant,
      category_id: incomeCategory.id,
      transaction_type: 'income',
      date: transactionDate.toISOString().split('T')[0],
      user_id: this.userId,
      created_at: transactionDate.toISOString(),
      updated_at: transactionDate.toISOString(),
    };
  }

  /**
   * Generate realistic amount with some variation
   */
  private generateRealisticAmount(priceRange: { min: number, max: number, avg: number }): number {
    // 70% of transactions are near average, 30% are outliers
    if (Math.random() < 0.7) {
      // Normal distribution around average
      const variance = (priceRange.max - priceRange.min) * 0.3;
      return Math.max(priceRange.min, 
        Math.min(priceRange.max, 
          priceRange.avg + (Math.random() - 0.5) * variance
        )
      );
    } else {
      // Uniform distribution for outliers
      return priceRange.min + Math.random() * (priceRange.max - priceRange.min);
    }
  }

  /**
   * Generate realistic budgets
   */
  private async generateBudgets(): Promise<void> {
    const budgets = [];
    const today = new Date();
    
    // Create budgets for the last 3 months and next 3 months
    for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
      
      // Create budgets for 5-8 categories per month
      const budgetCategories = this.categories
        .filter(c => c.name !== 'Income' && c.name !== 'Other')
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 4) + 5);
      
      for (const category of budgetCategories) {
        const categoryName = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const priceRange = PRICE_RANGES[categoryName as keyof typeof PRICE_RANGES] || PRICE_RANGES.other;
        
        // Budget should be reasonable for the category
        const monthlyBudget = Math.round(priceRange.avg * (5 + Math.random() * 10)); // 5-15x average transaction
        
        budgets.push({
          category_id: category.id,
          amount: monthlyBudget * 100, // Convert to cents
          period_start: monthStart.toISOString().split('T')[0],
          period_end: monthEnd.toISOString().split('T')[0],
          user_id: this.userId,
        });
      }
    }
    
    console.log(`💰 Inserting ${budgets.length} budgets...`);
    
    const { error } = await supabase
      .from('budgets')
      .insert(budgets);
    
    if (error) {
      console.error('Error inserting budgets:', error);
      throw error;
    }
  }

  /**
   * Generate financial goals
   */
  private async generateGoals(): Promise<void> {
    const goals = [
      {
        name: 'Emergency Fund',
        target_amount: 1000000, // $10,000 in cents
        current_amount: 350000, // $3,500 in cents
        target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        description: 'Build emergency fund to cover 6 months of expenses',
        is_completed: false,
        user_id: this.userId,
      },
      {
        name: 'Vacation Fund',
        target_amount: 300000, // $3,000 in cents
        current_amount: 120000, // $1,200 in cents
        target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
        description: 'Save for summer vacation to Europe',
        is_completed: false,
        user_id: this.userId,
      },
      {
        name: 'New Laptop',
        target_amount: 150000, // $1,500 in cents
        current_amount: 150000, // $1,500 in cents
        target_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month ago
        description: 'Save for a new MacBook Pro for work',
        is_completed: true,
        user_id: this.userId,
      },
      {
        name: 'Down Payment',
        target_amount: 5000000, // $50,000 in cents
        current_amount: 1200000, // $12,000 in cents
        target_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years from now
        description: 'Save for house down payment (20%)',
        is_completed: false,
        user_id: this.userId,
      },
      {
        name: 'Car Repair Fund',
        target_amount: 200000, // $2,000 in cents
        current_amount: 50000, // $500 in cents
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months from now
        description: 'Emergency fund for unexpected car repairs',
        is_completed: false,
        user_id: this.userId,
      }
    ];
    
    console.log(`🎯 Inserting ${goals.length} goals...`);
    
    const { error } = await supabase
      .from('goals')
      .insert(goals);
    
    if (error) {
      console.error('Error inserting goals:', error);
      throw error;
    }
  }

  /**
   * Generate AI conversation data for testing
   */
  private async generateAIConversations(): Promise<void> {
    const conversations = [
      {
        id: 'conv_sample_1',
        user_id: this.userId,
        messages: JSON.stringify([
          {
            id: 'msg_1',
            role: 'user',
            content: 'How much did I spend on dining this month?',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'msg_2',
            role: 'assistant',
            content: 'You spent $320.50 on dining this month across 15 transactions. Your top restaurants were Starbucks ($45.20), Olive Garden ($38.50), and Chipotle ($32.10).',
            timestamp: new Date(Date.now() - 86400000 + 5000).toISOString(),
            embeddedData: {
              type: 'TransactionList',
              title: 'Dining Transactions This Month',
            }
          }
        ]),
        is_active: true,
      },
      {
        id: 'conv_sample_2', 
        user_id: this.userId,
        messages: JSON.stringify([
          {
            id: 'msg_3',
            role: 'user',
            content: 'What are my top spending categories?',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: 'msg_4',
            role: 'assistant',
            content: 'Your top spending categories this month are: 1) Groceries ($445.20), 2) Dining ($320.50), 3) Transportation ($180.75), 4) Entertainment ($125.30), and 5) Shopping ($95.40).',
            timestamp: new Date(Date.now() - 172800000 + 3000).toISOString(),
            embeddedData: {
              type: 'CategoryBreakdownChart',
              title: 'Top Spending Categories',
            }
          },
          {
            id: 'msg_5',
            role: 'user', 
            content: 'Can you show me more details about those grocery expenses?',
            timestamp: new Date(Date.now() - 172800000 + 300000).toISOString(),
          },
          {
            id: 'msg_6',
            role: 'assistant',
            content: 'Here are your grocery expenses for this month. You made 12 trips with an average of $37.10 per trip. Your largest purchase was $89.50 at Whole Foods Market.',
            timestamp: new Date(Date.now() - 172800000 + 305000).toISOString(),
            embeddedData: {
              type: 'TransactionList',
              title: 'Grocery Transactions This Month',
            }
          }
        ]),
        is_active: true,
      }
    ];
    
    console.log(`🤖 Inserting ${conversations.length} AI conversations...`);
    
    const { error } = await supabase
      .from('ai_conversations')
      .insert(conversations);
    
    if (error) {
      console.error('Error inserting AI conversations:', error);
      throw error;
    }
    
    // Create query contexts
    const contexts = [
      {
        id: 'ctx_sample_1',
        conversation_id: 'conv_sample_1',
        last_query_type: 'spending_summary',
        relevant_timeframe: 'current_month',
        focus_categories: JSON.stringify(['dining']),
        budget_context: null,
        langchain_memory: null,
      },
      {
        id: 'ctx_sample_2',
        conversation_id: 'conv_sample_2', 
        last_query_type: 'category_breakdown',
        relevant_timeframe: 'current_month',
        focus_categories: JSON.stringify(['groceries', 'dining', 'transportation']),
        budget_context: null,
        langchain_memory: null,
      }
    ];
    
    const { error: contextError } = await supabase
      .from('ai_query_context')
      .insert(contexts);
    
    if (contextError) {
      console.error('Error inserting query contexts:', contextError);
      throw contextError;
    }
  }

  /**
   * Print data summary
   */
  private async printDataSummary(): Promise<void> {
    console.log('\n📊 DATA GENERATION SUMMARY');
    console.log('========================');
    
    // Count transactions
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);
    
    // Count budgets
    const { count: budgetCount } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);
    
    // Count goals
    const { count: goalCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);
    
    // Count conversations
    const { count: conversationCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);
    
    console.log(`💳 Transactions: ${transactionCount}`);
    console.log(`💰 Budgets: ${budgetCount}`);
    console.log(`🎯 Goals: ${goalCount}`);
    console.log(`🤖 AI Conversations: ${conversationCount}`);
    console.log(`👤 User ID: ${this.userId}`);
    console.log('\n✅ Ready for testing!');
    
    // Show some sample queries for testing
    console.log('\n🔍 SUGGESTED TEST QUERIES FOR AI ASSISTANT:');
    console.log('==========================================');
    console.log('• "How much did I spend on groceries this month?"');
    console.log('• "What are my top 5 spending categories?"');
    console.log('• "Show me my largest transactions from last week"');
    console.log('• "Am I staying within my dining budget?"');
    console.log('• "How much money do I have left in my entertainment budget?"');
    console.log('• "Show me all transactions at Starbucks"');
    console.log('• "What did I spend at Walmart last month?"');
    console.log('• "Compare my spending this month vs last month"');
    console.log('• "How is my emergency fund goal progressing?"');
  }

  /**
   * Clear all fake data (useful for testing)
   */
  async clearFakeData(): Promise<void> {
    console.log('🗑️ Clearing fake data...');
    
    try {
      // Delete in reverse order of dependencies
      await supabase.from('ai_query_context').delete().eq('conversation_id', 'conv_sample_1');
      await supabase.from('ai_query_context').delete().eq('conversation_id', 'conv_sample_2');
      await supabase.from('ai_conversations').delete().eq('user_id', this.userId);
      await supabase.from('budgets').delete().eq('user_id', this.userId);
      await supabase.from('goals').delete().eq('user_id', this.userId);
      await supabase.from('transactions').delete().eq('user_id', this.userId);
      
      console.log('✅ Fake data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing fake data:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
export { FakeDataGenerator };

// CLI usage when run directly
if (require.main === module) {
  const generator = new FakeDataGenerator();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  if (shouldClear) {
    generator.clearFakeData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    // Generate with custom options
    const options: FakeDataOptions = {
      monthsBack: args.includes('--months') ? parseInt(args[args.indexOf('--months') + 1]) : 6,
      transactionsPerMonth: args.includes('--transactions') ? parseInt(args[args.indexOf('--transactions') + 1]) : 80,
      includeBudgets: !args.includes('--no-budgets'),
      includeGoals: !args.includes('--no-goals'),
      includeAIConversations: !args.includes('--no-ai'),
    };
    
    generator.generateFakeData(options)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}