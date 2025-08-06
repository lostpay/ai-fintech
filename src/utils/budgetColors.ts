import { BudgetStatus } from '../types/Budget';

// Budget status thresholds
export const BUDGET_THRESHOLDS = {
  UNDER_BUDGET: 75,    // 0-74% = green
  APPROACHING: 100,    // 75-100% = yellow/amber
  OVER_BUDGET: 100,    // >100% = red
} as const;

/**
 * Calculate budget status based on percentage used
 */
export const calculateBudgetStatus = (percentageUsed: number): BudgetStatus => {
  if (percentageUsed < BUDGET_THRESHOLDS.UNDER_BUDGET) return 'under';
  if (percentageUsed <= BUDGET_THRESHOLDS.APPROACHING) return 'approaching';
  return 'over';
};

/**
 * Get color for budget status - Material Design 3 colors
 */
export const getBudgetStatusColor = (status: BudgetStatus, theme?: any): string => {
  switch (status) {
    case 'under':
      return theme?.colors?.success || '#4CAF50'; // Green - under 75%
    case 'approaching':
      return theme?.colors?.warning || '#FF9800'; // Amber - 75-100%
    case 'over':
      return theme?.colors?.error || '#F44336'; // Red - over 100%
    default:
      return theme?.colors?.onSurface || '#000000';
  }
};

/**
 * Get color for budget status based on percentage directly
 */
export const getBudgetStatusColorByPercentage = (percentageUsed: number, theme?: any): string => {
  const status = calculateBudgetStatus(percentageUsed);
  return getBudgetStatusColor(status, theme);
};

/**
 * Get status text for budget status
 */
export const getBudgetStatusText = (status: BudgetStatus): string => {
  switch (status) {
    case 'under':
      return 'On Track';
    case 'approaching':
      return 'Near Limit';
    case 'over':
      return 'Over Budget';
    default:
      return 'Unknown';
  }
};

/**
 * Get status icon for budget status (Material Icons)
 */
export const getBudgetStatusIcon = (status: BudgetStatus): string => {
  switch (status) {
    case 'under':
      return 'check-circle'; // Green checkmark
    case 'approaching':
      return 'warning'; // Amber warning
    case 'over':
      return 'error'; // Red error
    default:
      return 'help';
  }
};

/**
 * Get accessibility-compliant colors with sufficient contrast
 */
export const getBudgetStatusColorA11y = (status: BudgetStatus, isDark = false): string => {
  if (isDark) {
    // Dark mode colors with better contrast
    switch (status) {
      case 'under':
        return '#66BB6A'; // Lighter green for dark backgrounds
      case 'approaching':
        return '#FFB74D'; // Lighter amber for dark backgrounds
      case 'over':
        return '#EF5350'; // Lighter red for dark backgrounds
      default:
        return '#FFFFFF';
    }
  } else {
    // Light mode colors
    switch (status) {
      case 'under':
        return '#2E7D32'; // Darker green for light backgrounds
      case 'approaching':
        return '#F57C00'; // Darker amber for light backgrounds
      case 'over':
        return '#C62828'; // Darker red for light backgrounds
      default:
        return '#000000';
    }
  }
};

/**
 * Get background color for budget status cards
 */
export const getBudgetStatusBackgroundColor = (status: BudgetStatus, theme?: any): string => {
  switch (status) {
    case 'under':
      return theme?.colors?.successContainer || '#E8F5E8'; // Light green background
    case 'approaching':
      return theme?.colors?.warningContainer || '#FFF3E0'; // Light amber background
    case 'over':
      return theme?.colors?.errorContainer || '#FFEBEE'; // Light red background
    default:
      return theme?.colors?.surface || '#FFFFFF';
  }
};

/**
 * Get text color for budget status (to be used with background colors)
 */
export const getBudgetStatusTextColor = (status: BudgetStatus, theme?: any): string => {
  switch (status) {
    case 'under':
      return theme?.colors?.onSuccessContainer || '#1B5E20';
    case 'approaching':
      return theme?.colors?.onWarningContainer || '#E65100';
    case 'over':
      return theme?.colors?.onErrorContainer || '#B71C1C';
    default:
      return theme?.colors?.onSurface || '#000000';
  }
};

/**
 * Get progress bar color with opacity for incomplete progress
 */
export const getProgressBarColor = (percentageUsed: number, theme?: any): string => {
  const status = calculateBudgetStatus(percentageUsed);
  const baseColor = getBudgetStatusColor(status, theme);
  
  // Return full opacity for the filled portion
  return baseColor;
};

/**
 * Get progress bar background color
 */
export const getProgressBarBackgroundColor = (theme?: any): string => {
  return theme?.colors?.outline || '#E0E0E0';
};

/**
 * Helper function to determine if a percentage is considered high priority
 */
export const isHighPriorityBudget = (percentageUsed: number): boolean => {
  return percentageUsed >= BUDGET_THRESHOLDS.UNDER_BUDGET;
};

/**
 * Helper function to get alert level for budget status
 */
export const getBudgetAlertLevel = (status: BudgetStatus): 'info' | 'warning' | 'error' => {
  switch (status) {
    case 'under':
      return 'info';
    case 'approaching':
      return 'warning';
    case 'over':
      return 'error';
    default:
      return 'info';
  }
};