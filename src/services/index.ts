// Services barrel export
import { DatabaseService } from './DatabaseService';
import { DataExportService, dataExportService } from './DataExportService';
import { FileSystemService } from './FileSystemService';
import { ShareService } from './ShareService';
import { ExportProgressService } from './ExportProgressService';
import { BudgetCalculationService } from './BudgetCalculationService';
import { BudgetAlertService } from './BudgetAlertService';
import { BudgetAnalyticsService } from './BudgetAnalyticsService';

// Get the singleton instance of DatabaseService
export const databaseService = DatabaseService.getInstance();

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
