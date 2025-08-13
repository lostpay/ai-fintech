import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from '../constants/database';

interface ReferenceTransaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  category: string;
  type: string;
  created_date: string;
}

interface ReferenceCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  is_system_category: boolean;
  created_date: string;
}

interface ReferenceBudget {
  id: number;
  category: string;
  budget_amount: string;
  spent_amount: string;
  remaining_amount: string;
  percentage_used: number;
  period_start: string;
  period_end: string;
  created_date: string;
}

export class DataMigrationService {
  private static instance: DataMigrationService;
  
  private constructor() {}
  
  public static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  /**
   * Import reference data from the exported JSON file
   */
  async importReferenceData(referenceData: any): Promise<void> {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      
      console.log('Starting reference data migration...');
      
      // Enable foreign key constraints
      await db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Clear existing data
      await this.clearExistingData(db);
      
      // Import categories first
      await this.importCategories(db, referenceData.data.categories);
      
      // Import transactions
      await this.importTransactions(db, referenceData.data.transactions);
      
      // Import budgets
      await this.importBudgets(db, referenceData.data.budgets);
      
      console.log('Reference data migration completed successfully');
      
    } catch (error) {
      console.error('Error during data migration:', error);
      throw error;
    }
  }

  private async clearExistingData(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log('Clearing existing data...');
    
    // Clear in reverse dependency order
    await db.execAsync('DELETE FROM budgets;');
    await db.execAsync('DELETE FROM transactions;');
    await db.execAsync('DELETE FROM categories;');
    
    // Reset auto-increment counters
    await db.execAsync('DELETE FROM sqlite_sequence WHERE name IN ("categories", "transactions", "budgets");');
  }

  private async importCategories(db: SQLite.SQLiteDatabase, categories: ReferenceCategory[]): Promise<void> {
    console.log(`Importing ${categories.length} categories...`);
    
    const insertQuery = `
      INSERT INTO categories (id, name, color, icon, is_system_category, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    for (const category of categories) {
      await db.runAsync(insertQuery, [
        category.id,
        category.name,
        category.color,
        category.icon,
        category.is_system_category ? 1 : 0,
        category.created_date
      ]);
    }
    
    console.log(`Successfully imported ${categories.length} categories`);
  }

  private async importTransactions(db: SQLite.SQLiteDatabase, transactions: ReferenceTransaction[]): Promise<void> {
    console.log(`Importing ${transactions.length} transactions...`);
    
    const insertQuery = `
      INSERT INTO transactions (id, amount, description, category, type, date, created_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    for (const transaction of transactions) {
      await db.runAsync(insertQuery, [
        transaction.id,
        parseFloat(transaction.amount),
        transaction.description,
        transaction.category,
        transaction.type,
        transaction.date,
        transaction.created_date
      ]);
    }
    
    console.log(`Successfully imported ${transactions.length} transactions`);
  }

  private async importBudgets(db: SQLite.SQLiteDatabase, budgets: ReferenceBudget[]): Promise<void> {
    console.log(`Importing ${budgets.length} budgets...`);
    
    const insertQuery = `
      INSERT INTO budgets (
        id, category, budget_amount, spent_amount, remaining_amount, 
        percentage_used, period_start, period_end, created_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    for (const budget of budgets) {
      await db.runAsync(insertQuery, [
        budget.id,
        budget.category,
        parseFloat(budget.budget_amount),
        parseFloat(budget.spent_amount),
        parseFloat(budget.remaining_amount),
        budget.percentage_used,
        budget.period_start,
        budget.period_end,
        budget.created_date
      ]);
    }
    
    console.log(`Successfully imported ${budgets.length} budgets`);
  }

  /**
   * Check if migration is needed (database is empty or has old schema)
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      
      // Check if we have any data
      const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM transactions');
      const count = (result as any)?.count || 0;
      
      return count === 0;
    } catch (error) {
      console.log('Migration needed due to error checking data:', error);
      return true;
    }
  }

  /**
   * Get reference data stats
   */
  async getReferenceDataStats(): Promise<{
    transactions: number;
    categories: number;
    budgets: number;
  }> {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      
      const transactionCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM transactions');
      const categoryCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
      const budgetCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM budgets');
      
      return {
        transactions: (transactionCount as any)?.count || 0,
        categories: (categoryCount as any)?.count || 0,
        budgets: (budgetCount as any)?.count || 0,
      };
    } catch (error) {
      console.error('Error getting reference data stats:', error);
      return { transactions: 0, categories: 0, budgets: 0 };
    }
  }
}