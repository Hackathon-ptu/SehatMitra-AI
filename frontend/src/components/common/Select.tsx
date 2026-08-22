import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-content-primary flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'w-full px-3.5 py-2 text-sm rounded-md border appearance-none transition-colors bg-surface-card text-content-primary pr-10',
              'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
              'disabled:bg-surface-elevated disabled:text-content-disabled disabled:cursor-not-allowed',
              error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-surface-border',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 text-content-muted pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-xs text-red-600 font-medium" role="alert">
            {error}
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

Select.displayName = 'Select';
