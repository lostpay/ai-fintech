// Services barrel export
import { DatabaseService } from './DatabaseService';
import { SupabaseService } from './SupabaseService';
import { DataExportService, dataExportService } from './DataExportService';
import { FileSystemService } from './FileSystemService';
import { ShareService } from './ShareService';
import { ExportProgressService } from './ExportProgressService';
import { BudgetCalculationService } from './BudgetCalculationService';
import { BudgetAlertService } from './BudgetAlertService';
import { BudgetAnalyticsService } from './BudgetAnalyticsService';

// *** TEMPORARY MIGRATION COMMENT ***
// The app is currently migrating from SQLite (DatabaseService) to Supabase (SupabaseService)
// 
// TO SWITCH TO CLOUD DATABASE:
// 1. Uncomment the line below to use SupabaseService (cloud database)
// 2. Comment out the DatabaseService.getInstance() line
// 3. Make sure your .env file has SUPABASE_URL and SUPABASE_ANON_KEY
//
// export const databaseService = new SupabaseService();  // <-- Use this for cloud database
export const databaseService = DatabaseService.getInstance();  // <-- Currently using local SQLite

// Also create a Supabase service instance for testing
export const supabaseService = new SupabaseService();

// Export the singleton instance of DataExportService (created in DataExportService.ts)
export { dataExportService };

// Create a singleton instance of BudgetCalculationService
export const budgetCalculationService = new BudgetCalculationService(databaseService);

// Create a singleton instance of BudgetAlertService
export const budgetAlertService = new BudgetAlertService(databaseService, budgetCalculationService);

// Create a singleton instance of BudgetAnalyticsService
export const budgetAnalyticsService = new BudgetAnalyticsService(databaseService, budgetCalculationService);

// Export the service classes as well for testing
export { 
  DatabaseService,
  SupabaseService, 
  DataExportService,
  FileSystemService,
  ShareService,
  ExportProgressService,
  BudgetCalculationService, 
  BudgetAlertService,
  BudgetAnalyticsService 
};

// Export types
export type { ExportOptions, ExportResult, ExportMetadata } from './DataExportService';
export type { SaveFileResult, StorageInfo } from './FileSystemService';
export type { ShareResult, ShareOptions } from './ShareService';
export type { ExportProgress, ExportProgressCallback } from './ExportProgressService';
