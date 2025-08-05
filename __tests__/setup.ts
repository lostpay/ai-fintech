// Test setup configuration  
// Configure testing environment here

import '@testing-library/react-native/extend-expect';
import '@testing-library/jest-native/extend-expect';

// Mock expo modules if needed
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
    closeAsync: jest.fn(() => Promise.resolve()),
    prepareAsync: jest.fn(() => Promise.resolve({
      executeAsync: jest.fn(() => Promise.resolve()),
      finalizeAsync: jest.fn(() => Promise.resolve()),
    })),
  })),
}));

// Setup global test configuration
beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllMocks();
});
