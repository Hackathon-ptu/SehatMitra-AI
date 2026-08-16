import React, { useState } from 'react';
import { Input } from '../../common/Input';
import { cn } from '../../../utils/cn';

export interface NumberQuestionProps {
  value: string | number;
  onChange: (val: string) => void;
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

export const NumberQuestion: React.FC<NumberQuestionProps> = ({
  value,
  onChange,
  unit = '',
  min,
  max,
  placeholder = 'Enter value...',
}) => {
  const [activeUnit, setActiveUnit] = useState(unit);

  const isTempUnit = unit === '°F' || unit === '°C';

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-base font-semibold py-2.5"
        />

        {isTempUnit ? (
          <div className="flex rounded-md border border-surface-border p-1 bg-surface-elevated shrink-0">
            <button
              type="button"
              onClick={() => setActiveUnit('°F')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded transition-colors',
                activeUnit === '°F'
                  ? 'bg-brand-600 text-white shadow-subtle'
                  : 'text-content-muted hover:text-content-primary'
              )}
            >
              °F
            </button>
            <button
              type="button"
              onClick={() => setActiveUnit('°C')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded transition-colors',
                activeUnit === '°C'
                  ? 'bg-brand-600 text-white shadow-subtle'
                  : 'text-content-muted hover:text-content-primary'
              )}
            >
              °C
            </button>
          </div>
        ) : (
          unit && (
            <span className="text-sm font-semibold text-content-muted shrink-0">
              {unit}
            </span>
          )
        )}
      </div>
    </div>
  );
};
