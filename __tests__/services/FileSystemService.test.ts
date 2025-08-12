import { FileSystemService } from '../../src/services/FileSystemService';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/document/directory/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getTotalDiskCapacityAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

  beforeEach(() => {
    fileSystemService = new FileSystemService();
    jest.clearAllMocks();

    // Default mock implementations
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: true,
    });
    mockFileSystem.getTotalDiskCapacityAsync.mockResolvedValue(1000000000); // 1GB
    mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(500000000); // 500MB
  });

  describe('saveToDownloads', () => {
    it('should save file to downloads directory successfully', async () => {
      const fileName = 'test_export.csv';
      const content = 'Date,Description,Amount\n2024-01-15,Coffee,5.00';
      
      const filePath = await fileSystemService.saveToDownloads(fileName, content);

      expect(filePath).toBe('/mock/document/directory/Downloads/test_export.csv');
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        '/mock/document/directory/Downloads/',
        { intermediates: true }
      );
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/document/directory/Downloads/test_export.csv',
        content,
        { encoding: 'utf8' }
      );
    });

    it('should create downloads directory if it does not exist', async () => {
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: false }) // Downloads directory
        .mockResolvedValueOnce({ exists: true }); // File write check

      await fileSystemService.saveToDownloads('test.csv', 'content');

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        '/mock/document/directory/Downloads/',
        { intermediates: true }
      );
    });

    it('should sanitize filename with invalid characters', async () => {
      const invalidFileName = 'test file with <invalid> characters!.csv';
      const content = 'test content';
      
      await fileSystemService.saveToDownloads(invalidFileName, content);

      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('test_file_with_invalid_characters_.csv'),
        content,
        expect.any(Object)
      );
    });

    it('should throw error when insufficient storage space', async () => {
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(100); // Very small free space
      
      const largeContent = 'x'.repeat(1000); // Large content
      
      await expect(
        fileSystemService.saveToDownloads('test.csv', largeContent)
      ).rejects.toThrow('Insufficient storage space for export');
    });

    it('should handle file system write errors', async () => {
      mockFileSystem.writeAsStringAsync.mockRejectedValue(new Error('Write failed'));

      await expect(
        fileSystemService.saveToDownloads('test.csv', 'content')
      ).rejects.toThrow('Write failed');
    });
  });

  describe('getFileSize', () => {
    it('should return file size when file exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const size = await fileSystemService.getFileSize('/path/to/file.csv');

      expect(size).toBe(1024);
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith('/path/to/file.csv');
    });

    it('should return 0 when file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
      });

      const size = await fileSystemService.getFileSize('/path/to/nonexistent.csv');

      expect(size).toBe(0);
    });

    it('should return 0 when file info fails', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValue(new Error('File access failed'));

      const size = await fileSystemService.getFileSize('/path/to/file.csv');

      expect(size).toBe(0);
    });
  });

  describe('deleteFile', () => {
    it('should delete file when it exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });

      const result = await fileSystemService.deleteFile('/path/to/file.csv');

      expect(result).toBe(true);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith('/path/to/file.csv');
    });

    it('should handle non-existent file gracefully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
      });

      const result = await fileSystemService.deleteFile('/path/to/nonexistent.csv');

      expect(result).toBe(true);
      expect(mockFileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
      });
      mockFileSystem.deleteAsync.mockRejectedValue(new Error('Delete failed'));

      const result = await fileSystemService.deleteFile('/path/to/file.csv');

      expect(result).toBe(false);
    });
  });

  describe('shareFile', () => {
    const mockSharing = require('expo-sharing');

    beforeEach(() => {
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue(undefined);
    });

    it('should share file with correct MIME type', async () => {
      await fileSystemService.shareFile('/path/to/file.csv');

      expect(mockSharing.shareAsync).toHaveBeenCalledWith('/path/to/file.csv', {
        mimeType: 'text/csv',
        dialogTitle: 'Export your financial data',
        UTI: 'public.comma-separated-values-text',
      });
    });

    it('should handle JSON file sharing', async () => {
      await fileSystemService.shareFile('/path/to/file.json');

      expect(mockSharing.shareAsync).toHaveBeenCalledWith('/path/to/file.json', {
        mimeType: 'application/json',
        dialogTitle: 'Export your financial data',
        UTI: 'public.json',
      });
    });

    it('should throw error when sharing is not available', async () => {
      mockSharing.isAvailableAsync.mockResolvedValue(false);

      await expect(
        fileSystemService.shareFile('/path/to/file.csv')
      ).rejects.toThrow('Sharing is not available on this device');
    });

    it('should handle sharing errors', async () => {
      mockSharing.shareAsync.mockRejectedValue(new Error('Share failed'));

      await expect(
        fileSystemService.shareFile('/path/to/file.csv')
      ).rejects.toThrow('Share failed');
    });
  });
});