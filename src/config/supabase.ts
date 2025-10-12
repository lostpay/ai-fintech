import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase credentials from environment
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file and app.config.js');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database type definitions for Supabase
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          name: string;
          color: string;
          icon: string;
          is_default: boolean;
          is_hidden: boolean;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          color: string;
          icon: string;
          is_default?: boolean;
          is_hidden?: boolean;
          user_id?: string | null;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string;
          is_default?: boolean;
          is_hidden?: boolean;
          user_id?: string | null;
        };
      };
      transactions: {
        Row: {
          id: number;
          amount: number;
          description: string;
          category_id: number;
          transaction_type: 'expense' | 'income';
          date: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          description: string;
          category_id: number;
          transaction_type: 'expense' | 'income';
          date?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          description?: string;
          category_id?: number;
          transaction_type?: 'expense' | 'income';
          date?: string;
        };
      };
      budgets: {
        Row: {
          id: number;
          category_id: number;
          amount: number;
          period_start: string;
          period_end: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_id: number;
          amount: number;
          period_start: string;
          period_end: string;
          user_id: string;
        };
        Update: {
          category_id?: number;
          amount?: number;
          period_start?: string;
          period_end?: string;
        };
      };
      goals: {
        Row: {
          id: number;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          description: string;
          is_completed: boolean;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          description: string;
          is_completed?: boolean;
          user_id: string;
        };
        Update: {
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          description?: string;
          is_completed?: boolean;
        };
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          messages: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id: string;
          user_id: string;
          messages: string;
          is_active?: boolean;
        };
        Update: {
          messages?: string;
          is_active?: boolean;
        };
      };
      ai_query_context: {
        Row: {
          id: string;
          conversation_id: string;
          last_query_type: string | null;
          relevant_timeframe: string | null;
          focus_categories: string | null;
          budget_context: string | null;
          langchain_memory: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          conversation_id: string;
          last_query_type?: string | null;
          relevant_timeframe?: string | null;
          focus_categories?: string | null;
          budget_context?: string | null;
          langchain_memory?: string | null;
        };
        Update: {
          last_query_type?: string | null;
          relevant_timeframe?: string | null;
          focus_categories?: string | null;
          budget_context?: string | null;
          langchain_memory?: string | null;
        };
      };
    };
  };
};