export interface Budget {
  id: number;
  category_id: number;
  amount: number; // Budget limit in cents
  period_start: Date;
  period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBudgetRequest {
  category_id: number;
  amount: number; // Budget limit in cents
  period_start: Date;
  period_end: Date;
}

export interface BudgetProgress {
  budget_id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  budgeted_amount: number; // Budget limit in cents
  spent_amount: number; // Actual spending in cents
  remaining_amount: number; // Remaining budget in cents (can be negative)
  percentage_used: number; // Percentage of budget used (can be >100%)
  status: 'under' | 'approaching' | 'over'; // Color coding status
  period_start: Date;
  period_end: Date;
}

export interface UnbudgetedSpending {
  category_id: number;
  category_name: string;
  category_color: string;
  spent_amount: number;
  transaction_count: number;
}

export type BudgetStatus = 'under' | 'approaching' | 'over';