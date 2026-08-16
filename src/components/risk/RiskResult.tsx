import React from 'react';
import { RiskLevel } from '../../types/risk';
import { RiskBadge } from './RiskBadge';
import { cn } from '../../utils/cn';

export interface RiskResultProps {
  level: RiskLevel;
  summary: string;
}

export const RiskResult: React.FC<RiskResultProps> = ({ level, summary }) => {
  const getContainerStyle = (lvl: RiskLevel) => {
    switch (lvl) {
      case 'low':
        return 'bg-emerald-50/70 border-emerald-200 text-emerald-950';
      case 'moderate':
        return 'bg-amber-50/70 border-amber-200 text-amber-950';
      case 'high':
        return 'bg-orange-50/70 border-orange-200 text-orange-950';
      case 'emergency':
        return 'bg-red-50/90 border-red-300 text-red-950 shadow-md ring-1 ring-red-300/50';
      default:
        return 'bg-surface-card border-surface-border text-content-primary';
    }
  };

  return (
    <div
      className={cn(
        'w-full p-6 sm:p-8 rounded-lg border flex flex-col gap-4 text-left transition-all',
        getContainerStyle(level)
      )}
    >
      <div className="flex items-center justify-between">
        <RiskBadge level={level} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
          {summary}
        </h2>
      </div>
    </div>
  );
};
