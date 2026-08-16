import React from 'react';
import { cn } from '../../../utils/cn';

export interface SeverityQuestionProps {
  value: number;
  onChange: (val: number) => void;
}

export const SeverityQuestion: React.FC<SeverityQuestionProps> = ({ value, onChange }) => {
  const getSeverityLabel = (val: number) => {
    if (val <= 3) return { text: 'Mild Discomfort', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (val <= 6) return { text: 'Moderate Pain', color: 'text-amber-800 bg-amber-50 border-amber-200' };
    if (val <= 8) return { text: 'Severe Pain', color: 'text-orange-900 bg-orange-50 border-orange-200' };
    return { text: 'Extreme / Unbearable Pain', color: 'text-red-900 bg-red-100 border-red-300 font-bold' };
  };

  const activeInfo = value > 0 ? getSeverityLabel(value) : null;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={cn(
                'h-12 rounded-md border font-extrabold text-base transition-all flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                isSelected
                  ? 'bg-brand-600 text-white border-brand-700 shadow-subtle scale-105'
                  : 'bg-surface-card border-surface-border text-content-primary hover:bg-surface-elevated'
              )}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs font-semibold text-content-muted px-1">
        <span>1 — Mild</span>
        <span>5 — Moderate</span>
        <span>10 — Severe</span>
      </div>

      {activeInfo && (
        <div className={cn('p-3 rounded-md border text-center text-xs font-medium transition-all', activeInfo.color)}>
          Selected Severity: <strong>{value} / 10</strong> ({activeInfo.text})
        </div>
      )}
    </div>
  );
};
