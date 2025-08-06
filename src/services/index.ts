// Services barrel export
import { DatabaseService } from './DatabaseService';
import { DataExportService } from './DataExportService';
import { BudgetCalculationService } from './BudgetCalculationService';
import { BudgetAlertService } from './BudgetAlertService';

// Create a singleton instance of DatabaseService
export const databaseService = new DatabaseService();

// Create a singleton instance of DataExportService
export const dataExportService = new DataExportService(databaseService);

// Create a singleton instance of BudgetCalculationService
export const budgetCalculationService = new BudgetCalculationService(databaseService);

// Create a singleton instance of BudgetAlertService
export const budgetAlertService = new BudgetAlertService(databaseService, budgetCalculationService);

// Export the service classes as well for testing
export { DatabaseService, DataExportService, BudgetCalculationService, BudgetAlertService };
