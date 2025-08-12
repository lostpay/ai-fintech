export interface ExportProgress {
  stage: 'initializing' | 'collecting' | 'formatting' | 'saving' | 'complete';
  percentage: number;
  message: string;
  recordsProcessed?: number;
  totalRecords?: number;
  estimatedTimeRemaining?: number; // in seconds
}

export interface ExportProgressCallback {
  (progress: ExportProgress): void;
}

export class ExportProgressService {
  private callbacks: Map<string, ExportProgressCallback> = new Map();
  private currentProgress: Map<string, ExportProgress> = new Map();

  /**
   * Register a progress callback for a specific export operation
   */
  subscribe(exportId: string, callback: ExportProgressCallback): void {
    this.callbacks.set(exportId, callback);
  }

  /**
   * Unregister a progress callback
   */
  unsubscribe(exportId: string): void {
    this.callbacks.delete(exportId);
    this.currentProgress.delete(exportId);
  }

  /**
   * Update progress for an export operation
   */
  updateProgress(exportId: string, progress: Partial<ExportProgress>): void {
    const currentProg = this.currentProgress.get(exportId) || {
      stage: 'initializing',
      percentage: 0,
      message: 'Starting export...',
    };

    const updatedProgress: ExportProgress = {
      ...currentProg,
      ...progress,
    };

    this.currentProgress.set(exportId, updatedProgress);

    // Notify callback if registered
    const callback = this.callbacks.get(exportId);
    if (callback) {
      callback(updatedProgress);
    }
  }

  /**
   * Get current progress for an export operation
   */
  getProgress(exportId: string): ExportProgress | null {
    return this.currentProgress.get(exportId) || null;
  }

  /**
   * Create a progress tracker for staged export operations
   */
  createStageTracker(exportId: string, stages: Array<{ stage: ExportProgress['stage']; weight: number }>) {
    return {
      updateStage: (currentStage: ExportProgress['stage'], stageProgress: number, message: string, recordsInfo?: { processed: number; total: number }) => {
        let overallProgress = 0;
        let stageStartPercentage = 0;

        // Calculate overall progress based on stage weights
        for (const stage of stages) {
          if (stage.stage === currentStage) {
            overallProgress = stageStartPercentage + (stage.weight * stageProgress);
            break;
          }
          stageStartPercentage += stage.weight;
        }

        this.updateProgress(exportId, {
          stage: currentStage,
          percentage: Math.min(Math.max(overallProgress, 0), 100),
          message,
          recordsProcessed: recordsInfo?.processed,
          totalRecords: recordsInfo?.total,
          estimatedTimeRemaining: this.estimateTimeRemaining(exportId, overallProgress),
        });
      },

      complete: (message: string = 'Export completed successfully') => {
        this.updateProgress(exportId, {
          stage: 'complete',
          percentage: 100,
          message,
          estimatedTimeRemaining: 0,
        });
      },
    };
  }

  /**
   * Calculate progress for bulk operations with batching
   */
  createBatchTracker(exportId: string, totalItems: number, batchSize: number) {
    let processedItems = 0;
    const startTime = Date.now();

    return {
      updateBatch: (batchProcessed: number, currentStage: ExportProgress['stage'], message: string) => {
        processedItems += batchProcessed;
        const percentage = Math.min((processedItems / totalItems) * 100, 100);

        this.updateProgress(exportId, {
          stage: currentStage,
          percentage,
          message,
          recordsProcessed: processedItems,
          totalRecords: totalItems,
          estimatedTimeRemaining: this.estimateTimeRemaining(exportId, percentage, startTime),
        });
      },
    };
  }

  /**
   * Estimate remaining time based on current progress
   */
  private estimateTimeRemaining(exportId: string, currentPercentage: number, startTime?: number): number {
    const start = startTime || this.getProgressStartTime(exportId);
    const elapsedTime = (Date.now() - start) / 1000; // seconds
    
    if (currentPercentage <= 0) return 0;
    if (currentPercentage >= 100) return 0;

    const estimatedTotalTime = (elapsedTime / currentPercentage) * 100;
    const remainingTime = estimatedTotalTime - elapsedTime;

    return Math.max(remainingTime, 0);
  }

  /**
   * Get the start time for a progress tracking operation
   */
  private getProgressStartTime(exportId: string): number {
    // In a more complex implementation, this would track start times per export
    // For now, we'll estimate based on current timestamp minus reasonable elapsed time
    return Date.now() - 5000; // Assume 5 seconds have passed as fallback
  }

  /**
   * Format progress message with details
   */
  formatProgressMessage(progress: ExportProgress): string {
    let message = progress.message;

    if (progress.recordsProcessed !== undefined && progress.totalRecords !== undefined) {
      message += ` (${progress.recordsProcessed}/${progress.totalRecords} records)`;
    }

    if (progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0) {
      const minutes = Math.floor(progress.estimatedTimeRemaining / 60);
      const seconds = Math.floor(progress.estimatedTimeRemaining % 60);
      
      if (minutes > 0) {
        message += ` - ${minutes}m ${seconds}s remaining`;
      } else {
        message += ` - ${seconds}s remaining`;
      }
    }

    return message;
  }

  /**
   * Reset all progress tracking
   */
  reset(): void {
    this.callbacks.clear();
    this.currentProgress.clear();
  }
}

export const exportProgressService = new ExportProgressService();