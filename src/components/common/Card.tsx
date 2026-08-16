import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'basic' | 'interactive' | 'highlighted' | 'warning' | 'emergency' | 'subtle';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'basic', padding = 'md', ...props }, ref) => {
    const variantStyles: Record<CardVariant, string> = {
      basic: 'bg-surface-card border border-surface-border shadow-subtle',
      interactive: 'bg-surface-card border border-surface-border hover:border-brand-500 hover:shadow-elevated transition-all cursor-pointer',
      highlighted: 'bg-brand-50/50 border border-brand-200 shadow-subtle',
      warning: 'bg-amber-50/50 border border-amber-200 shadow-subtle',
      emergency: 'bg-red-50/60 border border-red-300 shadow-subtle',
      subtle: 'bg-surface-elevated border border-transparent',
    };

    const paddingStyles = {
      none: 'p-0',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-md', variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
