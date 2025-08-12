import { useState, useCallback } from 'react';
import { dataExportService } from '../services';
import type { ExportOptions, ExportResult } from '../services';
import { shareService } from '../services/ShareService';

interface ExportState {
  isExporting: boolean;
  progress: number;
  result: ExportResult | null;
  error: string | null;
}

export const useDataExport = () => {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    result: null,
    error: null,
  });

  const exportData = useCallback(async (options: ExportOptions) => {
    try {
      setState(prev => ({
        ...prev,
        isExporting: true,
        progress: 0,
        error: null,
        result: null,
      }));

      const exportId = `export_${Date.now()}`;
      const result = await dataExportService.exportData(
        options,
        (progress) => {
          setState(prev => ({ ...prev, progress }));
        },
        exportId
      );

      setState(prev => ({
        ...prev,
        isExporting: false,
        result,
        error: result.success ? null : result.error || 'Export failed',
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setState(prev => ({
        ...prev,
        isExporting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const shareExportedFile = useCallback(async (filePath: string) => {
    try {
      const result = await shareService.shareWithFallback(filePath, {
        dialogTitle: 'Share Financial Data Export',
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Share failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to share file',
      }));
      throw error;
    }
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null,
      progress: 0,
    }));
  }, []);

  const cancelExport = useCallback(() => {
    // Note: Actual export cancellation would require more complex implementation
    // with AbortController or similar mechanism
    setState(prev => ({
      ...prev,
      isExporting: false,
      progress: 0,
      error: 'Export cancelled by user',
    }));
  }, []);

  const getExportSummary = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      return await dataExportService.getExportSummary(startDate, endDate);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get export summary'
      );
    }
  }, []);

  const validateExportOptions = useCallback((options: ExportOptions): string[] => {
    const errors: string[] = [];

    if (!options.includeTransactions && !options.includeCategories && 
        !options.includeBudgets && !options.includeGoals) {
      errors.push('At least one data type must be selected for export');
    }

    if (options.dateRange && 
        options.dateRange.startDate > options.dateRange.endDate) {
      errors.push('Start date must be before end date');
    }

    if (!['csv', 'json'].includes(options.format)) {
      errors.push('Export format must be CSV or JSON');
    }

    return errors;
  }, []);

  return {
    ...state,
    exportData,
    shareExportedFile,
    clearResult,
    cancelExport,
    getExportSummary,
    validateExportOptions,
  };
};