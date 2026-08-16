import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import { IconButton } from '../common/IconButton';
import { VoiceState } from '../../types/chat';
import { cn } from '../../utils/cn';

export interface ChatComposerProps {
  onSendMessage: (text: string) => void;
  voiceState?: VoiceState;
  onToggleVoice?: () => void;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  voiceState = 'idle',
  onToggleVoice,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isListening = voiceState === 'listening';
  const isProcessingVoice = voiceState === 'processing';

  return (
    <div className="w-full bg-surface-card border-t border-surface-border p-3 sm:p-4 shrink-0 flex flex-col items-center shadow-subtle z-10">
      <div className="w-full max-w-2xl flex flex-col gap-2">
        
        {/* Voice active notification strip */}
        {isListening && (
          <div className="p-2 rounded bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between animate-pulse">
            <span>🎙 Listening to your voice... Speak clearly.</span>
            <span className="text-[10px] text-red-700">Click mic to stop</span>
          </div>
        )}

        {isProcessingVoice && (
          <div className="p-2 rounded bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
            <span>Understanding spoken input...</span>
          </div>
        )}

        {/* Composer Row */}
        <div className="flex items-end gap-2 bg-surface-bg border border-surface-border rounded-lg p-2 transition-colors focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20">
          
          {/* Optional Attachment Icon */}
          <IconButton
            aria-label="Attach medical document preview"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-content-muted hover:text-brand-600 mb-0.5"
            title="Attach lab report scan"
          >
            <Paperclip className="w-4 h-4" />
          </IconButton>

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isListening}
            placeholder={
              isListening
                ? 'Listening to speech...'
                : 'Tell me what’s bothering you...'
            }
            rows={1}
            className="flex-1 bg-transparent border-0 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none resize-none py-1.5 px-1 max-h-32"
          />

          {/* Voice Button */}
          <VoiceButton
            isRecording={isListening}
            onToggleRecording={onToggleVoice}
            className="mb-0.5"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            aria-label="Send message"
            className={cn(
              'p-2 rounded-md transition-all mb-0.5 flex items-center justify-center',
              text.trim() && !disabled
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-subtle'
                : 'bg-surface-elevated text-content-disabled cursor-not-allowed border border-surface-border'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Quiet Safety Note */}
        <div className="flex items-center justify-between text-[11px] text-content-muted px-1">
          <span>SehatMitra provides guidance and does not replace professional medical evaluation.</span>
          <span className="hidden sm:inline">Press Enter to send</span>
        </div>

      </div>
    </div>
  );
};
