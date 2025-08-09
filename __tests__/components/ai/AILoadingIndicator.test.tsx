import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import AILoadingIndicator from '../../../src/components/ai/AILoadingIndicator';

const MockedAILoadingIndicator = () => (
  <PaperProvider>
    <AILoadingIndicator />
  </PaperProvider>
);

describe('AILoadingIndicator', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MockedAILoadingIndicator />);
    
    expect(getByTestId('ai-loading-indicator')).toBeTruthy();
    expect(getByTestId('ai-loading-text')).toBeTruthy();
  });

  it('displays correct loading text', () => {
    const { getByTestId } = render(<MockedAILoadingIndicator />);
    
    const loadingText = getByTestId('ai-loading-text');
    expect(loadingText.props.children).toBe('AI is thinking...');
  });

  it('has proper styling structure', () => {
    const { getByTestId } = render(<MockedAILoadingIndicator />);
    
    const indicator = getByTestId('ai-loading-indicator');
    expect(indicator).toBeTruthy();
    
    // Should render without throwing errors - animation testing would require more complex setup
  });
});