import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        testID="quick-queries-scroll"
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    marginRight: 8,
  },
});