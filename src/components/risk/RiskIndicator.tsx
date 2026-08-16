import React from 'react';
import { RiskLevel } from '../../types/common';
import { RiskBadge } from './RiskBadge';
import { cn } from '../../utils/cn';

export interface RiskIndicatorProps {
  level: RiskLevel;
  score?: number; // 0 - 100
  title?: string;
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  score = 35,
  title = 'Estimated Risk Level',
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, score));

  const barColor = {
    low: 'bg-emerald-500',
    moderate: 'bg-amber-500',
    high: 'bg-orange-600',
    emergency: 'bg-red-600',
  }[level];

  return (
    <div className={cn('p-4 sm:p-5 rounded-md border border-surface-border bg-surface-card flex flex-col gap-3 shadow-subtle', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
          {title}
        </span>
        <RiskBadge level={level} />
      </div>

      <div className="w-full flex flex-col gap-1">
        <div className="w-full h-2.5 bg-surface-elevated rounded-full overflow-hidden border border-surface-border">
          <div
            className={cn('h-full transition-all duration-500 ease-out rounded-full', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-content-muted font-medium pt-1">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
          <span>Emergency</span>
        </div>
      </div>
    </div>
  );
};
