import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

export const AboutSection: React.FC = () => (
  <View style={styles.aboutContainer}>
    <Card style={styles.aboutCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          About FinanceFlow
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          FinanceFlow is a comprehensive personal expense tracking application built with React Native 
          and modern mobile development best practices. This academic project demonstrates advanced 
          UI/UX implementation using Material Design 3 principles.
        </Text>
        
        <Text variant="titleSmall" style={styles.subsectionTitle}>
          Learning Objectives
        </Text>
        <Text variant="bodySmall" style={styles.objectives}>
          • React Native 0.79+ with Expo SDK 53{'\n'}
          • Material Design 3 implementation{'\n'}
          • SQLite database integration{'\n'}
          • TypeScript best practices{'\n'}
          • Mobile UX/UI design patterns
        </Text>
        
        <Text variant="titleSmall" style={styles.subsectionTitle}>
          Technology Stack
        </Text>
        <Text variant="bodySmall" style={styles.techStack}>
          React Native • TypeScript • Expo • SQLite • Material Design 3
        </Text>
        
        <Text variant="titleSmall" style={styles.subsectionTitle}>
          Privacy & Data
        </Text>
        <Text variant="bodySmall" style={styles.privacy}>
          All financial data is stored locally on your device. No data is transmitted to external 
          servers. You have full control over your financial information.
        </Text>
      </Card.Content>
    </Card>
  </View>
);

const styles = StyleSheet.create({
  aboutContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  aboutCard: {
    padding: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#1976D2',
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    color: '#424242',
  },
  objectives: {
    lineHeight: 18,
    marginBottom: 8,
  },
  techStack: {
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  privacy: {
    lineHeight: 18,
    color: '#616161',
  },
});