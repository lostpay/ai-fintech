import { DataExportService, ExportOptions } from '../../src/services/DataExportService';
import { FileSystemService } from '../../src/services/FileSystemService';
import { ShareService } from '../../src/services/ShareService';
import { ExportProgressService } from '../../src/services/ExportProgressService';
import { DatabaseService } from '../../src/services/DatabaseService';

// Mock the services
jest.mock('../../src/services/FileSystemService');
jest.mock('../../src/services/ShareService');
jest.mock('../../src/services/ExportProgressService');
jest.mock('../../src/services/DatabaseService');

describe('DataExportService', () => {
  let dataExportService: DataExportService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockFileSystemService: jest.Mocked<FileSystemService>;
  let mockShareService: jest.Mocked<ShareService>;
  let mockProgressService: jest.Mocked<ExportProgressService>;

  const mockTransactions = [
    {
      id: 1,
      amount: 500,
      description: 'Coffee Shop',
      category_id: 1,
      transaction_type: 'expense' as const,
      date: new Date('2024-01-15'),
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
      category_name: 'Dining',
      category_color: '#FF5722',
      category_icon: 'restaurant'
    },
    {
      id: 2,
      amount: 3000,
      description: 'Gas Station',
      category_id: 2,
      transaction_type: 'expense' as const,
      date: new Date('2024-01-14'),
      created_at: new Date('2024-01-14'),
      updated_at: new Date('2024-01-14'),
      category_name: 'Transportation',
      category_color: '#2196F3',
      category_icon: 'car'
    }
  ];

  const mockCategories = [
    {
      id: 1,
      name: 'Dining',
      color: '#FF5722',
      icon: 'restaurant',
      is_default: true,
      is_hidden: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: 2,
      name: 'Transportation',
      color: '#2196F3',
      icon: 'car',
      is_default: true,
      is_hidden: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    }
  ];

  beforeEach(() => {
    // Create mock instances
    mockDatabaseService = {
      getTransactionsWithCategories: jest.fn(),
      getCategories: jest.fn(),
      getBudgetsWithDetails: jest.fn(),
      getGoals: jest.fn(),
    } as any;

    mockFileSystemService = {
      saveToDownloads: jest.fn(),
      getFileSize: jest.fn(),
      deleteFile: jest.fn(),
      shareFile: jest.fn(),
    } as any;

    mockShareService = {
      shareWithFallback: jest.fn(),
    } as any;

    mockProgressService = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      createStageTracker: jest.fn(),
    } as any;

    // Create service instance
    dataExportService = new DataExportService(
      mockDatabaseService,
      mockFileSystemService,
      mockShareService,
      mockProgressService
    );

    // Setup default mock implementations
    mockDatabaseService.getTransactionsWithCategories.mockResolvedValue(mockTransactions);
    mockDatabaseService.getCategories.mockResolvedValue(mockCategories);
    mockDatabaseService.getBudgetsWithDetails.mockResolvedValue([]);
    mockDatabaseService.getGoals.mockResolvedValue([]);
    mockFileSystemService.saveToDownloads.mockResolvedValue('/path/to/file.csv');
    mockFileSystemService.getFileSize.mockResolvedValue(1024);
    mockProgressService.createStageTracker.mockReturnValue({
      updateStage: jest.fn(),
      complete: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export transactions to CSV with proper formatting', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      const result = await dataExportService.exportData(options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('CSV');
      expect(result.recordCount).toBe(2);
      expect(mockFileSystemService.saveToDownloads).toHaveBeenCalled();
      
      // Verify CSV content was properly formatted
      const saveCall = mockFileSystemService.saveToDownloads.mock.calls[0];
      const csvContent = saveCall[1];
      expect(csvContent).toContain('# TRANSACTIONS');
      expect(csvContent).toContain('DATE,DESCRIPTION,AMOUNT,CATEGORY,TYPE,CREATED DATE');
      expect(csvContent).toContain('2024-01-15,Coffee Shop,5.00,Dining,expense');
    });

    it('should export data to JSON with complete metadata', async () => {
      const options: ExportOptions = {
        format: 'json',
        includeTransactions: true,
        includeCategories: true,
        includeBudgets: false,
        includeGoals: false,
      };

      const result = await dataExportService.exportData(options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('JSON');
      
      const saveCall = mockFileSystemService.saveToDownloads.mock.calls[0];
      const jsonContent = JSON.parse(saveCall[1]);
      
      expect(jsonContent.metadata).toBeDefined();
      expect(jsonContent.metadata.appName).toBe('FinanceFlow');
      expect(jsonContent.metadata.recordCounts.transactions).toBe(2);
      expect(jsonContent.metadata.recordCounts.categories).toBe(2);
      expect(jsonContent.data.transactions).toBeDefined();
      expect(jsonContent.data.categories).toBeDefined();
    });

    it('should handle export with date range filtering', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      await dataExportService.exportData(options);

      expect(mockDatabaseService.getTransactionsWithCategories).toHaveBeenCalled();
      // Verify date filtering was applied in the CSV content
      const saveCall = mockFileSystemService.saveToDownloads.mock.calls[0];
      const csvContent = saveCall[1];
      expect(csvContent).toContain('2024-01-15');
      expect(csvContent).toContain('2024-01-14');
    });

    it('should handle export with data anonymization', async () => {
      const mockTransactionsWithSensitiveData = [{
        ...mockTransactions[0],
        description: 'Payment to john.doe@example.com with card 1234-5678-9012-3456'
      }];

      mockDatabaseService.getTransactionsWithCategories.mockResolvedValue(mockTransactionsWithSensitiveData);

      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
        anonymize: true,
      };

      await dataExportService.exportData(options);

      const saveCall = mockFileSystemService.saveToDownloads.mock.calls[0];
      const csvContent = saveCall[1];
      
      expect(csvContent).toContain('[email]');
      expect(csvContent).toContain('****-****-****-****');
      expect(csvContent).not.toContain('john.doe@example.com');
      expect(csvContent).not.toContain('1234-5678-9012-3456');
    });

    it('should track progress during export', async () => {
      const mockStageTracker = {
        updateStage: jest.fn(),
        complete: jest.fn(),
      };
      mockProgressService.createStageTracker.mockReturnValue(mockStageTracker);

      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      await dataExportService.exportData(options);

      expect(mockProgressService.subscribe).toHaveBeenCalled();
      expect(mockStageTracker.updateStage).toHaveBeenCalledWith('initializing', 50, 'Validating export options...');
      expect(mockStageTracker.complete).toHaveBeenCalledWith('Export completed successfully');
      expect(mockProgressService.unsubscribe).toHaveBeenCalled();
    });

    it('should validate export options and throw error for invalid options', async () => {
      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: false,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false, // No data types selected
      };

      const result = await dataExportService.exportData(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one data type must be selected');
    });

    it('should handle file system errors gracefully', async () => {
      mockFileSystemService.saveToDownloads.mockRejectedValue(new Error('Storage full'));

      const options: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      const result = await dataExportService.exportData(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage full');
    });
  });

  describe('shareExportFile', () => {
    it('should share file successfully', async () => {
      mockShareService.shareWithFallback.mockResolvedValue({ success: true });

      await expect(dataExportService.shareExportFile('/path/to/file.csv')).resolves.toBeUndefined();
      expect(mockShareService.shareWithFallback).toHaveBeenCalledWith('/path/to/file.csv', {
        dialogTitle: 'Share Financial Data Export',
      });
    });

    it('should throw error when share fails', async () => {
      mockShareService.shareWithFallback.mockResolvedValue({ 
        success: false, 
        error: 'Share not available' 
      });

      await expect(dataExportService.shareExportFile('/path/to/file.csv')).rejects.toThrow('Share not available');
    });
  });

  describe('getExportSummary', () => {
    it('should return export summary with correct calculations', async () => {
      const summary = await dataExportService.getExportSummary();

      expect(summary).toEqual({
        totalTransactions: 2,
        totalAmount: 3500, // 500 + 3000 cents
        dateRange: {
          start: null,
          end: null,
        },
        transactionsByType: {
          expense: 2,
          income: 0,
        },
      });
    });

    it('should return summary with date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const summary = await dataExportService.getExportSummary(startDate, endDate);

      expect(summary.dateRange.start).toBe(startDate.toISOString());
      expect(summary.dateRange.end).toBe(endDate.toISOString());
    });
  });

  describe('Legacy methods', () => {
    it('should export transactions to CSV using legacy method', async () => {
      const filePath = await dataExportService.exportTransactionsToCSV();

      expect(filePath).toBe('/path/to/file.csv');
      expect(mockFileSystemService.saveToDownloads).toHaveBeenCalled();
    });

    it('should export transactions to JSON using legacy method', async () => {
      const filePath = await dataExportService.exportTransactionsToJSON();

      expect(filePath).toBe('/path/to/file.csv');
      expect(mockFileSystemService.saveToDownloads).toHaveBeenCalled();
    });
  });
});