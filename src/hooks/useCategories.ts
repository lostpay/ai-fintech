import { useState, useEffect, useCallback } from 'react';
import { Category, CreateCategoryRequest } from '../types/Category';
import { useDatabaseService } from './useDatabaseService';

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  addCategory: (categoryData: CreateCategoryRequest) => Promise<Category>;
}

export const useCategories = (): UseCategoriesReturn => {
  const databaseService = useDatabaseService();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const categoriesData = await databaseService.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [databaseService]);

  const refreshCategories = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(async (categoryData: CreateCategoryRequest): Promise<Category> => {
    try {
      setError(null);
      
      // Initialize database if not already done
      await databaseService.initialize();
      
      const newCategory = await databaseService.createCategory(categoryData);
      
      // Update local state
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      
      return newCategory;
    } catch (err) {
      console.error('Error adding category:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add category';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [databaseService]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refreshCategories,
    addCategory,
  };
};