import React, { useState } from 'react';
import { ConversationItem, ChatMessage, VoiceState } from '../../types/chat';
import { ChatSidebar } from './ChatSidebar';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatComposer } from './ChatComposer';

export interface ChatLayoutProps {
  conversations: ConversationItem[];
  activeId: string | null;
  messages: ChatMessage[];
  selectedLanguageName: string;
  isThinking: boolean;
  voiceState: VoiceState;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onSendMessage: (text: string) => void;
  onSelectSuggestion: (query: string) => void;
  onToggleVoice: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  conversations,
  activeId,
  messages,
  selectedLanguageName,
  isThinking,
  voiceState,
  onSelectConversation,
  onNewConversation,
  onSendMessage,
  onSelectSuggestion,
  onToggleVoice,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex bg-surface-bg text-content-primary overflow-hidden">
      {/* Sidebar / Mobile Drawer */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={onSelectConversation}
        onNewConversation={onNewConversation}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Chat Workarea */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatHeader
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          selectedLanguageName={selectedLanguageName}
        />

        <ChatMessages
          messages={messages}
          isThinking={isThinking}
          onSelectSuggestion={onSelectSuggestion}
        />

        <ChatComposer
          onSendMessage={onSendMessage}
          voiceState={voiceState}
          onToggleVoice={onToggleVoice}
          disabled={isThinking}
        />
      </div>
    </div>
  );
};
