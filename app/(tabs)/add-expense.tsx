import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function AddExpenseTab() {
  // This file is not used when using React Navigation
  // The actual AddExpenseScreen is in src/screens/AddExpenseScreen.tsx
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Add Expense Tab (Expo Router)</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});