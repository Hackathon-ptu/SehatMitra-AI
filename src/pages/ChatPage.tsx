import React, { useState, useEffect } from 'react';
import { ChatMessage, ConversationItem, VoiceState } from '../types/chat';
import { MOCK_CONVERSATIONS, getMockAiResponse } from '../data/mockChat';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { ChatLayout } from '../components/chat/ChatLayout';

export const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>('conv-1');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CONVERSATIONS[0].messages);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [languageName, setLanguageName] = useState<string>('English');

  // Load language settings on mount
  useEffect(() => {
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const found = AVAILABLE_LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageName(found.nativeName);
      }
    } catch {
      setLanguageName('English');
    }
  }, []);

  // Handle switching active conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    const target = conversations.find((c) => c.id === id);
    if (target) {
      setMessages(target.messages);
    }
  };

  // Handle starting a fresh conversation
  const handleNewConversation = () => {
    setActiveId(null);
    setMessages([]);
  };

  // Core send message handler (with simulated AI response)
  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiReplyText = getMockAiResponse(text);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: 'SehatMitra AI',
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);

      // Update active title if starting a new conversation
      if (!activeId) {
        const newConvId = `conv-${Date.now()}`;
        const newConvTitle = text.slice(0, 24) + (text.length > 24 ? '...' : '');
        const newConv: ConversationItem = {
          id: newConvId,
          title: newConvTitle,
          date: 'Just now',
          messages: [userMsg, aiMsg],
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveId(newConvId);
      }
    }, 800);
  };

  // Voice recording mock cycle
  const handleToggleVoice = () => {
    if (voiceState === 'idle') {
      setVoiceState('listening');
      // Simulate listening for 2.5 seconds
      setTimeout(() => {
        setVoiceState('processing');
        // Simulate processing spoken text
        setTimeout(() => {
          setVoiceState('idle');
          handleSendMessage("I've been feeling feverish and tired since morning.");
        }, 1000);
      }, 2500);
    } else {
      setVoiceState('idle');
    }
  };

  return (
    <ChatLayout
      conversations={conversations}
      activeId={activeId}
      messages={messages}
      selectedLanguageName={languageName}
      isThinking={isThinking}
      voiceState={voiceState}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onSendMessage={handleSendMessage}
      onSelectSuggestion={handleSendMessage}
      onToggleVoice={handleToggleVoice}
    />
  );
};
