import React from 'react';
import { QuestionOption } from '../../../types/health';
import { Checkbox } from '../../common/Checkbox';
import { cn } from '../../../utils/cn';

export interface MultiSelectQuestionProps {
  options: QuestionOption[];
  value: string[];
  onChange: (val: string[]) => void;
}

export const MultiSelectQuestion: React.FC<MultiSelectQuestionProps> = ({
  options,
  value = [],
  onChange,
}) => {
  const handleToggle = (optValue: string) => {
    if (optValue === 'none') {
      onChange(['none']);
      return;
    }

    const filtered = value.filter((v) => v !== 'none');
    if (filtered.includes(optValue)) {
      const next = filtered.filter((v) => v !== optValue);
      onChange(next.length === 0 ? ['none'] : next);
    } else {
      onChange([...filtered, optValue]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {options.map((opt) => {
        const isChecked = value.includes(opt.value);
        return (
          <div
            key={opt.value}
            onClick={() => handleToggle(opt.value)}
            className={cn(
              'p-3.5 rounded-md border text-left cursor-pointer transition-all flex items-start gap-3 select-none',
              isChecked
                ? 'border-brand-600 bg-brand-50/60 shadow-subtle'
                : 'border-surface-border bg-surface-card hover:bg-surface-elevated'
            )}
          >
            <Checkbox
              checked={isChecked}
              onChange={() => handleToggle(opt.value)}
              className="mt-0.5"
            />
            <div className="flex flex-col">
              <span className={cn('text-sm font-semibold', isChecked ? 'text-brand-950 font-bold' : 'text-content-primary')}>
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-xs text-content-muted">{opt.description}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
