import React from 'react';
import { QuestionOption } from '../../../types/health';
import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ChoiceQuestionProps {
  options: QuestionOption[];
  value: string;
  onChange: (val: string) => void;
}

export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({
  options,
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <div
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange(opt.value);
              }
            }}
            className={cn(
              'w-full p-4 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
              isSelected
                ? 'border-brand-600 bg-brand-50/60 shadow-subtle'
                : 'border-surface-border bg-surface-card hover:bg-surface-elevated'
            )}
          >
            <div className="flex flex-col">
              <span className={cn('text-sm font-semibold', isSelected ? 'text-brand-950 font-bold' : 'text-content-primary')}>
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-xs text-content-muted">{opt.description}</span>
              )}
            </div>
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center border transition-colors',
                isSelected
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-surface-border bg-surface-bg text-transparent'
              )}
            >
              <Check className="w-3 h-3" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
