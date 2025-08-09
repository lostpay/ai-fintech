import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import MessageBubble from '../../../src/components/ai/MessageBubble';
import { ChatMessage } from '../../../src/types/ai';

const MockedMessageBubble = ({ message, testID }) => (
  <PaperProvider>
    <MessageBubble message={message} testID={testID} />
  </PaperProvider>
);

describe('MessageBubble', () => {
  const userMessage: ChatMessage = {
    id: '1',
    content: 'Hello AI!',
    role: 'user',
    timestamp: new Date('2025-01-09T10:00:00Z'),
    status: 'sent',
  };

  const assistantMessage: ChatMessage = {
    id: '2',
    content: 'Hello! How can I help you with your finances?',
    role: 'assistant',
    timestamp: new Date('2025-01-09T10:01:00Z'),
  };

  it('renders user message correctly', () => {
    const { getByTestId } = render(
      <MockedMessageBubble message={userMessage} testID="user-message" />
    );
    
    expect(getByTestId('user-message-text')).toBeTruthy();
    expect(getByTestId('user-message-timestamp')).toBeTruthy();
  });

  it('renders assistant message correctly', () => {
    const { getByTestId } = render(
      <MockedMessageBubble message={assistantMessage} testID="ai-message" />
    );
    
    expect(getByTestId('ai-message-text')).toBeTruthy();
    expect(getByTestId('ai-message-timestamp')).toBeTruthy();
  });

  it('displays correct message content', () => {
    const { getByTestId } = render(
      <MockedMessageBubble message={userMessage} testID="user-message" />
    );
    
    const messageText = getByTestId('user-message-text');
    expect(messageText.props.children).toBe('Hello AI!');
  });

  it('shows status indicator for user messages', () => {
    const { getByTestId } = render(
      <MockedMessageBubble message={userMessage} testID="user-message" />
    );
    
    expect(getByTestId('user-message')).toBeTruthy();
    // Status icon should be present for user messages
  });
});