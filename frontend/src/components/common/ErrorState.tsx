import React from 'react';
import { ErrorStateProps } from '../../types/common';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => {
  return (
    <div className={cn('p-6 rounded-md border border-red-200 bg-red-50/50 text-center flex flex-col items-center justify-center my-4', className)}>
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 font-bold text-lg">
        !
      </div>
      <h4 className="text-base font-semibold text-red-900 mb-1">{title}</h4>
      <p className="text-sm text-red-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-300 text-red-800 hover:bg-red-100">
          Try Again
        </Button>
      )}
    </div>
  );
};
