export interface Goal {
  id: number;
  name: string;
  target_amount: number; // Target amount in cents
  current_amount: number; // Current progress in cents
  target_date: Date | null; // Optional deadline
  description: string;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGoalRequest {
  name: string;
  target_amount: number; // Target amount in cents
  target_date?: Date | null; // Optional deadline
  description: string;
}