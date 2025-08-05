import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Budget Tracker</ThemedText>
      </ThemedView>
      <ThemedView style={styles.contentContainer}>
        <ThemedText type="subtitle">Welcome to Your Personal Budget Tracker</ThemedText>
        <ThemedText>
          Track your expenses, manage budgets, and reach your financial goals.
        </ThemedText>
        <ThemedText>
          Database integration complete - ready for expense tracking features!
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  contentContainer: {
    gap: 16,
    paddingHorizontal: 20,
  },
});
