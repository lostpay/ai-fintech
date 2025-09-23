import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, BackHandler } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Import screen components
import { 
  HomeScreen, 
  AddExpenseScreen, 
  BudgetScreen,
  HistoryScreen, 
  SettingsScreen,
  CategoriesScreen,
  BudgetAnalyticsScreen
} from '../screens';
import { CategoryFormScreen } from '../screens/CategoryFormScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import SimpleChatScreen from '../screens/SimpleChatScreen';

// Import types
import type { RootTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Main Tab Navigator Component
const MainTabNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 100 : 115,
          paddingBottom: Platform.OS === 'ios' ? 25 : 35,
          paddingTop: 12,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
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
        name="Chatbot"
        component={SimpleChatScreen}
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons
              name="chat"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons 
              name="account-balance-wallet" 
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
  );
};

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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainTabNavigator} 
        />
        <Stack.Screen 
          name="Categories" 
          component={CategoriesScreen}
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: {
              color: theme.colors.onSurface,
            },
          }}
        />
        <Stack.Screen 
          name="CategoryForm" 
          component={CategoryFormScreen}
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: {
              color: theme.colors.onSurface,
            },
          }}
        />
        <Stack.Screen 
          name="BudgetAnalytics" 
          component={BudgetAnalyticsScreen}
          options={{
            headerShown: false, // Screen handles its own header
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="AIAssistant"
          component={SimpleChatScreen}
          options={{
            headerShown: false, // Screen handles its own header
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};