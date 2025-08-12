import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Checkbox, 
  RadioButton, 
  Portal, 
  Modal, 
  ProgressBar,
  Switch,
  Divider
} from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDataExport } from '../../hooks/useDataExport';
import type { ExportOptions } from '../../services';
import { formatFileSize } from '../../utils/file';

export const DataExportCard: React.FC = () => {
  const { 
    isExporting, 
    progress, 
    result, 
    error, 
    exportData, 
    shareExportedFile, 
    clearResult,
    validateExportOptions 
  } = useDataExport();
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeTransactions: true,
    includeCategories: true,
    includeBudgets: true,
    includeGoals: true,
    anonymize: false,
  });

  const handleExportOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleStartExport = async () => {
    try {
      // Validate options
      const validationErrors = validateExportOptions(exportOptions);
      if (validationErrors.length > 0) {
        Alert.alert(
          'Invalid Export Options',
          validationErrors.join('\\n'),
          [{ text: 'OK' }]
        );
        return;
      }

      await exportData(exportOptions);
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleShareFile = async () => {
    if (result?.filePath) {
      try {
        await shareExportedFile(result.filePath);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleCloseModal = () => {
    setShowExportModal(false);
    clearResult();
  };

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      onDismiss={handleCloseModal}
      contentContainerStyle={styles.modal}
    >
      <View style={styles.modalContainer}>
        <Text variant="headlineSmall" style={styles.modalTitle}>
          Export Your Data
        </Text>

        <ScrollView 
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Export Format Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Export Format
            </Text>
            <RadioButton.Group
              onValueChange={(value) => handleExportOptionChange('format', value)}
              value={exportOptions.format}
            >
              <View style={styles.radioOption}>
                <RadioButton value="csv" />
                <View style={styles.radioContent}>
                  <Text variant="bodyLarge">CSV (Spreadsheet)</Text>
                  <Text variant="bodySmall" style={styles.optionDescription}>
                    Compatible with Excel, Google Sheets, and other spreadsheet applications
                  </Text>
                </View>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="json" />
                <View style={styles.radioContent}>
                  <Text variant="bodyLarge">JSON (Technical)</Text>
                  <Text variant="bodySmall" style={styles.optionDescription}>
                    Structured data format for developers and data migration
                  </Text>
                </View>
              </View>
            </RadioButton.Group>
          </View>

          <Divider style={styles.divider} />

          {/* Data Inclusion Options */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Data to Include
            </Text>
            <View style={styles.checkboxOption}>
              <Checkbox
                status={exportOptions.includeTransactions ? 'checked' : 'unchecked'}
                onPress={() => handleExportOptionChange('includeTransactions', !exportOptions.includeTransactions)}
              />
              <Text variant="bodyLarge">Transactions</Text>
            </View>
            <View style={styles.checkboxOption}>
              <Checkbox
                status={exportOptions.includeCategories ? 'checked' : 'unchecked'}
                onPress={() => handleExportOptionChange('includeCategories', !exportOptions.includeCategories)}
              />
              <Text variant="bodyLarge">Categories</Text>
            </View>
            <View style={styles.checkboxOption}>
              <Checkbox
                status={exportOptions.includeBudgets ? 'checked' : 'unchecked'}
                onPress={() => handleExportOptionChange('includeBudgets', !exportOptions.includeBudgets)}
              />
              <Text variant="bodyLarge">Budgets</Text>
            </View>
            <View style={styles.checkboxOption}>
              <Checkbox
                status={exportOptions.includeGoals ? 'checked' : 'unchecked'}
                onPress={() => handleExportOptionChange('includeGoals', !exportOptions.includeGoals)}
              />
              <Text variant="bodyLarge">Goals</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Privacy Options */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Privacy Options
            </Text>
            <View style={styles.switchOption}>
              <View style={styles.switchContent}>
                <Text variant="bodyLarge">Anonymize sensitive data</Text>
                <Text variant="bodySmall" style={styles.optionDescription}>
                  Hide credit card numbers, emails, and other sensitive information
                </Text>
              </View>
              <Switch
                value={exportOptions.anonymize}
                onValueChange={(value) => handleExportOptionChange('anonymize', value)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Export Progress */}
          {isExporting && (
            <View style={styles.progressSection}>
              <Text variant="bodyLarge" style={styles.progressText}>
                Exporting data... {Math.round(progress)}%
              </Text>
              <ProgressBar progress={progress / 100} style={styles.progressBar} />
            </View>
          )}

          {/* Export Result */}
          {result && (
            <View style={styles.resultSection}>
              {result.success ? (
                <View style={styles.successResult}>
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                  <View style={styles.resultContent}>
                    <Text variant="bodyLarge" style={styles.successText}>
                      Export completed successfully!
                    </Text>
                    <Text variant="bodySmall" style={styles.resultDetails}>
                      {result.recordCount} records exported
                      {result.fileSize && ` • ${formatFileSize(result.fileSize)}`}
                    </Text>
                    <Text variant="bodySmall" style={styles.resultDetails}>
                      File: {result.fileName}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.errorResult}>
                  <MaterialIcons name="error" size={24} color="#F44336" />
                  <Text variant="bodyLarge" style={styles.errorText}>
                    Export failed: {result.error}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Error Display */}
          {error && !result && (
            <View style={styles.errorSection}>
              <MaterialIcons name="error" size={24} color="#F44336" />
              <Text variant="bodyLarge" style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Modal Actions - Fixed at bottom */}
        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={handleCloseModal}
            style={styles.modalButton}
          >
            Close
          </Button>
          {result?.success ? (
            <Button
              mode="contained"
              onPress={handleShareFile}
              style={styles.modalButton}
            >
              Share File
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleStartExport}
              disabled={isExporting}
              loading={isExporting}
              style={styles.modalButton}
            >
              Start Export
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.header}>
            <MaterialIcons name="download" size={24} color="#2196F3" />
            <View style={styles.headerContent}>
              <Text variant="titleMedium" style={styles.title}>
                Export Data
              </Text>
              <Text variant="bodyMedium" style={styles.description}>
                Download your financial data for backup or analysis
              </Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="outlined"
            onPress={() => setShowExportModal(true)}
            style={styles.exportButton}
          >
            Export Data
          </Button>
        </Card.Actions>
      </Card>

      <Portal>
        {renderExportModal()}
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    opacity: 0.7,
  },
  exportButton: {
    marginLeft: 8,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioContent: {
    flex: 1,
    marginLeft: 8,
  },
  optionDescription: {
    opacity: 0.7,
    marginTop: 2,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  progressSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
  },
  resultSection: {
    marginBottom: 20,
  },
  successResult: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
  },
  resultContent: {
    flex: 1,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDetails: {
    opacity: 0.8,
    marginBottom: 2,
  },
  errorResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
  },
  errorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#F44336',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
  },
});