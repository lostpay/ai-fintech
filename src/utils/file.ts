/**
 * File utility functions for FinanceFlow app
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file extension
 */
export function isValidExportFormat(filename: string): boolean {
  const validExtensions = ['.csv', '.json'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

/**
 * Generate timestamp for filename
 */
export function generateTimestamp(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Sanitize filename for safe file system usage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 255);
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFilename(format: 'csv' | 'json'): string {
  const timestamp = generateTimestamp();
  return `financeflow_export_${timestamp}.${format}`;
}

/**
 * Calculate estimated file size based on record count
 */
export function estimateExportFileSize(recordCount: number, format: 'csv' | 'json'): number {
  // Rough estimates based on average record sizes
  const avgRecordSizes = {
    csv: 150, // bytes per record
    json: 250, // bytes per record (includes metadata)
  };
  
  const baseSize = format === 'json' ? 1000 : 100; // base metadata size
  return baseSize + (recordCount * avgRecordSizes[format]);
}

/**
 * Validate export file content
 */
export function validateExportContent(content: string, format: 'csv' | 'json'): {
  valid: boolean;
  error?: string;
} {
  try {
    if (format === 'json') {
      JSON.parse(content);
    } else if (format === 'csv') {
      const lines = content.split('\n');
      if (lines.length < 2) {
        return { valid: false, error: 'CSV must have at least header and one data row' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid file content',
    };
  }
}

/**
 * Format export summary for display
 */
export function formatExportSummary(summary: {
  totalTransactions: number;
  totalAmount: number;
  dateRange: { start: string | null; end: string | null };
  transactionsByType: { expense: number; income: number };
}): string {
  const lines = [
    `Total Transactions: ${summary.totalTransactions}`,
    `Total Amount: $${(summary.totalAmount / 100).toFixed(2)}`,
  ];

  if (summary.dateRange.start && summary.dateRange.end) {
    const startDate = new Date(summary.dateRange.start).toLocaleDateString();
    const endDate = new Date(summary.dateRange.end).toLocaleDateString();
    lines.push(`Date Range: ${startDate} - ${endDate}`);
  }

  lines.push(
    `Expenses: ${summary.transactionsByType.expense}`,
    `Income: ${summary.transactionsByType.income}`
  );

  return lines.join('\n');
}