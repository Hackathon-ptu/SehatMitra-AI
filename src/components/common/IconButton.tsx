import { ButtonHTMLAttributes, forwardRef } from 'react';
import { ButtonVariant, ButtonSize } from '../../types/common';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, variant = 'ghost', size = 'md', 'aria-label': ariaLabel, disabled, type = 'button', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-transparent shadow-subtle',
      secondary: 'bg-medical-600 text-white hover:bg-medical-700 active:bg-medical-800 border border-transparent shadow-subtle',
      outline: 'bg-surface-card text-content-primary border border-surface-border hover:bg-surface-elevated',
      ghost: 'bg-transparent text-content-secondary hover:bg-surface-elevated hover:text-content-primary border border-transparent',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-subtle',
      emergency: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-red-800 shadow-subtle',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'w-8 h-8 p-1.5 text-sm',
      md: 'w-10 h-10 p-2 text-base',
      lg: 'w-12 h-12 p-2.5 text-lg',
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
