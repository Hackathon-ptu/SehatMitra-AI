import React from 'react';
import { AiAvatar } from './AiAvatar';
import { cn } from '../../utils/cn';

export interface AiMessageProps {
  content: string;
  timestamp?: string;
  senderName?: string;
  isDisclaimer?: boolean;
  className?: string;
}

export const AiMessage: React.FC<AiMessageProps> = ({
  content,
  timestamp,
  senderName = 'SehatMitra AI',
  isDisclaimer = false,
  className,
}) => {
  return (
    <div className={cn('flex items-start gap-3 w-full max-w-2xl my-2', className)}>
      <AiAvatar size="md" />
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-content-primary">{senderName}</span>
          {timestamp && <span className="text-[11px] text-content-muted">{timestamp}</span>}
        </div>
        <div
          className={cn(
            'p-3.5 sm:p-4 rounded-md text-sm text-content-primary leading-relaxed border',
            isDisclaimer
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-surface-card border-surface-border shadow-subtle'
          )}
        >
          {content}
        </div>
      </div>
    </div>
  );
};
