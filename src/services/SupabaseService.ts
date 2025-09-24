import { supabase, DEFAULT_USER_ID, Database } from '../config/supabase';
import { Transaction, Category, Budget, Goal } from '../types';

export class SupabaseService {
  private userId: string;

  constructor(userId: string = DEFAULT_USER_ID) {
    this.userId = userId;
  }

  // Transaction operations
  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          amount: Math.round(transaction.amount * 100), // Convert to cents
          description: transaction.description,
          category_id: transaction.category_id,
          transaction_type: transaction.transaction_type,
          date: transaction.date,
          user_id: this.userId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        amount: data.amount / 100, // Convert back to dollars
        description: data.description,
        category_id: data.category_id,
        transaction_type: data.transaction_type as 'expense' | 'income',
        date: data.date,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
  }

  async getTransactions(limit: number = 100): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        amount: item.amount / 100, // Convert cents to dollars
        description: item.description,
        category_id: item.category_id,
        transaction_type: item.transaction_type as 'expense' | 'income',
        date: item.date,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async getTransactionsWithCategories(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        amount: item.amount / 100, // Convert cents to dollars
        description: item.description,
        category_id: item.category_id,
        category_name: item.categories?.name || 'Unknown',
        category_color: item.categories?.color || '#666666',
        category_icon: item.categories?.icon || 'help',
        transaction_type: item.transaction_type as 'expense' | 'income',
        date: item.date,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error getting transactions with categories:', error);
      return [];
    }
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<boolean> {
    try {
      const updateData: any = { ...updates };
      if (updates.amount !== undefined) {
        updateData.amount = Math.round(updates.amount * 100); // Convert to cents
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  }

  async deleteTransaction(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${this.userId}`)
        .eq('is_hidden', false)
        .order('is_default', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        icon: item.icon,
        is_default: item.is_default,
        is_hidden: item.is_hidden,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          color: category.color,
          icon: category.icon,
          is_default: category.is_default || false,
          is_hidden: category.is_hidden || false,
          user_id: this.userId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        color: data.color,
        icon: data.icon,
        is_default: data.is_default,
        is_hidden: data.is_hidden,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      return false;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // Budget operations
  async getBudgets(): Promise<Budget[]> {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('user_id', this.userId)
        .order('period_start', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        category_id: item.category_id,
        category_name: item.categories?.name || 'Unknown',
        category_icon: item.categories?.icon || 'category',
        category_color: item.categories?.color || '#757575',
        amount: item.amount / 100, // Convert cents to dollars
        period_start: item.period_start,
        period_end: item.period_end,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error getting budgets:', error);
      return [];
    }
  }

  async getBudgetsWithDetails(): Promise<any[]> {
    try {
      const budgets = await this.getBudgets();
      
      // Calculate spending for each budget
      const budgetsWithDetails = await Promise.all(
        budgets.map(async (budget) => {
          const { data: spending, error } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', this.userId)
            .eq('category_id', budget.category_id)
            .eq('transaction_type', 'expense')
            .gte('date', budget.period_start)
            .lte('date', budget.period_end);

          if (error) {
            console.error('Error calculating budget spending:', error);
            return {
              ...budget,
              spent_amount: 0,
              remaining_amount: budget.amount,
              percentage_used: 0,
            };
          }

          const spentAmount = spending.reduce((sum, transaction) => sum + (transaction.amount / 100), 0);
          const remainingAmount = budget.amount - spentAmount;
          const percentageUsed = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

          return {
            ...budget,
            spent_amount: spentAmount,
            remaining_amount: remainingAmount,
            percentage_used: percentageUsed,
          };
        })
      );

      return budgetsWithDetails;
    } catch (error) {
      console.error('Error getting budgets with details:', error);
      return [];
    }
  }

  async createBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget | null> {
    try {
      console.log('Creating budget with data:', {
        category_id: budget.category_id,
        amount: Math.round(budget.amount * 100), // Convert to cents
        period_start: budget.period_start,
        period_end: budget.period_end,
        user_id: this.userId,
      });

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          category_id: budget.category_id,
          amount: Math.round(budget.amount * 100), // Convert to cents
          period_start: budget.period_start,
          period_end: budget.period_end,
          user_id: this.userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating budget:', error);
        throw new Error(`Failed to create budget: ${error.message}`);
      }

      console.log('Budget created successfully:', data);

      return {
        id: data.id,
        category_id: data.category_id,
        amount: data.amount / 100, // Convert back to dollars
        period_start: data.period_start,
        period_end: data.period_end,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error: any) {
      console.error('Error creating budget:', error);
      throw error; // Re-throw with more specific error message
    }
  }

  async updateBudget(id: number, updates: Partial<Budget>): Promise<boolean> {
    try {
      const updateData: any = { ...updates };
      if (updates.amount !== undefined) {
        updateData.amount = Math.round(updates.amount * 100); // Convert to cents
      }

      const { error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating budget:', error);
      return false;
    }
  }

  async deleteBudget(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
  }

  // Goal operations
  async getGoals(): Promise<Goal[]> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        target_amount: item.target_amount / 100, // Convert cents to dollars
        current_amount: item.current_amount / 100, // Convert cents to dollars
        target_date: item.target_date,
        description: item.description,
        is_completed: item.is_completed,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  async createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          name: goal.name,
          target_amount: Math.round(goal.target_amount * 100), // Convert to cents
          current_amount: Math.round((goal.current_amount || 0) * 100), // Convert to cents
          target_date: goal.target_date,
          description: goal.description,
          is_completed: goal.is_completed || false,
          user_id: this.userId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        target_amount: data.target_amount / 100, // Convert back to dollars
        current_amount: data.current_amount / 100, // Convert back to dollars
        target_date: data.target_date,
        description: data.description,
        is_completed: data.is_completed,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<boolean> {
    try {
      const updateData: any = { ...updates };
      if (updates.target_amount !== undefined) {
        updateData.target_amount = Math.round(updates.target_amount * 100);
      }
      if (updates.current_amount !== undefined) {
        updateData.current_amount = Math.round(updates.current_amount * 100);
      }

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      return false;
    }
  }

  async deleteGoal(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  // AI Conversation operations
  async saveConversation(id: string, messages: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .upsert({
          id: id,
          user_id: this.userId,
          messages: messages,
          is_active: true,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  async getActiveConversations(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  async saveQueryContext(contextId: string, conversationId: string, context: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_query_context')
        .upsert({
          id: contextId,
          conversation_id: conversationId,
          last_query_type: context.last_query_type,
          relevant_timeframe: context.relevant_timeframe,
          focus_categories: context.focus_categories,
          budget_context: context.budget_context,
          langchain_memory: context.langchain_memory,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving query context:', error);
      return false;
    }
  }

  // Initialize database with default categories
  async initializeDatabase(): Promise<void> {
    try {
      // Check if default categories already exist
      const { data: existingCategories, error } = await supabase
        .from('categories')
        .select('id')
        .eq('is_default', true)
        .is('user_id', null);

      if (error) throw error;

      // If no default categories exist, they should be created via SQL migration
      // The React Native app doesn't need to create them
      console.log('Database initialization check completed');
    } catch (error) {
      console.error('Error during database initialization:', error);
      throw error;
    }
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Statistics
  async getSpendingSummary(startDate?: string, endDate?: string): Promise<any> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          amount,
          transaction_type,
          categories (name)
        `)
        .eq('user_id', this.userId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const summary = {
        total_amount: 0,
        transaction_count: 0,
        category_breakdown: {} as Record<string, number>,
      };

      data.forEach((transaction: any) => {
        const amount = transaction.amount / 100; // Convert cents to dollars
        const categoryName = transaction.categories?.name || 'Unknown';

        if (transaction.transaction_type === 'expense') {
          summary.total_amount += amount;
          summary.category_breakdown[categoryName] = 
            (summary.category_breakdown[categoryName] || 0) + amount;
        }
        summary.transaction_count += 1;
      });

      return summary;
    } catch (error) {
      console.error('Error getting spending summary:', error);
      return {
        total_amount: 0,
        transaction_count: 0,
        category_breakdown: {},
      };
    }
  }
}