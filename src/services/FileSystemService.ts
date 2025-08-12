import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface SaveFileResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  availableSpace: number;
}

export class FileSystemService {
  async saveToDownloads(fileName: string, content: string): Promise<string> {
    try {
      // Check storage permissions first
      await this.checkStoragePermissions();

      // Validate filename
      const sanitizedFileName = this.sanitizeFileName(fileName);
      
      // Create downloads directory if it doesn't exist
      const downloadDir = FileSystem.documentDirectory + 'Downloads/';
      const downloadDirInfo = await FileSystem.getInfoAsync(downloadDir);
      
      if (!downloadDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      // Check available storage space
      const requiredSpace = this.calculateContentSize(content);
      const storageInfo = await this.getStorageInfo();
      
      if (storageInfo.freeSpace < requiredSpace * 1.1) { // 10% buffer
        throw new Error('Insufficient storage space for export');
      }

      // Save file
      const filePath = downloadDir + sanitizedFileName;
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return filePath;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to save file to downloads'
      );
    }
  }

  async shareFile(filePath: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(filePath, {
        mimeType: this.getMimeType(filePath),
        dialogTitle: 'Export your financial data',
        UTI: this.getUTI(filePath),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to share file'
      );
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists ? fileInfo.size || 0 : 0;
    } catch (error) {
      return 0;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkStoragePermissions(): Promise<void> {
    // For Expo, file system access is generally available within app directory
    // Storage Access Framework permissions handled at app level
    try {
      const testPath = FileSystem.documentDirectory + 'test.txt';
      await FileSystem.writeAsStringAsync(testPath, 'test', {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await FileSystem.deleteAsync(testPath);
    } catch (error) {
      throw new Error('Storage permission is required to save export files');
    }
  }

  private async getStorageInfo(): Promise<StorageInfo> {
    try {
      const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();
      
      return {
        totalSpace: totalSpace || 0,
        freeSpace: freeSpace || 0,
        availableSpace: freeSpace || 0,
      };
    } catch (error) {
      // Return default values if unable to get storage info
      return {
        totalSpace: 0,
        freeSpace: 1000000000, // 1GB default
        availableSpace: 1000000000,
      };
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 255);
  }

  private calculateContentSize(content: string): number {
    return new Blob([content]).size;
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }

  private getUTI(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'public.comma-separated-values-text';
      case 'json':
        return 'public.json';
      default:
        return 'public.plain-text';
    }
  }
}

export const fileSystemService = new FileSystemService();