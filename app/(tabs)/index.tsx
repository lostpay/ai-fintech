import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function HomeTab() {
  // This file is not used when using React Navigation
  // The actual HomeScreen is in src/screens/HomeScreen.tsx
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Home Tab (Expo Router)</ThemedText>
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