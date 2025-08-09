import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ChatInterface } from '../components/ai';
import { ChatProvider, useChat } from '../context/ChatContext';
import { AIService } from '../services/ai';
import { ChatMessage } from '../types/ai';

// Inner component that uses ChatContext
function AIAssistantContent() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { addMessage, setLoading } = useChat();

  const aiService = AIService.getInstance();

  // Initialize AI service when component mounts
  React.useEffect(() => {
    aiService.initialize().catch(error => {
      console.log('AI service initialization failed:', error);
    });
  }, [aiService]);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    
    try {
      // Validate the message
      const validation = aiService.validateQuery(message);
      if (!validation.isValid) {
        console.error('Invalid query:', validation.error);
        return;
      }

      // Process the query
      const response = await aiService.processQuery(message);
      
      // Create AI response message
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(), // +1 to ensure different ID from user message
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
      };

      // Add AI response to conversation
      addMessage(aiMessage);
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message to conversation
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header
        style={{ backgroundColor: theme.colors.surface }}
        testID="ai-assistant-header"
      >
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="AI Assistant" />
        <Appbar.Action 
          icon="dots-vertical" 
          onPress={() => {
            // TODO: Add menu options (clear chat, settings, etc.)
          }}
          testID="ai-assistant-menu"
        />
      </Appbar.Header>

      <ChatInterface 
        onSendMessage={handleSendMessage}
      />
    </View>
  );
}

// Main component that provides ChatContext
export default function AIAssistantScreen() {
  return (
    <ChatProvider>
      <AIAssistantContent />
    </ChatProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});