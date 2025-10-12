import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, BackHandler, View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

// Import screen components
import {
  HomeScreen,
  AddExpenseScreen,
  BudgetScreen,
  HistoryScreen,
  SettingsScreen,
  CategoriesScreen,
  EditTransactionScreen,
  LoginScreen,
  SignUpScreen,
  ForgotPasswordScreen,
} from '../screens';
import { CategoryFormScreen } from '../screens/CategoryFormScreen';
import SimpleChatScreen from '../screens/SimpleChatScreen';

// Import types
import type { RootTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator();

// Auth Stack Navigator Component
const AuthStackNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

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
  const { user, loading: authLoading } = useAuth();
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

  // Handle deep links for email verification and password reset
  useEffect(() => {
    // Handle initial URL when app is opened from a link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      console.log('Deep link received:', url);

      // Parse the URL
      const { path, queryParams } = Linking.parse(url);

      // Handle email verification
      if (path === 'auth/callback' || url.includes('auth/v1/verify')) {
        const token = queryParams?.token as string;
        const type = queryParams?.type as string;

        if (token && type === 'signup') {
          // Supabase will automatically handle the email verification
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (error) {
            console.error('Email verification error:', error);
          } else {
            console.log('Email verified successfully');
          }
        }
      }

      // Handle password reset
      if (path === 'auth/reset-password' || url.includes('type=recovery')) {
        // The password reset will be handled automatically by Supabase
        // You can add a custom screen here if needed
        console.log('Password reset link detected');
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

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

  if (!isReady || authLoading) {
    // Show loading screen while restoring state or checking auth
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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
        {user ? (
          // Authenticated user screens
          <>
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
              name="EditTransaction"
              component={EditTransactionScreen}
              options={{
                headerShown: false,
                presentation: 'modal',
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
            <Stack.Screen
              name="Add"
              component={AddExpenseScreen}
              options={{
                headerShown: false, // Screen handles its own header
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          // Authentication screens
          <Stack.Screen
            name="Auth"
            component={AuthStackNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};