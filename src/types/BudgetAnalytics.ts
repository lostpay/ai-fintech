export interface MonthlyBudgetPerformance {
  month: string; // YYYY-MM format
  total_budgeted: number;
  total_spent: number;
  budget_utilization: number; // Percentage of total budget used
  budgets_met: number;
  total_budgets: number;
  success_rate: number; // Percentage of budgets successfully met
  average_overspend: number;
  categories: CategoryPerformance[];
}

export interface CategoryPerformance {
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  budgeted_amount: number;
  spent_amount: number;
  utilization_percentage: number;
  status: 'under' | 'on_track' | 'over';
  trend: 'improving' | 'stable' | 'worsening';
  consistency_score: number; // How consistent spending is in this category
  recommendations: string[];
}

export interface SpendingTrend {
  period: string;
  amount: number;
  change_from_previous: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface BudgetSuccessMetrics {
  overall_success_rate: number;
  current_streak: number; // Consecutive months of budget success
  best_streak: number;
  average_overspend: number;
  most_successful_category: CategoryPerformance;
  most_challenging_category: CategoryPerformance;
  improvement_trend: 'improving' | 'stable' | 'declining';
  monthly_performance: MonthlyBudgetPerformance[];
}

export interface AnalyticsPeriod {
  label: string;
  value: '1m' | '3m' | '6m' | '1y';
  months: number;
}

export interface AnalyticsInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'recommendation';
  title: string;
  message: string;
  category_id?: number;
  action_text?: string;
}