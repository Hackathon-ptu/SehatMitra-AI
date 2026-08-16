import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, onChange, id, placeholder = 'Search...', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="relative flex items-center w-full">
        <div className="absolute left-3 text-content-muted pointer-events-none flex items-center justify-center">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-9 py-2 text-sm rounded-md border border-surface-border bg-surface-card text-content-primary placeholder:text-content-disabled transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
            className
          )}
          {...props}
        />

        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 text-content-muted hover:text-content-primary rounded hover:bg-surface-elevated transition-colors"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
