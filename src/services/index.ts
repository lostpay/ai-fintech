// Services barrel export
import { DatabaseService } from './DatabaseService';
import { DataExportService } from './DataExportService';

// Create a singleton instance of DatabaseService
export const databaseService = new DatabaseService();

// Create a singleton instance of DataExportService
export const dataExportService = new DataExportService(databaseService);

// Export the service classes as well for testing
export { DatabaseService, DataExportService };
