// Test setup configuration
// Configure testing environment here

import '@testing-library/react-native/extend-expect';

// Mock expo modules if needed
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(),
      finalizeSync: jest.fn(),
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
