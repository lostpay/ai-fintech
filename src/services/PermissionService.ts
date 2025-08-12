import { Alert, Linking } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  error?: string;
}

export interface PermissionStatus {
  storage: PermissionResult;
}

export class PermissionService {
  /**
   * Check current storage permission status
   */
  async checkStoragePermission(): Promise<PermissionResult> {
    try {
      // For Expo managed workflow, storage permissions are automatically granted
      // within the app's document directory. External storage would require different handling.
      return {
        granted: true,
        canAskAgain: false,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: false,
        error: error instanceof Error ? error.message : 'Permission check failed',
      };
    }
  }

  /**
   * Request storage permission with user-friendly messaging
   */
  async requestStoragePermission(): Promise<PermissionResult> {
    try {
      // Check current status first
      const currentStatus = await this.checkStoragePermission();
      
      if (currentStatus.granted) {
        return currentStatus;
      }

      // For Expo managed workflow, we don't need explicit permission requests
      // for the app's document directory
      return {
        granted: true,
        canAskAgain: false,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: false,
        error: error instanceof Error ? error.message : 'Permission request failed',
      };
    }
  }

  /**
   * Request storage permission with user guidance
   */
  async requestStoragePermissionWithGuidance(): Promise<PermissionResult> {
    const result = await this.requestStoragePermission();

    if (!result.granted && result.error) {
      this.showPermissionDeniedDialog();
    }

    return result;
  }

  /**
   * Show permission explanation dialog
   */
  showPermissionExplanationDialog(onAccept: () => void, onDeny: () => void): void {
    Alert.alert(
      'Storage Permission Required',
      'FinanceFlow needs storage permission to save your exported financial data files to your device.\n\n' +
      'This allows you to:\n' +
      '• Save export files to your device\n' +
      '• Share files with other apps\n' +
      '• Keep backups of your financial data\n\n' +
      'Your data remains private and secure.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: onDeny,
        },
        {
          text: 'Allow',
          style: 'default',
          onPress: onAccept,
        },
      ],
      { cancelable: false }
    );
  }

  /**
   * Show permission denied dialog with guidance
   */
  showPermissionDeniedDialog(): void {
    Alert.alert(
      'Storage Permission Denied',
      'Storage permission is required to save export files. ' +
      'You can enable it in your device settings.\n\n' +
      'Go to Settings > Apps > FinanceFlow > Permissions > Storage',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          style: 'default',
          onPress: this.openAppSettings,
        },
      ]
    );
  }

  /**
   * Open app settings for permission management
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Could not open settings:', error);
      Alert.alert(
        'Cannot Open Settings',
        'Please manually go to Settings > Apps > FinanceFlow > Permissions to enable storage permission.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Validate storage permission before file operations
   */
  async validateStorageAccess(): Promise<{ canProceed: boolean; error?: string }> {
    const permission = await this.checkStoragePermission();
    
    if (!permission.granted) {
      return {
        canProceed: false,
        error: permission.error || 'Storage permission is required for file operations',
      };
    }

    return { canProceed: true };
  }

  /**
   * Handle permission workflow for file operations
   */
  async handleFileOperationPermissions(): Promise<boolean> {
    // Check current permission status
    let permission = await this.checkStoragePermission();
    
    if (permission.granted) {
      return true;
    }

    // Show explanation and request permission
    return new Promise((resolve) => {
      this.showPermissionExplanationDialog(
        async () => {
          const requestResult = await this.requestStoragePermission();
          resolve(requestResult.granted);
        },
        () => {
          resolve(false);
        }
      );
    });
  }

  /**
   * Get all permission statuses
   */
  async getAllPermissionStatuses(): Promise<PermissionStatus> {
    const storage = await this.checkStoragePermission();
    
    return {
      storage,
    };
  }

  /**
   * Check if we should show permission rationale
   */
  shouldShowPermissionRationale(permission: 'storage'): boolean {
    // For Expo managed workflow, we don't need to show rationales
    // as document directory access is automatically granted
    return false;
  }

  /**
   * Get user-friendly permission status message
   */
  getPermissionStatusMessage(permission: PermissionResult): string {
    if (permission.granted) {
      return 'Permission granted';
    }

    if (permission.error) {
      return `Permission error: ${permission.error}`;
    }

    return permission.canAskAgain 
      ? 'Permission denied - can request again' 
      : 'Permission permanently denied - check settings';
  }
}

export const permissionService = new PermissionService();