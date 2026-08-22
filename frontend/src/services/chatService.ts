import { ChatMessage, ConversationItem } from '../types/chat';
import { MOCK_CONVERSATIONS } from '../data/mockChat';
import { chatApi } from './api';

export const chatService = {
  getInitialConversations(): ConversationItem[] {
    return MOCK_CONVERSATIONS;
  },

  async sendMessage(text: string, language: string = 'en', sessionId?: number): Promise<ChatMessage & { sessionId?: number }> {
    const res = await chatApi.sendMessage(text, language, sessionId);
    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      content: res.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: 'SehatMitra AI',
      sessionId: res.session_id,
    };
  },
};
