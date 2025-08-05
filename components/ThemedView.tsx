import React from 'react';
import { View, ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  return <View style={[{ backgroundColor: '#fff' }, style]} {...otherProps} />;
}