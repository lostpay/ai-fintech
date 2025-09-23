/**
 * Navigation Type Definitions
 * Defines TypeScript types for React Navigation to ensure type-safe navigation
 */

import type { Category } from '../types/Category';

export type RootTabParamList = {
  Home: undefined;
  Chatbot: undefined;
  Budget: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Categories: undefined;
  CategoryForm: { 
    mode: 'create' | 'edit'; 
    category?: Category 
  };
  BudgetAnalytics: undefined;
  AIAssistant: undefined;
};

// Helper type for screens props
export type ScreenProps = {
  navigation: any; // Will be properly typed with navigation props
  route: any; // Will be properly typed with route props
};

// Navigation state persistence types
export type NavigationState = {
  key: string;
  index: number;
  routeNames: string[];
  routes: {
    key: string;
    name: string;
    params?: object;
  }[];
};

// Screen parameter types for type-safe navigation
export type TabScreenNames = keyof RootTabParamList;
export type StackScreenNames = keyof RootStackParamList;

// Type for navigation prop in components
export type NavigationProp = {
  navigate: (screen: TabScreenNames | StackScreenNames, params?: any) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  reset: (state: any) => void;
};