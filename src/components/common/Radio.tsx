import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const radioId = id || generatedId;

    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          disabled={disabled}
          className={cn(
            'w-4 h-4 border-surface-border text-brand-600 focus:ring-brand-600 focus:ring-2 focus:ring-offset-1 mt-0.5 transition-colors cursor-pointer',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={radioId}
                className="text-sm font-medium text-content-primary cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && <span className="text-xs text-content-muted">{description}</span>}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
