// Services barrel export
import { DatabaseService } from './DatabaseService';
import { SupabaseService } from './SupabaseService';
import { DataExportService } from './DataExportService';
import { FileSystemService } from './FileSystemService';
import { ShareService } from './ShareService';
import { ExportProgressService } from './ExportProgressService';
import { BudgetCalculationService } from './BudgetCalculationService';
import { BudgetAlertService } from './BudgetAlertService';
import { BudgetRolloverService } from './BudgetRolloverService';

// Singleton instance removed - use DataExportService with useDatabaseService() hook in components
// export { dataExportService };

// Export the service classes (for direct instantiation in hooks and components)
export {
  DatabaseService,
  SupabaseService,
  DataExportService,
  FileSystemService,
  ShareService,
  ExportProgressService,
  BudgetCalculationService,
  BudgetAlertService,
  BudgetRolloverService
};

// Export types
export type { ExportOptions, ExportResult, ExportMetadata } from './DataExportService';
export type { SaveFileResult, StorageInfo } from './FileSystemService';
export type { ShareResult, ShareOptions } from './ShareService';
export type { ExportProgress, ExportProgressCallback } from './ExportProgressService';
