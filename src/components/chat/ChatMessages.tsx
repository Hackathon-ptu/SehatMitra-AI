import React, { useEffect, useRef } from 'react';
import { ChatMessage, SuggestionPrompt } from '../../types/chat';
import { AiMessage } from './AiMessage';
import { UserMessage } from './UserMessage';
import { SystemMessage } from './SystemMessage';
import { TypingIndicator } from './TypingIndicator';
import { SuggestionButton } from './SuggestionButton';
import { Sparkles, Heart } from 'lucide-react';
import { INITIAL_SUGGESTIONS } from '../../data/mockChat';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  isThinking?: boolean;
  onSelectSuggestion?: (query: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isThinking = false,
  onSelectSuggestion,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center my-auto py-12 px-4 gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
              <Heart className="w-6 h-6 fill-white/20" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-md">
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                Tell me what’s bothering you.
              </h1>
              <p className="text-sm text-content-muted leading-relaxed">
                You can type or speak in your preferred language.
              </p>
            </div>

            {/* Suggestion Prompts */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-lg">
              {INITIAL_SUGGESTIONS.map((prompt: SuggestionPrompt) => (
                <SuggestionButton
                  key={prompt.id}
                  label={prompt.label}
                  icon={<Sparkles className="w-3.5 h-3.5 text-brand-600" />}
                  onClick={() => onSelectSuggestion?.(prompt.query)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Message Trajectory */}
        {messages.map((msg) => {
          if (msg.sender === 'ai') {
            return (
              <AiMessage
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
                senderName={msg.senderName}
                isDisclaimer={msg.isDisclaimer}
              />
            );
          }
          if (msg.sender === 'user') {
            return (
              <UserMessage
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            );
          }
          return <SystemMessage key={msg.id} message={msg.content} />;
        })}

        {/* Typing indicator state */}
        {isThinking && <TypingIndicator message="SehatMitra is thinking..." />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
