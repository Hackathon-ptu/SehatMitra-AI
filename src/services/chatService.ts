import { ChatMessage, ConversationItem } from '../types/chat';
import { MOCK_CONVERSATIONS, getMockAiResponse } from '../data/mockChat';

export const chatService = {
  getInitialConversations(): ConversationItem[] {
    return MOCK_CONVERSATIONS;
  },

  async sendMessage(text: string): Promise<ChatMessage> {
    // Simulate slight async response
    return new Promise((resolve) => {
      setTimeout(() => {
        const replyText = getMockAiResponse(text);
        resolve({
          id: `ai-${Date.now()}`,
          sender: 'ai',
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          senderName: 'SehatMitra AI',
        });
      }, 800);
    });
  },
};
