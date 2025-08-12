import { DatabaseService } from './DatabaseService';
import { FileSystemService } from './FileSystemService';
import { ShareService } from './ShareService';
import { ExportProgressService } from './ExportProgressService';
import { TransactionWithCategory } from '../types/Transaction';
import { Category } from '../types/Category';
import { Budget } from '../types/Budget';
import { Goal } from '../types/Goal';
import { generateTimestamp } from '../utils/file';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeTransactions: boolean;
  includeCategories: boolean;
  includeBudgets: boolean;
  includeGoals: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  categories?: number[];
  anonymize?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  recordCount: number;
  exportDate: Date;
  format: string;
  error?: string;
}

export interface ExportMetadata {
  exportDate: string;
  appVersion: string;
  dataVersion: string;
  recordCounts: {
    transactions: number;
    categories: number;
    budgets: number;
    goals: number;
  };
  exportOptions: ExportOptions;
}

const databaseService = DatabaseService.getInstance();
const fileSystemService = new FileSystemService();
const shareService = new ShareService();
const progressService = new ExportProgressService();

export class DataExportService {
  constructor(
    private databaseService: DatabaseService,
    private fileSystemService: FileSystemService,
    private shareService: ShareService,
    private progressService: ExportProgressService
  ) {}

  /**
   * Export data with comprehensive options and progress tracking
   */
  async exportData(
    options: ExportOptions,
    onProgress?: (progress: number) => void,
    exportId: string = 'default'
  ): Promise<ExportResult> {
    try {
      // Register progress callback if provided
      if (onProgress) {
        this.progressService.subscribe(exportId, (progress) => {
          onProgress(progress.percentage);
        });
      }

      // Create staged progress tracker
      const stageTracker = this.progressService.createStageTracker(exportId, [
        { stage: 'initializing', weight: 10 },
        { stage: 'collecting', weight: 40 },
        { stage: 'formatting', weight: 30 },
        { stage: 'saving', weight: 20 },
      ]);

      // Validate export options
      stageTracker.updateStage('initializing', 50, 'Validating export options...');
      this.validateExportOptions(options);

      // Collect data based on options
      stageTracker.updateStage('collecting', 0, 'Collecting export data...');
      const exportData = await this.collectExportData(options, (progress) => {
        stageTracker.updateStage('collecting', progress, 'Collecting export data...');
      });

      // Format data based on selected format
      stageTracker.updateStage('formatting', 0, 'Formatting export data...');
      const formattedData = options.format === 'csv' 
        ? await this.formatAsCSV(exportData)
        : await this.formatAsJSON(exportData, options);

      // Generate filename and save file
      stageTracker.updateStage('saving', 0, 'Saving export file...');
      const fileName = this.generateFileName(options.format);
      const filePath = await this.fileSystemService.saveToDownloads(fileName, formattedData);

      // Calculate file size
      const fileSize = await this.fileSystemService.getFileSize(filePath);

      stageTracker.complete('Export completed successfully');

      const result: ExportResult = {
        success: true,
        filePath,
        fileName,
        fileSize,
        recordCount: this.calculateRecordCount(exportData),
        exportDate: new Date(),
        format: options.format.toUpperCase(),
      };

      // Cleanup progress tracking
      this.progressService.unsubscribe(exportId);

      return result;
    } catch (error) {
      // Cleanup progress tracking on error
      this.progressService.unsubscribe(exportId);
      
      return {
        success: false,
        recordCount: 0,
        exportDate: new Date(),
        format: options.format.toUpperCase(),
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Legacy method - Export transactions to CSV format
   */
  async exportTransactionsToCSV(startDate?: Date, endDate?: Date): Promise<string> {
    const options: ExportOptions = {
      format: 'csv',
      includeTransactions: true,
      includeCategories: false,
      includeBudgets: false,
      includeGoals: false,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    };

    const result = await this.exportData(options);
    if (!result.success) {
      throw new Error(result.error || 'CSV export failed');
    }
    
    return result.filePath!;
  }

  /**
   * Legacy method - Export transactions and categories to JSON format
   */
  async exportTransactionsToJSON(startDate?: Date, endDate?: Date): Promise<string> {
    const options: ExportOptions = {
      format: 'json',
      includeTransactions: true,
      includeCategories: true,
      includeBudgets: false,
      includeGoals: false,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    };

    const result = await this.exportData(options);
    if (!result.success) {
      throw new Error(result.error || 'JSON export failed');
    }
    
    return result.filePath!;
  }

  /**
   * Share exported file using the enhanced share service
   */
  async shareExportFile(fileUri: string): Promise<void> {
    const result = await this.shareService.shareWithFallback(fileUri, {
      dialogTitle: 'Share Financial Data Export',
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Share failed');
    }
  }

  /**
   * Get file info for exported files
   */
  async getExportFileInfo(fileUri: string): Promise<{ size: number; exists: boolean }> {
    try {
      const size = await this.fileSystemService.getFileSize(fileUri);
      return {
        size,
        exists: size > 0,
      };
    } catch (error) {
      return { size: 0, exists: false };
    }
  }

  /**
   * Delete exported file
   */
  async deleteExportFile(fileUri: string): Promise<void> {
    try {
      await this.fileSystemService.deleteFile(fileUri);
    } catch (error) {
      console.warn('Failed to delete export file:', error);
    }
  }

  /**
   * Filter transactions by date range
   */
  private filterTransactionsByDate(
    transactions: TransactionWithCategory[], 
    startDate?: Date, 
    endDate?: Date
  ): TransactionWithCategory[] {
    return transactions.filter(transaction => {
      if (startDate && transaction.date < startDate) return false;
      if (endDate && transaction.date > endDate) return false;
      return true;
    });
  }

  /**
   * Get export summary without creating files
   */
  async getExportSummary(startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number;
    totalAmount: number;
    dateRange: { start: string | null; end: string | null };
    transactionsByType: { expense: number; income: number };
  }> {
    try {
      const transactions = await this.databaseService.getTransactionsWithCategories();
      const filteredTransactions = this.filterTransactionsByDate(transactions, startDate, endDate);

      return {
        totalTransactions: filteredTransactions.length,
        totalAmount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
        dateRange: {
          start: startDate?.toISOString() || null,
          end: endDate?.toISOString() || null,
        },
        transactionsByType: {
          expense: filteredTransactions.filter(t => t.transaction_type === 'expense').length,
          income: filteredTransactions.filter(t => t.transaction_type === 'income').length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get export summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect export data based on options
   */
  private async collectExportData(
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const data: any = {};
    let totalTasks = 0;
    let completedTasks = 0;

    // Count total tasks
    if (options.includeTransactions) totalTasks++;
    if (options.includeCategories) totalTasks++;
    if (options.includeBudgets) totalTasks++;
    if (options.includeGoals) totalTasks++;

    const updateProgress = () => {
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
      onProgress?.(progress);
    };

    if (options.includeTransactions) {
      data.transactions = await this.getTransactionsForExport(options);
      completedTasks++;
      updateProgress();
    }

    if (options.includeCategories) {
      data.categories = await this.getCategoriesForExport();
      completedTasks++;
      updateProgress();
    }

    if (options.includeBudgets) {
      data.budgets = await this.getBudgetsForExport(options);
      completedTasks++;
      updateProgress();
    }

    if (options.includeGoals) {
      data.goals = await this.getGoalsForExport();
      completedTasks++;
      updateProgress();
    }

    return data;
  }

  /**
   * Get transactions for export with filtering and anonymization
   */
  private async getTransactionsForExport(options: ExportOptions) {
    let transactions = await this.databaseService.getTransactionsWithCategories();

    // Apply date range filter
    if (options.dateRange) {
      transactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= options.dateRange!.startDate && 
               transactionDate <= options.dateRange!.endDate;
      });
    }

    // Apply category filter
    if (options.categories && options.categories.length > 0) {
      transactions = transactions.filter(t => 
        options.categories!.includes(t.category_id)
      );
    }

    return transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.date.toISOString().split('T')[0],
      description: options.anonymize 
        ? this.anonymizeDescription(transaction.description) 
        : transaction.description,
      amount: (transaction.amount / 100).toFixed(2), // Convert cents to dollars
      category: transaction.category_name,
      type: transaction.transaction_type,
      created_date: transaction.created_at.toISOString(),
    }));
  }

  /**
   * Get categories for export
   */
  private async getCategoriesForExport() {
    const categories = await this.databaseService.getCategories();

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      is_system_category: Boolean(category.is_default),
      created_date: category.created_at.toISOString(),
    }));
  }

