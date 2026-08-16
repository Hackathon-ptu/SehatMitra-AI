import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AiAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  className?: string;
}

export const AiAvatar: React.FC<AiAvatarProps> = ({
  size = 'md',
  isOnline = true,
  className,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const iconSizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'rounded-md bg-brand-600 text-white flex items-center justify-center font-bold shadow-subtle',
          sizeMap[size]
        )}
        aria-label="SehatMitra AI Avatar"
      >
        <Heart className={cn('fill-white/20', iconSizeMap[size])} />
      </div>
      {isOnline && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface-card rounded-full"
          title="AI Assistant Active"
        />
      )}
    </div>
  );
};
