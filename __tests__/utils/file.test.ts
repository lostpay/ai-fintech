import { 
  formatFileSize, 
  isValidExportFormat, 
  generateTimestamp, 
  sanitizeFilename, 
  generateExportFilename, 
  estimateExportFileSize,
  validateExportContent,
  formatExportSummary 
} from '../../src/utils/file';

describe('file utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle large file sizes', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('isValidExportFormat', () => {
    it('should validate CSV files', () => {
      expect(isValidExportFormat('export.csv')).toBe(true);
      expect(isValidExportFormat('export.CSV')).toBe(true);
      expect(isValidExportFormat('file.test.csv')).toBe(true);
    });

    it('should validate JSON files', () => {
      expect(isValidExportFormat('export.json')).toBe(true);
      expect(isValidExportFormat('export.JSON')).toBe(true);
      expect(isValidExportFormat('file.test.json')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidExportFormat('export.txt')).toBe(false);
      expect(isValidExportFormat('export.xml')).toBe(false);
      expect(isValidExportFormat('export')).toBe(false);
      expect(isValidExportFormat('export.')).toBe(false);
    });
  });

  describe('generateTimestamp', () => {
    it('should generate timestamp in YYYYMMDD format', () => {
      // Mock date
      const mockDate = new Date('2024-01-15T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const timestamp = generateTimestamp();
      expect(timestamp).toBe('20240115');

      jest.restoreAllMocks();
    });

    it('should handle different dates', () => {
      const mockDate = new Date('2023-12-31T23:59:59Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const timestamp = generateTimestamp();
      expect(timestamp).toBe('20231231');

      jest.restoreAllMocks();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<name>.csv')).toBe('file_name_.csv');
      expect(sanitizeFilename('file|name?.csv')).toBe('file_name_.csv');
      expect(sanitizeFilename('file*name\\\\file.csv')).toBe('file_name_file.csv');
    });

    it('should replace multiple underscores with single underscore', () => {
      expect(sanitizeFilename('file___name.csv')).toBe('file_name.csv');
      expect(sanitizeFilename('file>>>>name.csv')).toBe('file_name.csv');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.csv';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('file-name_123.csv')).toBe('file-name_123.csv');
      expect(sanitizeFilename('File.Name.2024.csv')).toBe('File.Name.2024.csv');
    });
  });

  describe('generateExportFilename', () => {
    beforeEach(() => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate CSV filename with timestamp', () => {
      const filename = generateExportFilename('csv');
      expect(filename).toBe('financeflow_export_20240115.csv');
    });

    it('should generate JSON filename with timestamp', () => {
      const filename = generateExportFilename('json');
      expect(filename).toBe('financeflow_export_20240115.json');
    });
  });

  describe('estimateExportFileSize', () => {
    it('should estimate CSV file size', () => {
      const size = estimateExportFileSize(100, 'csv');
      expect(size).toBe(15100); // 100 + (100 * 150)
    });

    it('should estimate JSON file size', () => {
      const size = estimateExportFileSize(100, 'json');
      expect(size).toBe(26000); // 1000 + (100 * 250)
    });

    it('should handle zero records', () => {
      expect(estimateExportFileSize(0, 'csv')).toBe(100);
      expect(estimateExportFileSize(0, 'json')).toBe(1000);
    });
  });

  describe('validateExportContent', () => {
    it('should validate valid JSON content', () => {
      const jsonContent = JSON.stringify({ data: 'test' });
      const result = validateExportContent(jsonContent, 'json');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid JSON content', () => {
      const invalidJson = '{ "data": invalid }';
      const result = validateExportContent(invalidJson, 'json');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate valid CSV content', () => {
      const csvContent = 'Name,Age,City\\nJohn,30,NYC\\nJane,25,LA';
      const result = validateExportContent(csvContent, 'csv');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject CSV with only header', () => {
      const csvContent = 'Name,Age,City';
      const result = validateExportContent(csvContent, 'csv');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSV must have at least header and one data row');
    });

    it('should reject empty CSV content', () => {
      const result = validateExportContent('', 'csv');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSV must have at least header and one data row');
    });
  });

  describe('formatExportSummary', () => {
    it('should format complete summary with date range', () => {
      const summary = {
        totalTransactions: 150,
        totalAmount: 75000, // $750.00 in cents
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z'
        },
        transactionsByType: {
          expense: 120,
          income: 30
        }
      };

      const formatted = formatExportSummary(summary);
      
      expect(formatted).toContain('Total Transactions: 150');
      expect(formatted).toContain('Total Amount: $750.00');
      expect(formatted).toContain('Date Range: 1/1/2024 - 1/31/2024');
      expect(formatted).toContain('Expenses: 120');
      expect(formatted).toContain('Income: 30');
    });

    it('should format summary without date range', () => {
      const summary = {
        totalTransactions: 100,
        totalAmount: 50000,
        dateRange: { start: null, end: null },
        transactionsByType: {
          expense: 80,
          income: 20
        }
      };

      const formatted = formatExportSummary(summary);
      
      expect(formatted).toContain('Total Transactions: 100');
      expect(formatted).toContain('Total Amount: $500.00');
      expect(formatted).not.toContain('Date Range:');
      expect(formatted).toContain('Expenses: 80');
      expect(formatted).toContain('Income: 20');
    });

    it('should handle zero amounts', () => {
      const summary = {
        totalTransactions: 0,
        totalAmount: 0,
        dateRange: { start: null, end: null },
        transactionsByType: {
          expense: 0,
          income: 0
        }
      };

      const formatted = formatExportSummary(summary);
      
      expect(formatted).toContain('Total Transactions: 0');
      expect(formatted).toContain('Total Amount: $0.00');
      expect(formatted).toContain('Expenses: 0');
      expect(formatted).toContain('Income: 0');
    });
  });
});