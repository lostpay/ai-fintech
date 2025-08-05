import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, BackHandler } from 'react-native';

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

  return (
    <NavigationContainer 
      initialState={initialState}
      onStateChange={handleStateChange}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#1976D2', // Material Design Primary Blue
          tabBarInactiveTintColor: '#757575', // Material Design Grey
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E0E0E0',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 60,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
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
            tabBarTestID: 'home-tab',
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
            tabBarTestID: 'add-tab',
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
            tabBarTestID: 'history-tab',
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
            tabBarTestID: 'settings-tab',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};