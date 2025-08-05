/**
 * Sticky Date Header Component for Transaction Groups
 * Story 2.4: Date grouping and section headers
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';

interface StickyDateHeaderProps {
  date: string;
  transactionCount?: number;
}

export const StickyDateHeader: React.FC<StickyDateHeaderProps> = ({ 
  date, 
  transactionCount 
}) => {
  return (
    <Surface style={styles.headerContainer} elevation={1}>
      <View style={styles.headerContent}>
        <Text variant="titleSmall" style={styles.headerText}>
          {date}
        </Text>
        {transactionCount && (
          <Text variant="bodySmall" style={styles.countText}>
            {transactionCount} transaction{transactionCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#F7F2FA', // Material Design surface-container-highest
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0EC', // Material Design outline-variant
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    color: '#1C1B1F', // Material Design on-surface
    fontWeight: '600',
  },
  countText: {
    color: '#49454F', // Material Design on-surface-variant
  },
});