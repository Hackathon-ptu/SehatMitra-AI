import React from 'react';
import { cn } from '../../utils/cn';

export interface UserMessageProps {
  content: string;
  timestamp?: string;
  className?: string;
}

export const UserMessage: React.FC<UserMessageProps> = ({
  content,
  timestamp,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-end gap-1 w-full max-w-2xl ml-auto my-2', className)}>
      <div className="flex items-center gap-2">
        {timestamp && <span className="text-[11px] text-content-muted">{timestamp}</span>}
        <span className="text-xs font-semibold text-content-secondary">You</span>
      </div>
      <div className="p-3.5 sm:p-4 rounded-md text-sm text-brand-950 bg-brand-50 border border-brand-200 leading-relaxed shadow-subtle max-w-xl">
        {content}
      </div>
    </div>
  );
};
