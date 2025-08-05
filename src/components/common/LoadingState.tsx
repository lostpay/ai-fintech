import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-elements';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading dashboard...',
  size = 'large',
}) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size={size} 
        color="#1976D2" // Material Design primary color
        style={styles.spinner}
      />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FAFAFA', // Material Design surface
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Roboto',
    color: '#757575', // Material Design secondary text
    textAlign: 'center',
  },
});