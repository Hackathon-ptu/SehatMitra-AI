import React from 'react';
import { AiAvatar } from '../chat/AiAvatar';
import { HERO_MOCK_CHAT } from '../../data/landingData';
import { Mic, Send, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

export const HeroProductPreview: React.FC = () => {
  return (
    <div className="w-full max-w-lg mx-auto bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden flex flex-col">
      
      {/* Header bar of realistic preview */}
      <div className="px-4 py-3 bg-surface-elevated border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AiAvatar size="sm" isOnline />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-content-primary leading-tight">
              SehatMitra Health Assistant
            </span>
            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active Triage Engine
            </span>
          </div>
        </div>
        <span className="text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
          Live UI Preview
        </span>
      </div>

      {/* Chat Messages Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 bg-surface-bg/40 min-h-[260px]">
        {HERO_MOCK_CHAT.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex flex-col gap-1 text-xs max-w-[85%]',
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-content-muted">
              {msg.sender === 'ai' ? (
                <span className="font-semibold text-brand-700">SehatMitra</span>
              ) : (
                <span className="font-semibold text-content-secondary">You</span>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={cn(
                'px-3.5 py-2.5 rounded-md leading-relaxed border shadow-subtle',
                msg.sender === 'user'
                  ? 'bg-brand-50 text-brand-950 border-brand-200 font-medium'
                  : 'bg-surface-card text-content-primary border-surface-border'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input composer preview */}
      <div className="p-3 bg-surface-card border-t border-surface-border flex items-center gap-2">
        <button
          type="button"
          disabled
          aria-label="Voice input preview"
          className="p-2 rounded-md border border-surface-border text-brand-600 bg-surface-elevated hover:bg-brand-50 transition-colors"
        >
          <Mic className="w-4 h-4" />
        </button>
        <div className="flex-1 px-3 py-2 text-xs text-content-muted border border-surface-border rounded-md bg-surface-bg flex items-center justify-between">
          <span>Type or speak your health concern...</span>
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
        </div>
        <button
          type="button"
          disabled
          aria-label="Send message preview"
          className="p-2 rounded-md bg-brand-600 text-white opacity-90 shadow-subtle"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
