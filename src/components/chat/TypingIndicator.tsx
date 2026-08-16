import React from 'react';
import { AiAvatar } from './AiAvatar';
import { cn } from '../../utils/cn';

export interface TypingIndicatorProps {
  className?: string;
  message?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className,
  message = 'SehatMitra is thinking...',
}) => {
  return (
    <div className={cn('flex items-center gap-3 my-2', className)}>
      <AiAvatar size="sm" />
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-card border border-surface-border rounded-md text-xs text-content-muted shadow-subtle">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{message}</span>
      </div>
    </div>
  );
};
