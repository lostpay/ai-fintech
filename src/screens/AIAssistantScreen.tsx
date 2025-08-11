import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, useTheme, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ChatInterface } from '../components/ai';
import { ChatProvider, useChat } from '../context/ChatContext';
import { AIServiceBackend } from '../services/ai';
import { ChatMessage } from '../types/ai';

// Inner component that uses ChatContext
function AIAssistantContent() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { addMessage, setLoading } = useChat();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const aiService = AIServiceBackend.getInstance();

  // Initialize AI service when component mounts
  React.useEffect(() => {
    aiService.initialize().catch(error => {
      console.log('AI service initialization failed:', error);
      setSnackbarMessage('AI service initialization failed - using offline mode');
      setSnackbarVisible(true);
    });
  }, [aiService]);

  // Check backend connection status
  React.useEffect(() => {
    const checkBackendStatus = async () => {
      const isConnected = await aiService.checkBackendHealth();
      if (!isConnected) {
        setSnackbarMessage('AI backend offline - limited functionality available');
        setSnackbarVisible(true);
      }
    };

    checkBackendStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, [aiService]);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    
    try {
      // Validate the message
      const validation = aiService.validateQuery(message);
      if (!validation.isValid) {
        console.error('Invalid query:', validation.error);
        setSnackbarMessage(validation.error || 'Invalid query');
        setSnackbarVisible(true);
        return;
      }

      // Process the query with enhanced embedding
      const response = await aiService.processQueryWithEmbedding(message);
      
      // Create AI response message with enhanced data
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(), // +1 to ensure different ID from user message
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        embeddedData: response.embeddedData,
        processingType: response.processingType,
        modelUsed: response.modelUsed,
        suggestedActions: response.suggestedActions
      };

      // Add AI response to conversation
      addMessage(aiMessage);
      
      // Show processing type info if using fallback
      if (response.processingType === 'on-device') {
        setSnackbarMessage('Using offline AI processing');
        setSnackbarVisible(true);
      }
      
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
        <Appbar.Content 
          title="AI Assistant" 
          subtitle={aiService.isBackendConnected() ? 'Online' : 'Offline Mode'}
        />
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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