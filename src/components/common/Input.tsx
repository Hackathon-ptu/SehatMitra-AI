import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  isSuccess?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      isSuccess,
      leftIcon,
      rightIcon,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-content-primary flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 text-content-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full px-3.5 py-2 text-sm rounded-md border transition-colors bg-surface-card text-content-primary placeholder:text-content-disabled',
              'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
              'disabled:bg-surface-elevated disabled:text-content-disabled disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                : isSuccess
                ? 'border-emerald-600 focus:ring-emerald-600 focus:border-emerald-600 bg-emerald-50/20'
                : 'border-surface-border',
              leftIcon && 'pl-10',
              (rightIcon || error || isSuccess) && 'pr-10',
              className
            )}
            {...props}
          />

          <div className="absolute right-3 pointer-events-none flex items-center justify-center">
            {error ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : rightIcon ? (
              <div className="text-content-muted">{rightIcon}</div>
            ) : null}
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-xs text-red-600 font-medium flex items-center gap-1" role="alert">
            <span>{error}</span>
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-xs text-content-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
