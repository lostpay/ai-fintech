import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

// Import the reference data
import referenceData from '../../reference/financeflow_export_20250812.json';

interface ImportStats {
  transactions: number;
  categories: number;
  budgets: number;
}

export const DataImportUtility: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);

  const checkCurrentData = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const currentStats = await dbService.getMigrationStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Error checking current data:', error);
      Alert.alert('Error', 'Failed to check current data');
    }
  };

  const importReferenceData = async () => {
    try {
      setIsImporting(true);
      
      Alert.alert(
        'Import Reference Data',
        'This will replace all current data with the reference data from your phone. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'destructive',
            onPress: async () => {
              try {
                const dbService = DatabaseService.getInstance();
                await dbService.importReferenceData(referenceData);
                
                // Refresh stats
                await checkCurrentData();
                
                Alert.alert('Success', 'Reference data imported successfully!');
              } catch (error) {
                console.error('Import failed:', error);
                Alert.alert('Error', `Failed to import data: ${error}`);
              } finally {
                setIsImporting(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      setIsImporting(false);
      Alert.alert('Error', 'Failed to start import process');
    }
  };

  React.useEffect(() => {
    checkCurrentData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Management</Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Current Database:</Text>
        {stats ? (
          <View>
            <Text style={styles.statsText}>Transactions: {stats.transactions}</Text>
            <Text style={styles.statsText}>Categories: {stats.categories}</Text>
            <Text style={styles.statsText}>Budgets: {stats.budgets}</Text>
          </View>
        ) : (
          <Text style={styles.statsText}>Loading...</Text>
        )}
      </View>

      <View style={styles.referenceContainer}>
        <Text style={styles.statsTitle}>Reference Data Available:</Text>
        <Text style={styles.statsText}>Transactions: {referenceData.metadata.recordCounts.transactions}</Text>
        <Text style={styles.statsText}>Categories: {referenceData.metadata.recordCounts.categories}</Text>
        <Text style={styles.statsText}>Budgets: {referenceData.metadata.recordCounts.budgets}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isImporting && styles.buttonDisabled]}
        onPress={importReferenceData}
        disabled={isImporting}
      >
        <Text style={styles.buttonText}>
          {isImporting ? 'Importing...' : 'Import Reference Data'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={checkCurrentData}
      >
        <Text style={styles.refreshButtonText}>Refresh Stats</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  referenceContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});