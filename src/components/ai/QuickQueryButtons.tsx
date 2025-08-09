import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';

interface QuickQueryButtonsProps {
  onQuickQuery: (query: string) => void;
  disabled?: boolean;
}

const QUICK_QUERIES = [
  { label: 'Monthly Summary', query: 'Show me my spending summary for this month' },
  { label: 'Budget Status', query: 'How am I doing with my budgets?' },
  { label: 'Top Categories', query: 'What are my top spending categories?' },
  { label: 'Recent Trends', query: 'Show me my recent spending trends' },
];

export default function QuickQueryButtons({ 
  onQuickQuery, 
  disabled = false 
}: QuickQueryButtonsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text 
        variant="titleMedium" 
        style={[styles.title, { color: theme.colors.onBackground }]}
        testID="quick-queries-title"
      >
        Quick Questions
      </Text>
      <Text 
        variant="bodyMedium" 
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        testID="quick-queries-subtitle"
      >
        Tap a suggestion or type your own question
      </Text>
      
      <View style={styles.chipsContainer}>
        {QUICK_QUERIES.map((item, index) => (
          <Chip
            key={index}
            mode="outlined"
            onPress={() => !disabled && onQuickQuery(item.query)}
            style={styles.chip}
            disabled={disabled}
            testID={`quick-query-${index}`}
          >
            {item.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    margin: 4,
  },
});