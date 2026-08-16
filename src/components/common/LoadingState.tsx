import React from 'react';
import { LoadingStateProps } from '../../types/common';
import { cn } from '../../utils/cn';

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className,
}) => {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center min-h-[160px]', className)}>
      <div
        className={cn(
          'rounded-full border-brand-600 border-t-transparent animate-spin mb-3',
          sizeMap[size]
        )}
        role="status"
        aria-label={message}
      />
      {message && <p className="text-sm font-medium text-content-muted">{message}</p>}
    </div>
  );
};
