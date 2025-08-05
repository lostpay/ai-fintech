/**
 * Centralized error handling service for the FinanceFlow application
 * Provides user-friendly error messages and recovery suggestions
 */

export interface AppError {
  error: {
    code: string;           // ERROR_CODE for programmatic handling
    message: string;        // User-friendly error message
    details?: {
      originalError?: string;
      context?: string;
      timestamp: string;
      userId?: string;      // Always null for single-user app
    };
    recoverable: boolean;   // Whether user can retry the operation
    retryAction?: string;   // Suggested recovery action
  };
}

export class ValidationError extends Error {
  constructor(
    public validationErrors: Record<string, string>,
    message?: string
  ) {
    super(message || 'Validation failed');
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    public originalError: any,
    public context: string,
    message?: string
  ) {
    super(message || 'Database operation failed');
    this.name = 'DatabaseError';
  }
}

export class ErrorHandlingService {
  /**
   * Process any error and convert it to user-friendly AppError format
   */
  static processError(error: any, context: string): AppError {
    const timestamp = new Date().toISOString();
    const baseDetails = {
      originalError: error?.message || String(error),
      context,
      timestamp,
      userId: null // Single-user app
    };

    // Handle ValidationError
    if (error instanceof ValidationError) {
      const errorMessages = Object.values(error.validationErrors);
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessages.length === 1 
            ? errorMessages[0] 
            : `Please correct the following: ${errorMessages.join(', ')}`,
          details: {
            ...baseDetails,
            originalError: JSON.stringify(error.validationErrors)
          },
          recoverable: true,
          retryAction: 'Please fix the highlighted fields and try again'
        }
      };
    }

    // Handle database-related errors
    if (this.isDatabaseError(error)) {
      return this.processDatabaseError(error, context, baseDetails);
    }

    // Handle constraint violations
    if (this.isConstraintError(error)) {
      return this.processConstraintError(error, context, baseDetails);
    }

    // Handle foreign key violations
    if (this.isForeignKeyError(error)) {
      return {
        error: {
          code: 'FOREIGN_KEY_ERROR',
          message: 'The selected category is no longer available. Please choose a different category.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Select a valid category and try again'
        }
      };
    }

    // Handle network/connection errors
    if (this.isConnectionError(error)) {
      return {
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Unable to connect to the database. Please try again.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Check your connection and try again'
        }
      };
    }

    // Handle generic errors
    return {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: baseDetails,
        recoverable: true,
        retryAction: 'Try the operation again'
      }
    };
  }

  /**
   * Process database-specific errors
   */
  private static processDatabaseError(error: any, context: string, baseDetails: any): AppError {
    const errorMessage = error.message?.toLowerCase() || '';

    // Handle database locked errors
    if (errorMessage.includes('database is locked')) {
      return {
        error: {
          code: 'DATABASE_LOCKED',
          message: 'The app is busy processing another request. Please wait a moment and try again.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Wait a few seconds and try again'
        }
      };
    }

    // Handle database corruption
    if (errorMessage.includes('database disk image is malformed')) {
      return {
        error: {
          code: 'DATABASE_CORRUPTED',
          message: 'There is an issue with the app data. Please restart the app.',
          details: baseDetails,
          recoverable: false,
          retryAction: 'Restart the application'
        }
      };
    }

    // Handle disk space errors
    if (errorMessage.includes('database or disk is full')) {
      return {
        error: {
          code: 'STORAGE_FULL',
          message: 'Your device is running out of storage space. Please free up some space and try again.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Free up storage space and try again'
        }
      };
    }

    // Generic database error
    return {
      error: {
        code: 'DATABASE_ERROR',
        message: 'Unable to save your data. Please try again.',
        details: baseDetails,
        recoverable: true,
        retryAction: 'Try the operation again'
      }
    };
  }

  /**
   * Process constraint violation errors
   */
  private static processConstraintError(error: any, context: string, baseDetails: any): AppError {
    const errorMessage = error.message?.toLowerCase() || '';

    // Handle amount constraints
    if (errorMessage.includes('amount') && errorMessage.includes('check')) {
      return {
        error: {
          code: 'INVALID_AMOUNT',
          message: 'The amount must be greater than zero.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Enter a valid positive amount'
        }
      };
    }

    // Handle description constraints
    if (errorMessage.includes('description') && errorMessage.includes('check')) {
      return {
        error: {
          code: 'INVALID_DESCRIPTION',
          message: 'Description is required and must be between 1 and 200 characters.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Enter a valid description'
        }
      };
    }

    // Handle transaction type constraints
    if (errorMessage.includes('transaction_type') && errorMessage.includes('check')) {
      return {
        error: {
          code: 'INVALID_TRANSACTION_TYPE',
          message: 'Invalid transaction type selected.',
          details: baseDetails,
          recoverable: true,
          retryAction: 'Select either expense or income'
        }
      };
    }

    // Generic constraint error
    return {
      error: {
        code: 'CONSTRAINT_ERROR',
        message: 'The data you entered does not meet the required format. Please check your input and try again.',
        details: baseDetails,
        recoverable: true,
        retryAction: 'Check your input and try again'
      }
    };
  }

  /**
   * Check if error is database-related
   */
  private static isDatabaseError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toUpperCase() || '';
    
    return (
      errorMessage.includes('database') ||
      errorMessage.includes('sqlite') ||
      errorCode.startsWith('SQLITE_') ||
      error instanceof DatabaseError
    );
  }

  /**
   * Check if error is a constraint violation
   */
  private static isConstraintError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toUpperCase() || '';
    
    return (
      errorMessage.includes('constraint') ||
      errorMessage.includes('check constraint') ||
      errorCode === 'SQLITE_CONSTRAINT' ||
      errorCode === 'SQLITE_CONSTRAINT_CHECK'
    );
  }

  /**
   * Check if error is a foreign key violation
   */
  private static isForeignKeyError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toUpperCase() || '';
    
    return (
      errorMessage.includes('foreign key') ||
      errorMessage.includes('foreign key constraint') ||
      errorCode === 'SQLITE_CONSTRAINT_FOREIGNKEY'
    );
  }

  /**
   * Check if error is connection-related
   */
  private static isConnectionError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('unable to connect')
    );
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: Record<string, string>): string {
    const errorMessages = Object.values(errors);
    if (errorMessages.length === 1) {
      return errorMessages[0];
    }
    return errorMessages.join('. ');
  }

  /**
   * Create a success response format for consistency
   */
  static createSuccessResponse<T>(data: T, message?: string): { success: true; data: T; message?: string } {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Check if an object is an AppError
   */
  static isAppError(obj: any): obj is AppError {
    return obj && obj.error && typeof obj.error.code === 'string' && typeof obj.error.message === 'string';
  }
}