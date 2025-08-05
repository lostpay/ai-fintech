export interface Transaction {
  id: number;
  amount: number; // Amount in cents to avoid floating-point issues
  description: string;
  category_id: number;
  transaction_type: 'expense' | 'income';
  date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionRequest {
  amount: number; // Amount in cents
  description: string;
  category_id: number;
  transaction_type: 'expense' | 'income';
  date?: Date; // Optional, defaults to current date
}

export interface UpdateTransactionRequest {
  amount?: number; // Amount in cents
  description?: string;
  category_id?: number;
  transaction_type?: 'expense' | 'income';
  date?: Date;
}