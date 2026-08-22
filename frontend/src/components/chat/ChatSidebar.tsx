import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, MessageSquare, X } from 'lucide-react';
import { ConversationItem } from '../../types/chat';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { cn } from '../../utils/cn';

export interface ChatSidebarProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex flex-col h-full bg-surface-card border-r border-surface-border w-[270px]">
      {/* Branding Header */}
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white shadow-subtle group-hover:bg-brand-700">
            <Heart className="w-4 h-4 fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
          </div>
        </Link>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <IconButton
            aria-label="Close sidebar drawer"
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
            className="md:hidden"
          >
            <X className="w-5 h-5" />
          </IconButton>
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-3 border-b border-surface-border">
        <Button
          variant="outline"
          size="md"
          className="w-full justify-start text-brand-700 font-semibold hover:bg-brand-50 hover:border-brand-200"
          leftIcon={<Plus className="w-4 h-4 text-brand-600" />}
          onClick={() => {
            onNewConversation();
            onCloseMobile?.();
          }}
        >
          New conversation
        </Button>
      </div>

      {/* Recent Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-2 py-1">
          Recent Conversations
        </span>

        {conversations.map((conv) => {
          const isSelected = activeId === conv.id;
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => {
                onSelectConversation(conv.id);
                onCloseMobile?.();
              }}
              className={cn(
                'w-full px-3 py-2.5 rounded-md text-left transition-colors flex items-center gap-2.5 text-xs',
                isSelected
                  ? 'bg-brand-50/80 text-brand-950 font-semibold border border-brand-200'
                  : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary border border-transparent'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-600" />
              <div className="flex flex-col truncate">
                <span className="truncate">{conv.title}</span>
                <span className="text-[10px] text-content-muted">{conv.date}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-full shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
