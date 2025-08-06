export interface BudgetAlert {
  id: string;
  budget_id: number;
  category_name: string;
  category_color: string;
  alert_type: 'approaching' | 'at_limit' | 'over_budget';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggested_actions: string[];
  budget_amount: number; // Budget limit in cents
  spent_amount: number; // Current spending in cents
  remaining_amount: number; // Remaining budget in cents (can be negative)
  percentage_used: number; // Percentage of budget used (can be >100%)
  transaction_id?: number; // The transaction that triggered this alert
  created_at: Date;
  acknowledged: boolean;
}

export interface BudgetImpact {
  transaction_id: number;
  category_id: number;
  category_name: string;
  budget_before: {
    spent: number;
    remaining: number;
    percentage: number;
    status: 'under' | 'approaching' | 'over';
  };
  budget_after: {
    spent: number;
    remaining: number;
    percentage: number;
    status: 'under' | 'approaching' | 'over';
  };
  alerts_triggered: BudgetAlert[];
}

export interface AlertConfiguration {
  enabled: boolean;
  approaching_threshold: number; // Default 75%
  sound_enabled: boolean;
  vibration_enabled: boolean;
  banner_alerts: boolean;
}

export type AlertType = 'approaching' | 'at_limit' | 'over_budget';
export type AlertSeverity = 'info' | 'warning' | 'error';
export type BudgetStatusType = 'under' | 'approaching' | 'over';