import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, BackHandler } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Import screen components
import { 
  HomeScreen, 
  AddExpenseScreen, 
  HistoryScreen, 
  SettingsScreen 
} from '../screens';

// Import types
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const AppNavigator: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

  useEffect(() => {
    const restoreState = async () => {
      try {
        // For now, we'll prepare for state persistence without external storage
        // This can be enhanced with expo-sqlite/kv-store in future iterations
        setIsReady(true);
      } catch (e) {
        console.log('Failed to restore navigation state:', e);
        setIsReady(true);
      }
    };

    restoreState();
  }, []);

  // Android hardware back button handling
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // For bottom tab navigation, let the default behavior handle back button
        // This ensures proper app backgrounding when user presses back from home tab
        return false; // Allow default behavior
      });

      return () => backHandler.remove();
    }
  }, []);

  const handleStateChange = (state: any) => {
    // Prepare for state persistence - can be enhanced with storage later
    // For now, we maintain state in memory during app session
  };

  if (!isReady) {
    return null; // Show loading screen while restoring state
  }

  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
    },
  };

  return (
    <NavigationContainer 
      initialState={initialState}
      onStateChange={handleStateChange}
      theme={navigationTheme}
    >
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={theme.colors.surface}
      />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 100 : 75,
            paddingBottom: Platform.OS === 'ios' ? 25 : 15,
            paddingTop: 12,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          headerShown: false, // Hide headers for clean tab navigation
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="home" 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tab.Screen
          name="Add"
          component={AddExpenseScreen}
          options={{
            title: 'Add',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="add-circle" 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="history" 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="settings" 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};