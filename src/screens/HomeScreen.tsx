import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-elements';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Screen initialization placeholder
  }, []);

  return (
    <View style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text h2 style={styles.title}>Budget Tracker</Text>
        <Text h4 style={styles.subtitle}>Welcome to Your Personal Budget Tracker</Text>
        <Text style={styles.description}>
          Track your expenses, manage budgets, and reach your financial goals.
        </Text>
        <Text style={styles.status}>
          Navigation system ready - Home Screen loaded successfully!
        </Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Material Design background
    padding: 16,
  },
  card: {
    borderRadius: 8,
    margin: 0,
    marginTop: 20,
  },
  title: {
    textAlign: 'center',
    color: '#1976D2',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    color: '#424242',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
    lineHeight: 24,
  },
  status: {
    textAlign: 'center',
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
});