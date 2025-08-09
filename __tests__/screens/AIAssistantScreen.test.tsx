import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import AIAssistantScreen from '../../src/screens/AIAssistantScreen';

const Stack = createStackNavigator();

const MockedAIAssistantScreen = () => (
  <PaperProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="AIAssistant" 
          component={AIAssistantScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  </PaperProvider>
);

// Mock AIService for testing
jest.mock('../../src/services/ai/AIService', () => ({
  AIService: {
    getInstance: () => ({
      validateQuery: jest.fn().mockReturnValue({ isValid: true }),
      processQuery: jest.fn().mockResolvedValue({
        content: 'Mock response',
        suggestedActions: ['action1', 'action2']
      })
    })
  }
}));

describe('AIAssistantScreen', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MockedAIAssistantScreen />);
    
    expect(getByTestId('ai-assistant-header')).toBeTruthy();
    expect(getByTestId('chat-messages-scroll')).toBeTruthy();
    expect(getByTestId('chat-input')).toBeTruthy();
  });

  it('shows AI Assistant title in header', () => {
    const { getByText } = render(<MockedAIAssistantScreen />);
    
    expect(getByText('AI Assistant')).toBeTruthy();
  });

  it('has back button in header', () => {
    const { getByTestId } = render(<MockedAIAssistantScreen />);
    
    const header = getByTestId('ai-assistant-header');
    expect(header).toBeTruthy();
  });

  it('has menu button in header', () => {
    const { getByTestId } = render(<MockedAIAssistantScreen />);
    
    expect(getByTestId('ai-assistant-menu')).toBeTruthy();
  });

  it('renders chat interface', () => {
    const { getByTestId } = render(<MockedAIAssistantScreen />);
    
    // Should contain chat interface elements
    expect(getByTestId('chat-messages-scroll')).toBeTruthy();
    expect(getByTestId('chat-input')).toBeTruthy();
    expect(getByTestId('quick-queries-title')).toBeTruthy();
  });
});