import React from 'react';
import { LanguageItem } from '../../data/languageData';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LanguageOptionProps {
  language: LanguageItem;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

export const LanguageOption: React.FC<LanguageOptionProps> = ({
  language,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(language.code)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(language.code);
        }
      }}
      className={cn(
        'w-full p-4 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        isSelected
          ? 'border-brand-600 bg-brand-50/60 shadow-subtle'
          : 'border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-stone-300'
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className={cn('text-lg font-bold leading-tight', isSelected ? 'text-brand-950' : 'text-content-primary')}>
          {language.nativeName}
        </span>
        <span className="text-xs text-content-muted">
          {language.englishName}
        </span>
      </div>

      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center border transition-colors',
          isSelected
            ? 'bg-brand-600 border-brand-600 text-white'
            : 'border-surface-border bg-surface-bg text-transparent'
        )}
      >
        <Check className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
