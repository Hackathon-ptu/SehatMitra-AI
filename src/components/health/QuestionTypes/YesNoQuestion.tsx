import React from 'react';
import { cn } from '../../../utils/cn';

export interface YesNoQuestionProps {
  value: string; // 'yes' | 'no' | ''
  onChange: (val: string) => void;
}

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <button
        type="button"
        onClick={() => onChange('yes')}
        className={cn(
          'p-5 rounded-md border text-center font-bold text-base transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
          value === 'yes'
            ? 'bg-brand-600 text-white border-brand-700 shadow-subtle'
            : 'bg-surface-card border-surface-border text-content-primary hover:bg-surface-elevated'
        )}
      >
        Yes
      </button>

      <button
        type="button"
        onClick={() => onChange('no')}
        className={cn(
          'p-5 rounded-md border text-center font-bold text-base transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
          value === 'no'
            ? 'bg-brand-600 text-white border-brand-700 shadow-subtle'
            : 'bg-surface-card border-surface-border text-content-primary hover:bg-surface-elevated'
        )}
      >
        No
      </button>
    </div>
  );
};
