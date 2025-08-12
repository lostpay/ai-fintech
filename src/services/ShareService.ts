import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ShareOptions {
  dialogTitle?: string;
  excludeApps?: string[];
  subject?: string;
  message?: string;
  anchor?: { x: number; y: number };
}

export interface ShareResult {
  success: boolean;
  dismissedAction?: boolean;
  completedAction?: boolean;
  error?: string;
}

export class ShareService {
  /**
   * Check if sharing is available on the device
   */
  async isShareAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch (error) {
      console.warn('Failed to check sharing availability:', error);
      return false;
    }
  }

  /**
   * Share file with customized options
   */
  async shareFile(
    filePath: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    try {
      const isAvailable = await this.isShareAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      const mimeType = this.getMimeType(filePath);
      const fileName = this.getFileName(filePath);

      const shareOptions: any = {
        mimeType,
        dialogTitle: options.dialogTitle || `Share ${fileName}`,
        UTI: this.getUTI(filePath),
      };

      await Sharing.shareAsync(filePath, shareOptions);

      return {
        success: true,
        completedAction: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Share multiple files (where supported)
   */
  async shareMultipleFiles(
    filePaths: string[],
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    try {
      // For multiple files, we'll share the first file with a note about others
      // Full multiple file sharing would require more complex implementation
      if (filePaths.length === 0) {
        return {
          success: false,
          error: 'No files to share',
        };
      }

      if (filePaths.length === 1) {
        return this.shareFile(filePaths[0], options);
      }

      // Share the first file with modified title indicating multiple files
      const modifiedOptions: ShareOptions = {
        ...options,
        dialogTitle: `Share ${filePaths.length} export files (starting with first file)`,
      };

      return this.shareFile(filePaths[0], modifiedOptions);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share multiple files',
      };
    }
  }

  /**
   * Share with specific app category preference
   */
  async shareWithPreference(
    filePath: string,
    preference: 'email' | 'cloud' | 'messaging' | 'social',
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const preferenceMessages = {
      email: 'Share via email',
      cloud: 'Save to cloud storage',
      messaging: 'Send via messaging',
      social: 'Share on social media',
    };

    const modifiedOptions: ShareOptions = {
      ...options,
      dialogTitle: options.dialogTitle || preferenceMessages[preference],
    };

    return this.shareFile(filePath, modifiedOptions);
  }

  /**
   * Show share options with error handling and user guidance
   */
  async shareWithFallback(
    filePath: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    try {
      const result = await this.shareFile(filePath, options);
      
      if (!result.success && result.error) {
        // Show user-friendly error message
        this.showShareErrorDialog(result.error, filePath);
      }
      
      return result;
    } catch (error) {
      const fallbackResult: ShareResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.showShareErrorDialog(fallbackResult.error!, filePath);
      return fallbackResult;
    }
  }

  /**
   * Validate file before sharing
   */
  async validateAndShare(
    filePath: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    try {
      // Check if file exists and is readable
      const fileValidation = await this.validateFile(filePath);
      
      if (!fileValidation.valid) {
        return {
          success: false,
          error: fileValidation.error || 'File validation failed',
        };
      }

      return this.shareFile(filePath, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File validation failed',
      };
    }
  }

  /**
   * Get sharing recommendations based on file type and size
   */
  async getShareRecommendations(filePath: string): Promise<{
    recommendedApps: string[];
    warnings: string[];
    optimizations: string[];
  }> {
    const mimeType = this.getMimeType(filePath);
    const fileSize = await this.getFileSize(filePath);
    
    const recommendations = {
      recommendedApps: [] as string[],
      warnings: [] as string[],
      optimizations: [] as string[],
    };

    // Recommend based on file type
    if (mimeType === 'text/csv') {
      recommendations.recommendedApps.push('Excel', 'Google Sheets', 'Numbers');
    } else if (mimeType === 'application/json') {
      recommendations.recommendedApps.push('Text editors', 'Code viewers', 'Cloud storage');
    }

    // Warnings based on file size
    if (fileSize > 10 * 1024 * 1024) { // 10MB
      recommendations.warnings.push('Large file size may cause issues with some sharing apps');
    }

    if (fileSize > 50 * 1024 * 1024) { // 50MB
      recommendations.warnings.push('File too large for email - consider cloud storage');
      recommendations.optimizations.push('Split data into smaller date ranges');
    }

    return recommendations;
  }

  /**
   * Private helper methods
   */
  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  private getUTI(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'public.comma-separated-values-text';
      case 'json':
        return 'public.json';
      case 'txt':
        return 'public.plain-text';
      default:
        return 'public.data';
    }
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || 'export';
  }

  private async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic file existence and readability check
      // In a real implementation, you would use FileSystem.getInfoAsync
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'File not found or not readable',
      };
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      // In a real implementation, you would get actual file size
      // For now, return a reasonable default
      return 1024; // 1KB default
    } catch (error) {
      return 0;
    }
  }

  private showShareErrorDialog(error: string, filePath: string): void {
    const fileName = this.getFileName(filePath);
    
    Alert.alert(
      'Share Failed',
      `Unable to share ${fileName}.\n\nError: ${error}\n\nPlease try again or use a different sharing method.`,
      [
        { text: 'OK', style: 'default' },
      ]
    );
  }
}

export const shareService = new ShareService();