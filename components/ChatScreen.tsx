import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import chatbotService, { ChatMessage } from '../src/services/chatbotService';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChatHistory();
    checkServiceHealth();
  }, []);

  const loadChatHistory = async () => {
    const history = await chatbotService.getChatHistory();
    setMessages(history);
  };

  const checkServiceHealth = async () => {
    const isHealthy = await chatbotService.checkHealth();
    if (!isHealthy) {
      Alert.alert(
        '服务连接失败',
        '无法连接到聊天服务，请检查网络连接或稍后重试。',
        [{ text: '确定' }]
      );
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage(inputText);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        data: response.data,
        sources: response.sources,
        confidence: response.confidence,
      };

      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);
      await chatbotService.saveChatHistory(updatedMessages);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('发送失败', '消息发送失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    Alert.alert(
      '清除聊天记录',
      '确定要清除所有聊天记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            await chatbotService.clearChatHistory();
            setMessages([]);
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.botMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>
          {item.confidence !== undefined && item.confidence < 0.5 && (
            <Text style={styles.lowConfidence}>置信度较低</Text>
          )}
        </View>

        {item.data && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>查询结果：</Text>
            <View style={styles.dataContent}>
              {renderData(item.data)}
            </View>
          </View>
        )}

        {item.sources && item.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesTitle}>相关文档：</Text>
            {item.sources.map((source, index) => (
              <View key={index} style={styles.sourceItem}>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceContent} numberOfLines={2}>
                  {source.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  const renderData = (data: any) => {
    const formatted = chatbotService.formatExpenseData(data);
    if (!formatted) {
      return <Text>无法显示数据</Text>;
    }

    return (
      <View>
        {formatted.summary && (
          <Text style={styles.dataSummary}>{formatted.summary}</Text>
        )}
        {formatted.rows.length > 0 && (
          <View style={styles.dataTable}>
            <View style={styles.dataRow}>
              {formatted.columns.map((col, index) => (
                <Text key={index} style={styles.dataHeader}>
                  {col}
                </Text>
              ))}
            </View>
            {formatted.rows.slice(0, 5).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.dataRow}>
                {row.map((cell, cellIndex) => (
                  <Text key={cellIndex} style={styles.dataCell}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
            {formatted.rows.length > 5 && (
              <Text style={styles.moreData}>...还有 {formatted.rows.length - 5} 条记录</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 财务助手</Text>
        <TouchableOpacity onPress={clearChat}>
          <Ionicons name="trash-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>正在处理...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="请输入您的问题..."
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={!inputText.trim() || isLoading ? '#CCC' : '#007AFF'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  lowConfidence: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dataContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxWidth: '80%',
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dataContent: {
    marginTop: 4,
  },
  dataSummary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  dataTable: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dataHeader: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#F5F5F5',
  },
  dataCell: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: '#333',
  },
  moreData: {
    padding: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  sourcesContainer: {
    marginTop: 8,
    maxWidth: '80%',
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  sourceItem: {
    padding: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    marginBottom: 4,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  sourceContent: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#F0F8FF',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
});