import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DatabaseService } from './DatabaseService';
import { TransactionWithCategory } from '../types/Transaction';
import { Category } from '../types/Category';
// Note: package.json import removed due to TypeScript configuration
// Version will be retrieved from app info if needed

export class DataExportService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Export transactions to CSV format
   */
  async exportTransactionsToCSV(startDate?: Date, endDate?: Date): Promise<string> {
    try {
      const transactions = await this.databaseService.getTransactionsWithCategories();
      
      const filteredTransactions = this.filterTransactionsByDate(transactions, startDate, endDate);

      const csvHeader = 'Date,Description,Amount,Category,Type\n';
      const csvRows = filteredTransactions.map(transaction => {
        const date = transaction.date.toLocaleDateString();
        const amount = (transaction.amount / 100).toFixed(2);
        const description = `"${transaction.description.replace(/"/g, '""')}"`;
        const category = `"${transaction.category_name.replace(/"/g, '""')}"`;
        return `"${date}",${description},"$${amount}",${category},"${transaction.transaction_type}"`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      
      // Save to file
      const fileName = `financeflow_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return fileUri;
    } catch (error) {
      throw new Error(`CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export transactions and categories to JSON format
   */
  async exportTransactionsToJSON(startDate?: Date, endDate?: Date): Promise<string> {
    try {
      const [transactions, categories] = await Promise.all([
        this.databaseService.getTransactionsWithCategories(),
        this.databaseService.getCategories(),
      ]);

      const filteredTransactions = this.filterTransactionsByDate(transactions, startDate, endDate);

      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0', // Static version for now
        transactions: filteredTransactions.map(transaction => ({
          ...transaction,
          date: transaction.date.toISOString(),
          created_at: transaction.created_at.toISOString(),
          updated_at: transaction.updated_at.toISOString(),
          amount_dollars: (transaction.amount / 100).toFixed(2),
        })),
        categories: categories,
        summary: {
          totalTransactions: filteredTransactions.length,
          totalAmount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
          totalAmountDollars: (filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / 100).toFixed(2),
          dateRange: {
            start: startDate?.toISOString() || null,
            end: endDate?.toISOString() || null,
          },
          transactionsByType: {
            expense: filteredTransactions.filter(t => t.transaction_type === 'expense').length,
            income: filteredTransactions.filter(t => t.transaction_type === 'income').length,
          },
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      
      // Save to file
      const fileName = `financeflow_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);
      
      return fileUri;
    } catch (error) {
      throw new Error(`JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Share exported file using the device's sharing capabilities
   */
  async shareExportFile(fileUri: string): Promise<void> {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileUri.endsWith('.csv') ? 'text/csv' : 'application/json',
          dialogTitle: 'Share Transaction Export',
        });
      } else {
        throw new Error('Sharing not available on this device');
      }
    } catch (error) {
      throw new Error(`Share failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file info for exported files
   */
  async getExportFileInfo(fileUri: string): Promise<{ size: number; exists: boolean }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return {
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        exists: fileInfo.exists,
      };
    } catch (error) {
      return { size: 0, exists: false };
    }
  }

  /**
   * Delete exported file
   */
  async deleteExportFile(fileUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch (error) {
      console.warn('Failed to delete export file:', error);
    }
  }

  /**
   * Filter transactions by date range
   */
  private filterTransactionsByDate(
    transactions: TransactionWithCategory[], 
    startDate?: Date, 
    endDate?: Date
  ): TransactionWithCategory[] {
    return transactions.filter(transaction => {
      if (startDate && transaction.date < startDate) return false;
      if (endDate && transaction.date > endDate) return false;
      return true;
    });
  }

  /**
   * Get export summary without creating files
   */
  async getExportSummary(startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number;
    totalAmount: number;
    dateRange: { start: string | null; end: string | null };
    transactionsByType: { expense: number; income: number };
  }> {
    try {
      const transactions = await this.databaseService.getTransactionsWithCategories();
      const filteredTransactions = this.filterTransactionsByDate(transactions, startDate, endDate);

      return {
        totalTransactions: filteredTransactions.length,
        totalAmount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
        dateRange: {
          start: startDate?.toISOString() || null,
          end: endDate?.toISOString() || null,
        },
        transactionsByType: {
          expense: filteredTransactions.filter(t => t.transaction_type === 'expense').length,
          income: filteredTransactions.filter(t => t.transaction_type === 'income').length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get export summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}