  /**
   * Get budgets for export
   */
  private async getBudgetsForExport(options: ExportOptions) {
    let budgets = await this.databaseService.getBudgetsWithDetails();

    // Apply date range filter for budget periods
    if (options.dateRange) {
      budgets = budgets.filter(budget => {
        const periodStart = new Date(budget.period_start);
        const periodEnd = new Date(budget.period_end);
        const rangeStart = options.dateRange!.startDate;
        const rangeEnd = options.dateRange!.endDate;
        
        // Include budgets that overlap with the date range
        return (periodStart <= rangeEnd && periodEnd >= rangeStart);
      });
    }

    return budgets.map(budget => ({
      id: budget.id,
      category: budget.category_name,
      budget_amount: (budget.amount / 100).toFixed(2),
      spent_amount: (budget.spent_amount / 100).toFixed(2),
      remaining_amount: ((budget.amount - budget.spent_amount) / 100).toFixed(2),
      percentage_used: budget.percentage,
      period_start: budget.period_start.toISOString().split('T')[0],
      period_end: budget.period_end.toISOString().split('T')[0],
      created_date: budget.created_at.toISOString(),
    }));
  }

  /**
   * Get goals for export
   */
  private async getGoalsForExport() {
    const goals = await this.databaseService.getGoals();

    return goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      target_amount: (goal.target_amount / 100).toFixed(2),
      current_amount: (goal.current_amount / 100).toFixed(2),
      progress_percentage: ((goal.current_amount / goal.target_amount) * 100).toFixed(1),
      target_date: goal.target_date?.toISOString().split('T')[0] || null,
      description: goal.description,
      is_completed: Boolean(goal.is_completed),
      created_date: goal.created_at.toISOString(),
    }));
  }

  /**
   * Format data as CSV
   */
  private async formatAsCSV(data: any): Promise<string> {
    const csvParts: string[] = [];

    // Export transactions as main CSV content
    if (data.transactions && data.transactions.length > 0) {
      csvParts.push('# TRANSACTIONS');
      csvParts.push(this.arrayToCSV(data.transactions, [
        'date', 'description', 'amount', 'category', 'type', 'created_date'
      ]));
      csvParts.push('');
    }

    // Export categories
    if (data.categories && data.categories.length > 0) {
      csvParts.push('# CATEGORIES');
      csvParts.push(this.arrayToCSV(data.categories, [
        'name', 'color', 'icon', 'is_system_category', 'created_date'
      ]));
      csvParts.push('');
    }

    // Export budgets
    if (data.budgets && data.budgets.length > 0) {
      csvParts.push('# BUDGETS');
      csvParts.push(this.arrayToCSV(data.budgets, [
        'category', 'budget_amount', 'spent_amount', 'remaining_amount', 
        'percentage_used', 'period_start', 'period_end', 'created_date'
      ]));
      csvParts.push('');
    }

    // Export goals
    if (data.goals && data.goals.length > 0) {
      csvParts.push('# GOALS');
      csvParts.push(this.arrayToCSV(data.goals, [
        'name', 'target_amount', 'current_amount', 'progress_percentage', 
        'target_date', 'description', 'is_completed', 'created_date'
      ]));
    }

    return csvParts.join('\n');
  }

  /**
   * Convert array to CSV format
   */
  private arrayToCSV(array: any[], columns: string[]): string {
    const header = columns.map(col => this.escapeCSVField(
      col.replace(/_/g, ' ').toUpperCase()
    )).join(',');
    
    const rows = array.map(row => 
      columns.map(col => this.escapeCSVField(String(row[col] || ''))).join(',')
    );
    
    return [header, ...rows].join('\n');
  }

  /**
   * Escape CSV field content
   */
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Format data as JSON
   */
  private async formatAsJSON(data: any, options: ExportOptions): Promise<string> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        appName: 'FinanceFlow',
        appVersion: '1.0.0',
        dataVersion: '1.0',
        exportFormat: 'json',
        exportOptions: options,
        recordCounts: {
          transactions: data.transactions?.length || 0,
          categories: data.categories?.length || 0,
          budgets: data.budgets?.length || 0,
          goals: data.goals?.length || 0,
        },
      },
      data: {
        ...(data.transactions && { transactions: data.transactions }),
        ...(data.categories && { categories: data.categories }),
        ...(data.budgets && { budgets: data.budgets }),
        ...(data.goals && { goals: data.goals }),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate filename with timestamp
   */
  private generateFileName(format: string): string {
    const timestamp = generateTimestamp();
    return `financeflow_export_${timestamp}.${format}`;
  }

  /**
   * Calculate total record count
   */
  private calculateRecordCount(data: any): number {
    return Object.values(data).reduce((total: number, records: any) => {
      return total + (Array.isArray(records) ? records.length : 0);
    }, 0);
  }

  /**
   * Validate export options
   */
  private validateExportOptions(options: ExportOptions): void {
    if (!options.includeTransactions && !options.includeCategories && 
        !options.includeBudgets && !options.includeGoals) {
      throw new Error('At least one data type must be selected for export');
    }

    if (options.dateRange && 
        options.dateRange.startDate > options.dateRange.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (!['csv', 'json'].includes(options.format)) {
      throw new Error('Export format must be CSV or JSON');
    }
  }

  /**
   * Anonymize sensitive description data
   */
  private anonymizeDescription(description: string): string {
    const anonymizedDescription = description
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '****-****-****-****') // Credit card numbers
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****') // SSN patterns
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]'); // Email addresses
    
    return anonymizedDescription;
  }
}

// Export singleton instance
export const dataExportService = new DataExportService(
  databaseService,
  fileSystemService,
  shareService,
  progressService
);