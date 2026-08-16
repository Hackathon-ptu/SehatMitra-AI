import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SystemMessageProps {
  message: string;
  className?: string;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message, className }) => {
  return (
    <div className={cn('w-full flex items-center justify-center my-3', className)}>
      <div className="px-3.5 py-1.5 rounded-full bg-surface-elevated border border-surface-border text-xs text-content-muted flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-brand-600 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
};
