import type { RootTabParamList, TabScreenNames } from '../../../src/navigation/types';

describe('Navigation Types', () => {
  it('defines correct tab parameter list structure', () => {
    // Type-only test - if this compiles, the types are correct
    const mockParamList: RootTabParamList = {
      Home: undefined,
      Add: undefined,
      History: undefined,
      Settings: undefined,
    };

    expect(Object.keys(mockParamList)).toEqual(['Home', 'Add', 'History', 'Settings']);
  });

  it('defines correct tab screen names type', () => {
    // Type-only test - if this compiles, the types are correct
    const homeScreen: TabScreenNames = 'Home';
    const addScreen: TabScreenNames = 'Add';
    const historyScreen: TabScreenNames = 'History';
    const settingsScreen: TabScreenNames = 'Settings';

    expect([homeScreen, addScreen, historyScreen, settingsScreen]).toEqual([
      'Home', 'Add', 'History', 'Settings'
    ]);
  });

  it('ensures type safety for navigation parameters', () => {
    // This test ensures our types are correctly defined
    // If there were parameters required, TypeScript would catch any mismatches
    const validRoutes: RootTabParamList = {
      Home: undefined,
      Add: undefined,
      History: undefined,
      Settings: undefined,
    };

    // Test passes if compilation succeeds
    expect(validRoutes).toBeDefined();
  });
});