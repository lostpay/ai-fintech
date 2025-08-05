export interface Category {
  id: number;
  name: string;
  color: string; // Hex color code like "#1976D2"
  icon: string; // Icon name from React Native Vector Icons
  is_default: boolean; // true for system categories, false for user-created
  created_at: Date;
}

export interface CreateCategoryRequest {
  name: string;
  color: string; // Hex color code like "#1976D2"
  icon: string; // Icon name from React Native Vector Icons
  is_default?: boolean; // Defaults to false
}