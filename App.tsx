import 'react-native-reanimated';
import React from 'react';
import { ThemeProvider } from './src/context';
import { AppNavigator } from './src/navigation';

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}