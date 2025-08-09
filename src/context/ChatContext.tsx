import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ChatMessage, Conversation } from '../types/ai';

interface ChatState {
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isLoading: boolean;
}

type ChatAction = 
  | { type: 'START_LOADING' }
  | { type: 'STOP_LOADING' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CREATE_CONVERSATION' }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'SET_CONVERSATION'; payload: Conversation };

interface ChatContextType {
  state: ChatState;
  addMessage: (message: ChatMessage) => void;
  createNewConversation: () => void;
  clearCurrentConversation: () => void;
  setLoading: (loading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true };
      
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
      
    case 'ADD_MESSAGE':
      if (!state.currentConversation) {
        // Create new conversation if none exists
        const newConversation: Conversation = {
          id: Date.now().toString(),
          messages: [action.payload],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        return {
          ...state,
          currentConversation: newConversation,
          conversations: [newConversation, ...state.conversations],
        };
      }
      
      // Add message to existing conversation
      const updatedConversation: Conversation = {
        ...state.currentConversation,
        messages: [...state.currentConversation.messages, action.payload],
        updatedAt: new Date(),
      };
      
      return {
        ...state,
        currentConversation: updatedConversation,
        conversations: state.conversations.map(conv => 
          conv.id === updatedConversation.id ? updatedConversation : conv
        ),
      };
      
    case 'CREATE_CONVERSATION':
      const newConv: Conversation = {
        id: Date.now().toString(),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      return {
        ...state,
        currentConversation: newConv,
        conversations: [newConv, ...state.conversations],
      };
      
    case 'CLEAR_CONVERSATION':
      return {
        ...state,
        currentConversation: null,
      };
      
    case 'SET_CONVERSATION':
      return {
        ...state,
        currentConversation: action.payload,
      };
      
    default:
      return state;
  }
};

const initialState: ChatState = {
  currentConversation: null,
  conversations: [],
  isLoading: false,
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const addMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };

  const createNewConversation = () => {
    dispatch({ type: 'CREATE_CONVERSATION' });
  };

  const clearCurrentConversation = () => {
    dispatch({ type: 'CLEAR_CONVERSATION' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: loading ? 'START_LOADING' : 'STOP_LOADING' });
  };

  const value: ChatContextType = {
    state,
    addMessage,
    createNewConversation,
    clearCurrentConversation,
    setLoading,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};