/**
 * Navigation Type Definitions
 * Defines TypeScript types for React Navigation to ensure type-safe navigation
 */

export type RootTabParamList = {
  Home: undefined;
  Add: undefined;
  Budget: undefined;
  History: undefined;
  Settings: undefined;
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

// Type for navigation prop in components
export type NavigationProp = {
  navigate: (screen: TabScreenNames, params?: any) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  reset: (state: any) => void;
};