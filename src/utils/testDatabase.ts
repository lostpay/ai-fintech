import { DatabaseService } from '../services/DatabaseService';
import { DataMigrationService } from './dataMigration';

// Import reference data
import referenceData from '../../reference/financeflow_export_20250812.json';

export class DatabaseTester {
  // Verify database initialization and test basic CRUD operations
  static async testDatabaseConnection(): Promise<void> {
    try {
      console.log('Testing database connection...');

      const dbService = DatabaseService.getInstance();

      await dbService.initialize();
      console.log('Database initialized successfully');

      const migrationService = DataMigrationService.getInstance();
      const needsMigration = await migrationService.isMigrationNeeded();

      console.log(`Migration needed: ${needsMigration}`);

      if (needsMigration) {
        console.log('Importing reference data...');
        await dbService.importReferenceData(referenceData);
        console.log('Reference data imported successfully');
      }

      const stats = await dbService.getMigrationStats();
      console.log('Current database stats:', stats);

      const categories = await dbService.getCategories();
      console.log(`Found ${categories.length} categories`);

      if (categories.length > 0) {
        console.log('Sample category:', categories[0]);
      }

      try {
        const transactions = await dbService.getTransactions();
        console.log(`Found ${transactions.length} transactions`);

        if (transactions.length > 0) {
          console.log('Sample transaction:', transactions[0]);
        }
      } catch (error) {
        console.log('No transactions found or error reading transactions:', error);
      }

      console.log('Database test completed successfully');

    } catch (error) {
      console.error('Database test failed:', error);
      throw error;
    }
  }

  // Compare database counts against expected reference data
  static async verifyDataIntegrity(): Promise<void> {
    try {
      console.log('Verifying data integrity...');

      const dbService = DatabaseService.getInstance();
      const migrationService = DataMigrationService.getInstance();

      const stats = await migrationService.getReferenceDataStats();
      console.log('Database stats:', stats);

      const expected = referenceData.metadata.recordCounts;

      console.log('Expected vs Actual:');
      console.log(`  Transactions: ${expected.transactions} -> ${stats.transactions}`);
      console.log(`  Categories: ${expected.categories} -> ${stats.categories}`);
      console.log(`  Budgets: ${expected.budgets} -> ${stats.budgets}`);

      const transactionMatch = stats.transactions === expected.transactions;
      const categoryMatch = stats.categories === expected.categories;
      const budgetMatch = stats.budgets === expected.budgets;

      if (transactionMatch && categoryMatch && budgetMatch) {
        console.log('Data integrity verified - all counts match');
      } else {
        console.log('Data integrity issues detected');
        if (!transactionMatch) console.log('  - Transaction count mismatch');
        if (!categoryMatch) console.log('  - Category count mismatch');
        if (!budgetMatch) console.log('  - Budget count mismatch');
      }

    } catch (error) {
      console.error('Data integrity verification failed:', error);
      throw error;
    }
  }
}