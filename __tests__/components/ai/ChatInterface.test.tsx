import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ChatInterface from '../../../src/components/ai/ChatInterface';

const MockedChatInterface = ({ onSendMessage, isLoading = false }) => (
  <PaperProvider>
    <ChatInterface onSendMessage={onSendMessage} isLoading={isLoading} />
  </PaperProvider>
);

describe('ChatInterface', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MockedChatInterface />);
    
    expect(getByTestId('chat-messages-scroll')).toBeTruthy();
    expect(getByTestId('chat-input')).toBeTruthy();
  });

  it('shows quick query buttons when no messages', () => {
    const { getByTestId } = render(<MockedChatInterface />);
    
    expect(getByTestId('quick-queries-title')).toBeTruthy();
    expect(getByTestId('quick-query-0')).toBeTruthy();
  });

  it('calls onSendMessage when sending a message', async () => {
    const mockSendMessage = jest.fn();
    const { getByTestId } = render(
      <MockedChatInterface onSendMessage={mockSendMessage} />
    );
    
    const input = getByTestId('chat-input');
    fireEvent.changeText(input, 'Test message');
    fireEvent(input, 'submitEditing');
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('disables input when loading', () => {
    const { getByTestId } = render(
      <MockedChatInterface isLoading={true} />
    );
    
    const input = getByTestId('chat-input');
    expect(input.props.editable).toBe(false);
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = render(
      <MockedChatInterface isLoading={true} />
    );
    
    expect(getByTestId('ai-loading-indicator')).toBeTruthy();
  });
});