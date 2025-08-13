import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { DatabaseTester } from '../utils/testDatabase';
import { DataImportUtility } from '../components/DataImportUtility';
import { DatabaseService } from '../services/DatabaseService';

export const DatabaseTestScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [showImporter, setShowImporter] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runBasicTest = async () => {
    setIsLoading(true);
    clearResults();
    
    try {
      addResult('Starting database connection test...');
      
      // Capture console logs
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (message: any) => {
        addResult(`LOG: ${message}`);
        originalLog(message);
      };
      
      console.error = (message: any) => {
        addResult(`ERROR: ${message}`);
        originalError(message);
      };
      
      await DatabaseTester.testDatabaseConnection();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      addResult('✅ Database test completed successfully!');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
      Alert.alert('Test Failed', `Database test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runIntegrityTest = async () => {
    setIsLoading(true);
    
    try {
      addResult('Starting data integrity verification...');
      
      // Capture console logs
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (message: any) => {
        addResult(`LOG: ${message}`);
        originalLog(message);
      };
      
      console.error = (message: any) => {
        addResult(`ERROR: ${message}`);
        originalError(message);
      };
      
      await DatabaseTester.verifyDataIntegrity();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      addResult('✅ Data integrity verification completed!');
      
    } catch (error) {
      addResult(`❌ Integrity test failed: ${error}`);
      Alert.alert('Test Failed', `Data integrity test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runMigrationTest = async () => {
    setIsLoading(true);
    
    try {
      addResult('Starting database migration test...');
      
      Alert.alert(
        'Migration Test',
        'This will reset and migrate the database. All current data will be lost. Continue?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: async () => {
              try {
                const dbService = DatabaseService.getInstance();
                
                addResult('Resetting database...');
                await dbService.resetDatabase();
                addResult('✅ Database reset completed');
                
                addResult('Re-initializing database...');
                await dbService.initialize();
                addResult('✅ Database re-initialized');
                
                addResult('✅ Migration test completed successfully!');
              } catch (error) {
                addResult(`❌ Migration test failed: ${error}`);
                Alert.alert('Migration Failed', `Migration test failed: ${error}`);
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      addResult(`❌ Migration test failed: ${error}`);
      Alert.alert('Test Failed', `Migration test failed: ${error}`);
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Testing Utility</Text>
      
      <Text style={styles.description}>
        This screen helps test the new single database setup where both frontend 
        and backend use the same SQLite database.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runBasicTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run Database Connection Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={runIntegrityTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run Data Integrity Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.migrationButton]}
          onPress={runMigrationTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run Migration Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.utilityButton]}
          onPress={() => setShowImporter(!showImporter)}
        >
          <Text style={styles.buttonText}>
            {showImporter ? 'Hide' : 'Show'} Data Import Utility
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {showImporter && (
        <View style={styles.importerContainer}>
          <DataImportUtility />
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Running tests...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text 
            key={index} 
            style={[
              styles.resultText,
              result.includes('ERROR') && styles.errorText,
              result.includes('✅') && styles.successText,
              result.includes('⚠️') && styles.warningText
            ]}
          >
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  migrationButton: {
    backgroundColor: '#E91E63',
  },
  utilityButton: {
    backgroundColor: '#FF9800',
  },
  clearButton: {
    backgroundColor: '#607D8B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    minHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  errorText: {
    color: '#F44336',
  },
  successText: {
    color: '#4CAF50',
  },
  warningText: {
    color: '#FF9800',
  },
});