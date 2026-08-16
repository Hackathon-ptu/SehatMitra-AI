import React from 'react';
import { EmptyStateProps } from '../../types/common';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-md border border-dashed border-surface-border bg-surface-subtle/50', className)}>
      {icon && <div className="mb-4 text-content-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-content-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-content-muted max-w-sm mb-6">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
