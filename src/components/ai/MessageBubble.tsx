import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, Icon } from 'react-native-paper';
import { ChatMessage } from '../../types/ai';

interface MessageBubbleProps {
  message: ChatMessage;
  testID?: string;
}

export default function MessageBubble({ message, testID }: MessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  const getBubbleStyle = () => {
    if (isUser) {
      return {
        backgroundColor: theme.colors.primary,
        alignSelf: 'flex-end' as const,
        marginLeft: 50,
      };
    }
    return {
      backgroundColor: theme.colors.surfaceVariant,
      alignSelf: 'flex-start' as const,
      marginRight: 50,
    };
  };

  const getTextColor = () => {
    return isUser ? theme.colors.onPrimary : theme.colors.onSurfaceVariant;
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = () => {
    if (!isUser || !message.status) return null;
    
    switch (message.status) {
      case 'sending':
        return <Icon source="clock-outline" size={12} color={theme.colors.onPrimary} />;
      case 'sent':
        return <Icon source="check" size={12} color={theme.colors.onPrimary} />;
      case 'error':
        return <Icon source="alert-circle" size={12} color={theme.colors.error} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.messageContainer} testID={testID}>
      <Card style={[styles.bubble, getBubbleStyle()]}>
        <Card.Content style={styles.content}>
          <Text 
            style={[styles.messageText, { color: getTextColor() }]}
            testID={`${testID}-text`}
          >
            {message.content}
          </Text>
          
          <View style={styles.metaInfo}>
            <Text 
              style={[styles.timestamp, { color: getTextColor() }]}
              testID={`${testID}-timestamp`}
            >
              {formatTime(message.timestamp)}
            </Text>
            {getStatusIcon()}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
  },
  bubble: {
    maxWidth: '80%',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.8,
  },
});