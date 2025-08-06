export interface Category {
  id: number;
  name: string;
  color: string; // Hex color code like "#1976D2"
  icon: string; // Icon name from React Native Vector Icons
  is_default: boolean; // true for system categories, false for user-created
  is_hidden: boolean; // true if default category is hidden from selection
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryRequest {
  name: string;
  color: string; // Hex color code like "#1976D2"
  icon: string; // Icon name from React Native Vector Icons
  is_default?: boolean; // Defaults to false
  is_hidden?: boolean; // Defaults to false
}

export interface CategoryUsageStats {
  category_id: number;
  category_name: string;
  transaction_count: number;
  total_amount: number; // Total spending in this category in cents
  average_amount: number; // Average transaction amount in cents
  last_used: Date | null;
  monthly_usage: { month: string; count: number; amount: number }[];
}

export interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
}