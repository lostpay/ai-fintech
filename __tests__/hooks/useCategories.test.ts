import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCategories } from '../../src/hooks/useCategories';
import { DatabaseService } from '../../src/services/DatabaseService';

// Mock the DatabaseService
jest.mock('../../src/services/DatabaseService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

const mockCategories = [
  { id: 1, name: 'Food', color: '#FF9800', icon: 'restaurant', is_default: true, is_hidden: false, created_at: new Date(), updated_at: new Date() },
  { id: 2, name: 'Transport', color: '#2196F3', icon: 'directions-car', is_default: true, is_hidden: false, created_at: new Date(), updated_at: new Date() },
  { id: 3, name: 'Shopping', color: '#4CAF50', icon: 'shopping-cart', is_default: true, is_hidden: false, created_at: new Date(), updated_at: new Date() },
];

describe('useCategories', () => {
  let mockDatabaseInstance: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseInstance = {
      initialize: jest.fn(),
      getCategories: jest.fn(),
      createCategory: jest.fn(),
      close: jest.fn(),
    } as any;

    MockedDatabaseService.mockImplementation(() => mockDatabaseInstance);
  });

  it('initializes with loading state', () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('loads categories successfully', async () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
    expect(mockDatabaseInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockDatabaseInstance.getCategories).toHaveBeenCalledTimes(1);
  });

  it('handles loading error', async () => {
    const errorMessage = 'Failed to load categories';
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('handles database initialization error', async () => {
    const errorMessage = 'Database initialization failed';
    mockDatabaseInstance.initialize.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('refreshes categories', async () => {
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories
      .mockResolvedValueOnce(mockCategories.slice(0, 2))
      .mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => useCategories());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(2);

    // Refresh categories
    await act(async () => {
      await result.current.refreshCategories();
    });

    expect(result.current.categories).toHaveLength(3);
    expect(mockDatabaseInstance.getCategories).toHaveBeenCalledTimes(2);
  });

  it('adds a new category', async () => {
    const newCategoryData = {
      name: 'Entertainment',
      color: '#9C27B0',
      icon: 'movie',
      is_default: false,
    };

    const newCategory = {
      id: 4,
      ...newCategoryData,
      is_default: false,
      is_hidden: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockResolvedValue(mockCategories);
    mockDatabaseInstance.createCategory.mockResolvedValue(newCategory);

    const { result } = renderHook(() => useCategories());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(3);

    // Add new category
    let addedCategory: any;
    await act(async () => {
      addedCategory = await result.current.addCategory(newCategoryData);
    });

    expect(addedCategory).toEqual(newCategory);
    expect(result.current.categories).toHaveLength(4);
    expect(result.current.categories.find(cat => cat.id === 4)).toEqual(newCategory);
    expect(mockDatabaseInstance.createCategory).toHaveBeenCalledWith(newCategoryData);
  });

  it('handles add category error', async () => {
    const newCategoryData = {
      name: 'Entertainment',
      color: '#9C27B0',
      icon: 'movie',
      is_default: false,
    };

    const errorMessage = 'Failed to create category';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockResolvedValue(mockCategories);
    mockDatabaseInstance.createCategory.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Try to add category (should fail)
    await act(async () => {
      try {
        await result.current.addCategory(newCategoryData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.categories).toHaveLength(3); // Should remain unchanged
  });

  it('sorts categories alphabetically after adding', async () => {
    const newCategoryData = {
      name: 'Auto', // Should be first alphabetically
      color: '#9C27B0',
      icon: 'car',
      is_default: false,
    };

    const newCategory = {
      id: 4,
      ...newCategoryData,
      is_default: false,
      is_hidden: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories.mockResolvedValue(mockCategories);
    mockDatabaseInstance.createCategory.mockResolvedValue(newCategory);

    const { result } = renderHook(() => useCategories());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add new category
    await act(async () => {
      await result.current.addCategory(newCategoryData);
    });

    // Check that categories are sorted alphabetically
    const categoryNames = result.current.categories.map(cat => cat.name);
    const sortedNames = [...categoryNames].sort();
    expect(categoryNames).toEqual(sortedNames);
  });

  it('clears error when successful operation occurs', async () => {
    const errorMessage = 'Initial error';
    
    mockDatabaseInstance.initialize.mockResolvedValue(undefined);
    mockDatabaseInstance.getCategories
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => useCategories());

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    // Refresh should clear error
    await act(async () => {
      await result.current.refreshCategories();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.categories).toEqual(mockCategories);
  });
});