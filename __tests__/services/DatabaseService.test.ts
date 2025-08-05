import { DatabaseService } from '../../src/services/DatabaseService';
import { CreateTransactionRequest } from '../../src/types/Transaction';
import { CreateCategoryRequest } from '../../src/types/Category';
import { CreateBudgetRequest } from '../../src/types/Budget';
import { CreateGoalRequest } from '../../src/types/Goal';

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterEach(async () => {
    await dbService.clearAllData();
    await dbService.close();
  });

  describe('Database Initialization', () => {
    it('should initialize database successfully', async () => {
      const newDbService = new DatabaseService();
      await expect(newDbService.initialize()).resolves.not.toThrow();
      await newDbService.close();
    });

    it('should populate default categories on initialization', async () => {
      const categories = await dbService.getCategories();
      expect(categories).toHaveLength(9);
      expect(categories.every(cat => cat.is_default)).toBe(true);
      
      const categoryNames = categories.map(cat => cat.name);
      expect(categoryNames).toContain('Dining');
      expect(categoryNames).toContain('Groceries');
      expect(categoryNames).toContain('Transportation');
      expect(categoryNames).toContain('Income');
    });
  });

  describe('Category CRUD Operations', () => {
    it('should create a new category', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Test Category',
        color: '#FF5722',
        icon: 'test-icon',
        is_default: false
      };

      const category = await dbService.createCategory(categoryData);
      expect(category.name).toBe(categoryData.name);
      expect(category.color).toBe(categoryData.color);
      expect(category.icon).toBe(categoryData.icon);
      expect(category.is_default).toBe(false);
      expect(category.id).toBeGreaterThan(0);
      expect(category.created_at).toBeInstanceOf(Date);
    });

    it('should get category by id', async () => {
      const categories = await dbService.getCategories();
      const firstCategory = categories[0];
      
      const retrievedCategory = await dbService.getCategoryById(firstCategory.id);
      expect(retrievedCategory).not.toBeNull();
      expect(retrievedCategory!.id).toBe(firstCategory.id);
      expect(retrievedCategory!.name).toBe(firstCategory.name);
    });

    it('should return null for non-existent category', async () => {
      const category = await dbService.getCategoryById(99999);
      expect(category).toBeNull();
    });

    it('should enforce unique category names', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Dining', // This already exists in default categories
        color: '#FF5722',
        icon: 'test-icon'
      };

      await expect(dbService.createCategory(categoryData)).rejects.toThrow();
    });

    it('should validate color format', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Invalid Color Category',
        color: 'invalid-color', // Should be hex format
        icon: 'test-icon'
      };

      await expect(dbService.createCategory(categoryData)).rejects.toThrow();
    });
  });

  describe('Transaction CRUD Operations', () => {
    let categoryId: number;

    beforeEach(async () => {
      const categories = await dbService.getCategories();
      categoryId = categories[0].id;
    });

    it('should create a new transaction', async () => {
      const transactionData: CreateTransactionRequest = {
        amount: 2500, // $25.00 in cents
        description: 'Test transaction',
        category_id: categoryId,
        transaction_type: 'expense'
      };

      const transaction = await dbService.createTransaction(transactionData);
      expect(transaction.amount).toBe(transactionData.amount);
      expect(transaction.description).toBe(transactionData.description);
      expect(transaction.category_id).toBe(transactionData.category_id);
      expect(transaction.transaction_type).toBe(transactionData.transaction_type);
      expect(transaction.id).toBeGreaterThan(0);
      expect(transaction.date).toBeInstanceOf(Date);
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.updated_at).toBeInstanceOf(Date);
    });

    it('should create transaction with custom date', async () => {
      const customDate = new Date('2024-01-15');
      const transactionData: CreateTransactionRequest = {
        amount: 1500,
        description: 'Custom date transaction',
        category_id: categoryId,
        transaction_type: 'expense',
        date: customDate
      };

      const transaction = await dbService.createTransaction(transactionData);
      expect(transaction.date.toDateString()).toBe(customDate.toDateString());
    });

    it('should get all transactions', async () => {
      // Create a few test transactions
      const transactionData1: CreateTransactionRequest = {
        amount: 1000,
        description: 'Transaction 1',
        category_id: categoryId,
        transaction_type: 'expense'
      };

      const transactionData2: CreateTransactionRequest = {
        amount: 2000,
        description: 'Transaction 2',
        category_id: categoryId,
        transaction_type: 'income'
      };

      await dbService.createTransaction(transactionData1);
      await dbService.createTransaction(transactionData2);

      const transactions = await dbService.getTransactions();
      expect(transactions).toHaveLength(2);
      expect(transactions[0].date.getTime()).toBeGreaterThanOrEqual(transactions[1].date.getTime());
    });

    it('should filter transactions by category', async () => {
      const categories = await dbService.getCategories();
      const category1Id = categories[0].id;
      const category2Id = categories[1].id;

      await dbService.createTransaction({
        amount: 1000,
        description: 'Category 1 transaction',
        category_id: category1Id,
        transaction_type: 'expense'
      });

      await dbService.createTransaction({
        amount: 2000,
        description: 'Category 2 transaction',
        category_id: category2Id,
        transaction_type: 'expense'
      });

      const category1Transactions = await dbService.getTransactions(category1Id);
      expect(category1Transactions).toHaveLength(1);
      expect(category1Transactions[0].category_id).toBe(category1Id);
    });

    it('should filter transactions by type', async () => {
      await dbService.createTransaction({
        amount: 1000,
        description: 'Expense transaction',
        category_id: categoryId,
        transaction_type: 'expense'
      });

      await dbService.createTransaction({
        amount: 2000,
        description: 'Income transaction',
        category_id: categoryId,
        transaction_type: 'income'
      });

      const expenseTransactions = await dbService.getTransactions(undefined, 'expense');
      expect(expenseTransactions).toHaveLength(1);
      expect(expenseTransactions[0].transaction_type).toBe('expense');
    });

    it('should filter transactions by date range', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2024-12-31');

      await dbService.createTransaction({
        amount: 1000,
        description: 'Past transaction',
        category_id: categoryId,
        transaction_type: 'expense',
        date: pastDate
      });

      await dbService.createTransaction({
        amount: 2000,
        description: 'Future transaction',
        category_id: categoryId,
        transaction_type: 'expense',
        date: futureDate
      });

      const rangeTransactions = await dbService.getTransactions(
        undefined, 
        undefined, 
        new Date('2024-06-01'), 
        new Date('2024-12-31')
      );
      
      expect(rangeTransactions).toHaveLength(1);
      expect(rangeTransactions[0].description).toBe('Future transaction');
    });

    it('should update transaction', async () => {
      const transaction = await dbService.createTransaction({
        amount: 1000,
        description: 'Original description',
        category_id: categoryId,
        transaction_type: 'expense'
      });

      const updatedTransaction = await dbService.updateTransaction(transaction.id, {
        amount: 1500,
        description: 'Updated description'
      });

      expect(updatedTransaction.amount).toBe(1500);
      expect(updatedTransaction.description).toBe('Updated description');
      expect(updatedTransaction.updated_at.getTime()).toBeGreaterThan(updatedTransaction.created_at.getTime());
    });

    it('should delete transaction', async () => {
      const transaction = await dbService.createTransaction({
        amount: 1000,
        description: 'To be deleted',
        category_id: categoryId,
        transaction_type: 'expense'
      });

      await dbService.deleteTransaction(transaction.id);

      const retrievedTransaction = await dbService.getTransactionById(transaction.id);
      expect(retrievedTransaction).toBeNull();
    });

    it('should validate positive amounts', async () => {
      const transactionData: CreateTransactionRequest = {
        amount: -1000, // Negative amount should fail
        description: 'Invalid amount',
        category_id: categoryId,
        transaction_type: 'expense'
      };

      await expect(dbService.createTransaction(transactionData)).rejects.toThrow();
    });

    it('should validate transaction type', async () => {
      const transactionData = {
        amount: 1000,
        description: 'Invalid type',
        category_id: categoryId,
        transaction_type: 'invalid-type' as any
      };

      await expect(dbService.createTransaction(transactionData)).rejects.toThrow();
    });

    it('should enforce foreign key constraint', async () => {
      const transactionData: CreateTransactionRequest = {
        amount: 1000,
        description: 'Invalid category',
        category_id: 99999, // Non-existent category
        transaction_type: 'expense'
      };

      await expect(dbService.createTransaction(transactionData)).rejects.toThrow();
    });
  });

  describe('Budget CRUD Operations', () => {
    let categoryId: number;

    beforeEach(async () => {
      const categories = await dbService.getCategories();
      categoryId = categories[0].id;
    });

    it('should create a new budget', async () => {
      const budgetData: CreateBudgetRequest = {
        category_id: categoryId,
        amount: 50000, // $500.00 in cents
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31')
      };

      const budget = await dbService.createBudget(budgetData);
      expect(budget.category_id).toBe(budgetData.category_id);
      expect(budget.amount).toBe(budgetData.amount);
      expect(budget.period_start.toDateString()).toBe(budgetData.period_start.toDateString());
      expect(budget.period_end.toDateString()).toBe(budgetData.period_end.toDateString());
      expect(budget.id).toBeGreaterThan(0);
    });

    it('should get all budgets', async () => {
      await dbService.createBudget({
        category_id: categoryId,
        amount: 50000,
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31')
      });

      const budgets = await dbService.getBudgets();
      expect(budgets).toHaveLength(1);
      expect(budgets[0].category_id).toBe(categoryId);
    });

    it('should validate budget period', async () => {
      const budgetData: CreateBudgetRequest = {
        category_id: categoryId,
        amount: 50000,
        period_start: new Date('2024-01-31'),
        period_end: new Date('2024-01-01') // End date before start date
      };

      await expect(dbService.createBudget(budgetData)).rejects.toThrow();
    });
  });

  describe('Goal CRUD Operations', () => {
    it('should create a new goal', async () => {
      const goalData: CreateGoalRequest = {
        name: 'Emergency Fund',
        target_amount: 100000, // $1000.00 in cents
        description: 'Build emergency fund',
        target_date: new Date('2024-12-31')
      };

      const goal = await dbService.createGoal(goalData);
      expect(goal.name).toBe(goalData.name);
      expect(goal.target_amount).toBe(goalData.target_amount);
      expect(goal.description).toBe(goalData.description);
      expect(goal.target_date!.toDateString()).toBe(goalData.target_date!.toDateString());
      expect(goal.current_amount).toBe(0);
      expect(goal.is_completed).toBe(false);
      expect(goal.id).toBeGreaterThan(0);
    });

    it('should create goal without target date', async () => {
      const goalData: CreateGoalRequest = {
        name: 'Vacation Fund',
        target_amount: 200000,
        description: 'Save for vacation'
      };

      const goal = await dbService.createGoal(goalData);
      expect(goal.target_date).toBeNull();
    });

    it('should get all goals', async () => {
      await dbService.createGoal({
        name: 'Goal 1',
        target_amount: 100000,
        description: 'First goal'
      });

      await dbService.createGoal({
        name: 'Goal 2',
        target_amount: 200000,
        description: 'Second goal'
      });

      const goals = await dbService.getGoals();
      expect(goals).toHaveLength(2);
    });
  });

  describe('Database Transaction Management', () => {
    let categoryId: number;

    beforeEach(async () => {
      const categories = await dbService.getCategories();
      categoryId = categories[0].id;
    });

    it('should rollback transaction on error', async () => {
      await expect(
        dbService.executeTransaction(async () => {
          await dbService.createTransaction({
            amount: 1000,
            description: 'Valid transaction',
            category_id: categoryId,
            transaction_type: 'expense'
          });

          // This should cause an error and rollback the entire transaction
          await dbService.createTransaction({
            amount: -1000, // Invalid negative amount
            description: 'Invalid transaction',
            category_id: categoryId,
            transaction_type: 'expense'
          });
        })
      ).rejects.toThrow();

      // Verify that no transactions were created due to rollback
      const transactions = await dbService.getTransactions();
      expect(transactions).toHaveLength(0);
    });

    it('should commit successful transaction', async () => {
      await dbService.executeTransaction(async () => {
        await dbService.createTransaction({
          amount: 1000,
          description: 'Transaction 1',
          category_id: categoryId,
          transaction_type: 'expense'
        });

        await dbService.createTransaction({
          amount: 2000,
          description: 'Transaction 2',
          category_id: categoryId,
          transaction_type: 'expense'
        });
      });

      const transactions = await dbService.getTransactions();
      expect(transactions).toHaveLength(2);
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple initializations gracefully', async () => {
      await dbService.initialize();
      await dbService.initialize(); // Should not throw
      
      const categories = await dbService.getCategories();
      expect(categories).toHaveLength(9); // Should still have default categories
    });

    it('should throw error when operating on closed database', async () => {
      await dbService.close();
      
      await expect(dbService.getCategories()).rejects.toThrow('Database not connected');
    });
  });

  describe('Data Validation', () => {
    it('should validate category name length', async () => {
      const longNameCategory: CreateCategoryRequest = {
        name: 'A'.repeat(51), // Exceeds 50 character limit
        color: '#FF5722',
        icon: 'test-icon'
      };

      await expect(dbService.createCategory(longNameCategory)).rejects.toThrow();
    });

    it('should validate transaction description length', async () => {
      const categories = await dbService.getCategories();
      const categoryId = categories[0].id;

      const longDescTransaction: CreateTransactionRequest = {
        amount: 1000,
        description: 'A'.repeat(201), // Exceeds 200 character limit
        category_id: categoryId,
        transaction_type: 'expense'
      };

      await expect(dbService.createTransaction(longDescTransaction)).rejects.toThrow();
    });

    it('should validate goal name length', async () => {
      const longNameGoal: CreateGoalRequest = {
        name: 'A'.repeat(101), // Exceeds 100 character limit
        target_amount: 100000,
        description: 'Test goal'
      };

      await expect(dbService.createGoal(longNameGoal)).rejects.toThrow();
    });
  });
});