import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../types/ai';
import { useChat } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import QuickQueryButtons from './QuickQueryButtons';
import AILoadingIndicator from './AILoadingIndicator';

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ChatInterface({ 
  onSendMessage, 
  isLoading: externalLoading = false 
}: ChatInterfaceProps) {
  const theme = useTheme();
  const { state, addMessage, setLoading } = useChat();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Use chat context loading state or external loading prop
  const isLoading = state.isLoading || externalLoading;
  const messages = state.currentConversation?.messages || [];

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      role: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    // Add user message to conversation
    addMessage(userMessage);
    setInputText('');

    if (onSendMessage) {
      try {
        await onSendMessage(userMessage.content);
      } catch (error) {
        // Handle error - could add error message to chat
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleQuickQuery = async (query: string) => {
    if (isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: query,
      role: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    // Add user message to conversation
    addMessage(userMessage);

    if (onSendMessage) {
      try {
        await onSendMessage(query);
      } catch (error) {
        console.error('Failed to send quick query:', error);
      }
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        testID="chat-messages-scroll"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            testID={`message-${message.id}`}
          />
        ))}
        
        {isLoading && <AILoadingIndicator />}
      </ScrollView>

      <QuickQueryButtons onQuickQuery={handleQuickQuery} disabled={isLoading} />

      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your finances..."
          mode="outlined"
          style={styles.textInput}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          disabled={isLoading}
          testID="chat-input"
          right={
            <TextInput.Icon
              icon={() => (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && !isLoading ? theme.colors.primary : theme.colors.onSurfaceDisabled || '#666'}
                />
              )}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: 16,
  },
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    elevation: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    maxHeight: 100,
  },
});