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