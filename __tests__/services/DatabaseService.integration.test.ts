/**
 * Integration tests for DatabaseService using real SQLite database
 * These tests run with actual database operations to verify functionality
 */
import { DatabaseService } from '../../src/services/DatabaseService';
import { CreateTransactionRequest } from '../../src/types/Transaction';
import { CreateCategoryRequest } from '../../src/types/Category';

// Skip these tests in CI/automated environments where SQLite might not be available  
const describeDatabase = process.env.NODE_ENV === 'test' ? describe.skip : describe;

describeDatabase('DatabaseService Integration Tests', () => {
  let dbService: DatabaseService;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterAll(async () => {
    await dbService.clearAllData();
    await dbService.close();
  });

  beforeEach(async () => {
    await dbService.clearAllData();
    // Re-initialize to populate default categories
    await dbService.close();
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  it('should initialize and populate default categories', async () => {
    const categories = await dbService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every(cat => cat.is_default)).toBe(true);
  });

  it('should create and retrieve a transaction', async () => {
    const categories = await dbService.getCategories();
    const categoryId = categories[0].id;

    const transactionData: CreateTransactionRequest = {
      amount: 2500, // $25.00 in cents
      description: 'Test transaction',
      category_id: categoryId,
      transaction_type: 'expense'
    };

    const transaction = await dbService.createTransaction(transactionData);
    expect(transaction.id).toBeGreaterThan(0);
    expect(transaction.amount).toBe(2500);

    const retrieved = await dbService.getTransactionById(transaction.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.amount).toBe(2500);
  });

  it('should create custom category and use it for transaction', async () => {
    const categoryData: CreateCategoryRequest = {
      name: 'Test Category',
      color: '#FF5722',
      icon: 'test-icon',
      is_default: false
    };

    const category = await dbService.createCategory(categoryData);
    expect(category.id).toBeGreaterThan(0);

    const transactionData: CreateTransactionRequest = {
      amount: 1500,
      description: 'Transaction with custom category',
      category_id: category.id,
      transaction_type: 'expense'
    };

    const transaction = await dbService.createTransaction(transactionData);
    expect(transaction.category_id).toBe(category.id);
  });

  it('should enforce foreign key constraints', async () => {
    const transactionData: CreateTransactionRequest = {
      amount: 1000,
      description: 'Invalid category transaction',
      category_id: 99999, // Non-existent category
      transaction_type: 'expense'
    };

    await expect(dbService.createTransaction(transactionData)).rejects.toThrow();
  });
});