import { DatabaseService } from './DatabaseService';
import { Category, CategoryUsageStats, CategoryFormData } from '../types/Category';
import { emitCategoryChanged } from '../utils/eventEmitter';

export class CategoryService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Create a custom category with validation
   */
  async createCustomCategory(categoryData: CategoryFormData): Promise<number> {
    // Validate category data
    await this.validateCategoryData(categoryData);
    
    const result = await this.databaseService.createCategory({
      name: categoryData.name,
      color: categoryData.color,
      icon: categoryData.icon,
      is_default: false,
      is_hidden: false
    });
    
    // Emit event for real-time updates
    emitCategoryChanged({ 
      type: 'created', 
      categoryId: result.id,
      category: result
    });
    
    return result.id;
  }

  /**
   * Update category with validation
   */
  async updateCategory(id: number, updates: Partial<CategoryFormData>): Promise<void> {
    const category = await this.databaseService.getCategoryById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Category found - we can proceed with update
    
    // Validate updates
    const validatedUpdates: any = {};
    
    if (updates.name && updates.name !== category.name) {
      await this.validateCategoryName(updates.name, id);
      validatedUpdates.name = updates.name;
    }
    
    if (updates.color && updates.color !== category.color) {
      this.validateColorFormat(updates.color);
      this.validateColorContrast(updates.color);
      validatedUpdates.color = updates.color;
    }
    
    if (updates.icon && updates.icon !== category.icon) {
      this.validateIconName(updates.icon);
      validatedUpdates.icon = updates.icon;
    }

    if (Object.keys(validatedUpdates).length === 0) {
      return; // No changes to apply
    }

    // Execute update via DatabaseService
    await this.executeUpdateQuery(id, validatedUpdates);
    
    const updatedCategory = await this.databaseService.getCategoryById(id);
    emitCategoryChanged({ 
      type: 'updated', 
      categoryId: id,
      category: updatedCategory!
    });
  }

  /**
   * Delete category with usage validation
   */
  async deleteCategory(id: number, force: boolean = false): Promise<void> {
    const category = await this.databaseService.getCategoryById(id);
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    if (category.is_default) {
      throw new Error('Default categories cannot be deleted. Use hideCategory instead.');
    }
    
    // Check if category is used in transactions or budgets
    const usageStats = await this.getCategoryUsageStats(id);
    if (usageStats.length > 0 && usageStats[0].transaction_count > 0 && !force) {
      throw new Error(`Cannot delete category "${category.name}" - it is used in ${usageStats[0].transaction_count} transactions. Hide it instead or use force delete.`);
    }
    
    await this.executeDeleteQuery(id);
    
    emitCategoryChanged({ 
      type: 'deleted', 
      categoryId: id,
      category
    });
  }

  /**
   * Hide default category from selection
   */
  async hideCategory(id: number): Promise<void> {
    const category = await this.databaseService.getCategoryById(id);
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    if (!category.is_default) {
      throw new Error('Only default categories can be hidden');
    }
    
    await this.executeUpdateQuery(id, { is_hidden: true });
    
    const updatedCategory = await this.databaseService.getCategoryById(id);
    emitCategoryChanged({ 
      type: 'hidden', 
      categoryId: id,
      category: updatedCategory!
    });
  }

  /**
   * Show hidden default category
   */
  async showCategory(id: number): Promise<void> {
    await this.executeUpdateQuery(id, { is_hidden: false });
    
    const updatedCategory = await this.databaseService.getCategoryById(id);
    emitCategoryChanged({ 
      type: 'shown', 
      categoryId: id,
      category: updatedCategory!
    });
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return await this.databaseService.getCategories();
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    return await this.databaseService.getCategoryById(id);
  }

  /**
   * Get category usage statistics
   */
  async getCategoryUsageStats(categoryId?: number): Promise<CategoryUsageStats[]> {
    const db = (this.databaseService as any).db;
    if (!db) throw new Error('Database not connected');
    
    const whereClause = categoryId ? 'WHERE c.id = ?' : '';
    const params = categoryId ? [categoryId] : [];
    
    const results = await db.getAllAsync(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE NULL END), 0) as average_amount,
        MAX(t.date) as last_used
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY transaction_count DESC, c.name
    `, params);
    
    // Get monthly usage for each category
    const statsWithMonthly = await Promise.all(
      results.map(async (stat: any) => {
        const monthlyUsage = await this.getMonthlyUsageStats(stat.category_id);
        return {
          category_id: stat.category_id,
          category_name: stat.category_name,
          transaction_count: stat.transaction_count,
          total_amount: stat.total_amount || 0,
          average_amount: stat.average_amount || 0,
          last_used: stat.last_used ? new Date(stat.last_used) : null,
          monthly_usage: monthlyUsage,
        } as CategoryUsageStats;
      })
    );
    
    return statsWithMonthly;
  }

  /**
   * Get monthly usage statistics for a category
   */
  private async getMonthlyUsageStats(categoryId: number): Promise<{ month: string; count: number; amount: number }[]> {
    const db = (this.databaseService as any).db;
    if (!db) throw new Error('Database not connected');
    
    const results = await db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM transactions 
      WHERE category_id = ? AND transaction_type = 'expense'
        AND date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
    `, [categoryId]);
    
    return results.map((row: any) => ({
      month: row.month,
      count: row.count,
      amount: row.amount || 0,
    }));
  }

  /**
   * Validate complete category data
   */
  private async validateCategoryData(data: CategoryFormData): Promise<void> {
    // Name validation
    await this.validateCategoryName(data.name);
    
    // Color validation
    this.validateColorFormat(data.color);
    this.validateColorContrast(data.color);
    
    // Icon validation
    this.validateIconName(data.icon);
  }

  /**
   * Validate category name for uniqueness and format
   */
  private async validateCategoryName(name: string, excludeId?: number): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new Error('Category name is required');
    }
    
    if (name.length > 50) {
      throw new Error('Category name must be 50 characters or less');
    }
    
    // Check for duplicate names
    const categories = await this.getCategories();
    const existing = categories.find(c => 
      c.name.toLowerCase() === name.trim().toLowerCase() && 
      (!excludeId || c.id !== excludeId)
    );
    
    if (existing) {
      throw new Error('A category with this name already exists');
    }
  }

  /**
   * Validate color format (hex color)
   */
  private validateColorFormat(color: string): void {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(color)) {
      throw new Error('Color must be a valid hex color code (e.g., #FF5722)');
    }
  }

  /**
   * Validate color contrast for accessibility
   */
  private validateColorContrast(color: string): void {
    // Basic contrast validation - could be enhanced with actual contrast ratio calculation
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Calculate relative luminance (simplified)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Ensure color is not too light (would have poor contrast on white backgrounds)
    if (luminance > 0.8) {
      throw new Error('Color is too light and may have poor contrast. Please choose a darker color.');
    }
  }

  /**
   * Validate icon name
   */
  private validateIconName(icon: string): void {
    if (!icon || icon.trim().length === 0) {
      throw new Error('Icon selection is required');
    }
    
    // Basic validation - could be enhanced with actual icon existence check
    if (icon.length > 30) {
      throw new Error('Icon name is too long');
    }
  }

  /**
   * Execute database update query
   */
  private async executeUpdateQuery(id: number, updates: any): Promise<void> {
    const db = (this.databaseService as any).db;
    if (!db) throw new Error('Database not connected');
    
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updates)) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
    }
    
    updateValues.push(id);
    
    await db.runAsync(`
      UPDATE categories 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);
  }

  /**
   * Execute database delete query
   */
  private async executeDeleteQuery(id: number): Promise<void> {
    const db = (this.databaseService as any).db;
    if (!db) throw new Error('Database not connected');
    
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}

// Export singleton instance
export const categoryService = new CategoryService(new DatabaseService());