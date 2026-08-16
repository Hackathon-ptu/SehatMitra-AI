import { ReactNode } from 'react';

export type MessageSender = 'ai' | 'user' | 'system';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  senderName?: string;
  isDisclaimer?: boolean;
}

export interface SuggestionPrompt {
  id: string;
  label: string;
  query: string;
  icon?: ReactNode;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface ConversationItem {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
}
