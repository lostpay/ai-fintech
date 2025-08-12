import { renderHook, act } from '@testing-library/react-native';
import { useDataExport } from '../../src/hooks/useDataExport';
import { dataExportService } from '../../src/services';
import { shareService } from '../../src/services/ShareService';
import { ExportOptions } from '../../src/services/DataExportService';

// Mock the services
jest.mock('../../src/services', () => ({
  dataExportService: {
    exportData: jest.fn(),
    getExportSummary: jest.fn(),
  },
}));

jest.mock('../../src/services/ShareService', () => ({
  shareService: {
    shareWithFallback: jest.fn(),
  },
}));

const mockDataExportService = dataExportService as jest.Mocked<typeof dataExportService>;
const mockShareService = shareService as jest.Mocked<typeof shareService>;

describe('useDataExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDataExport());

      expect(result.current.isExporting).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.result).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('exportData', () => {
    it('should handle successful export', async () => {
      const mockResult = {
        success: true,
        filePath: '/path/to/export.csv',
        fileName: 'export.csv',
        fileSize: 1024,
        recordCount: 100,
        exportDate: new Date(),
        format: 'CSV',
      };

      mockDataExportService.exportData.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDataExport());

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportData(exportOptions);
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBe(null);
      expect(exportResult).toEqual(mockResult);
    });

    it('should update progress during export', async () => {
      let progressCallback: ((progress: number) => void) | undefined;
      
      mockDataExportService.exportData.mockImplementation((options, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              filePath: '/path/to/export.csv',
              fileName: 'export.csv',
              recordCount: 100,
              exportDate: new Date(),
              format: 'CSV',
            });
          }, 100);
        });
      });

      const { result } = renderHook(() => useDataExport());

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      await act(async () => {
        const exportPromise = result.current.exportData(exportOptions);
        
        // Simulate progress updates
        if (progressCallback) {
          await act(async () => {
            progressCallback!(25);
          });
          expect(result.current.progress).toBe(25);

          await act(async () => {
            progressCallback!(75);
          });
          expect(result.current.progress).toBe(75);
        }

        await exportPromise;
      });

      expect(result.current.isExporting).toBe(false);
    });

    it('should handle export failure', async () => {
      const mockResult = {
        success: false,
        error: 'Export failed',
        recordCount: 0,
        exportDate: new Date(),
        format: 'CSV',
      };

      mockDataExportService.exportData.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDataExport());

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      await act(async () => {
        await result.current.exportData(exportOptions);
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBe('Export failed');
    });

    it('should handle export exception', async () => {
      mockDataExportService.exportData.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => useDataExport());

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      await act(async () => {
        await expect(result.current.exportData(exportOptions)).rejects.toThrow('Service unavailable');
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.error).toBe('Service unavailable');
    });
  });

  describe('shareExportedFile', () => {
    it('should share file successfully', async () => {
      mockShareService.shareWithFallback.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDataExport());

      await act(async () => {
        await result.current.shareExportedFile('/path/to/export.csv');
      });

      expect(mockShareService.shareWithFallback).toHaveBeenCalledWith('/path/to/export.csv', {
        dialogTitle: 'Share Financial Data Export',
      });
    });

    it('should handle share failure', async () => {
      mockShareService.shareWithFallback.mockResolvedValue({
        success: false,
        error: 'Share not available',
      });

      const { result } = renderHook(() => useDataExport());

      await act(async () => {
        await expect(
          result.current.shareExportedFile('/path/to/export.csv')
        ).rejects.toThrow('Share not available');
      });

      expect(result.current.error).toBe('Share not available');
    });
  });

  describe('clearResult', () => {
    it('should clear result and error state', async () => {
      const { result } = renderHook(() => useDataExport());

      // Set some state first
      await act(async () => {
        result.current.exportData({} as ExportOptions).catch(() => {});
      });

      act(() => {
        result.current.clearResult();
      });

      expect(result.current.result).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toBe(0);
    });
  });

  describe('cancelExport', () => {
    it('should cancel export and set error message', () => {
      const { result } = renderHook(() => useDataExport());

      act(() => {
        result.current.cancelExport();
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBe('Export cancelled by user');
    });
  });

  describe('getExportSummary', () => {
    it('should get export summary successfully', async () => {
      const mockSummary = {
        totalTransactions: 100,
        totalAmount: 50000,
        dateRange: { start: null, end: null },
        transactionsByType: { expense: 80, income: 20 },
      };

      mockDataExportService.getExportSummary.mockResolvedValue(mockSummary);

      const { result } = renderHook(() => useDataExport());

      let summary;
      await act(async () => {
        summary = await result.current.getExportSummary();
      });

      expect(summary).toEqual(mockSummary);
    });

    it('should handle summary error', async () => {
      mockDataExportService.getExportSummary.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useDataExport());

      await act(async () => {
        await expect(result.current.getExportSummary()).rejects.toThrow('Database error');
      });
    });
  });

  describe('validateExportOptions', () => {
    it('should return no errors for valid options', () => {
      const { result } = renderHook(() => useDataExport());

      const validOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      const errors = result.current.validateExportOptions(validOptions);
      expect(errors).toEqual([]);
    });

    it('should return error when no data types selected', () => {
      const { result } = renderHook(() => useDataExport());

      const invalidOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: false,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      const errors = result.current.validateExportOptions(invalidOptions);
      expect(errors).toContain('At least one data type must be selected for export');
    });

    it('should return error for invalid date range', () => {
      const { result } = renderHook(() => useDataExport());

      const invalidOptions: ExportOptions = {
        format: 'csv',
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
        dateRange: {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'), // End before start
        },
      };

      const errors = result.current.validateExportOptions(invalidOptions);
      expect(errors).toContain('Start date must be before end date');
    });

    it('should return error for invalid format', () => {
      const { result } = renderHook(() => useDataExport());

      const invalidOptions: ExportOptions = {
        format: 'xml' as any, // Invalid format
        includeTransactions: true,
        includeCategories: false,
        includeBudgets: false,
        includeGoals: false,
      };

      const errors = result.current.validateExportOptions(invalidOptions);
      expect(errors).toContain('Export format must be CSV or JSON');
    });
  });
});