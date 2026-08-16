import React from 'react';
import { ProgressProps } from '../../types/common';
import { cn } from '../../utils/cn';

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  showPercentage = false,
  className,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-medium text-content-secondary">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div
        className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden border border-surface-border/50"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className="h-full bg-brand-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
