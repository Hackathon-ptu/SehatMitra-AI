import React from 'react';
import { RiskFactor } from '../../types/risk';
import { RiskBadge } from './RiskBadge';
import { cn } from '../../utils/cn';

export interface RiskReasonProps {
  factors: RiskFactor[];
  className?: string;
}

export const RiskReason: React.FC<RiskReasonProps> = ({ factors, className }) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h4 className="text-sm font-semibold text-content-primary">Key Rationale & Factors</h4>
      <div className="flex flex-col gap-2.5">
        {factors.map((factor) => (
          <div
            key={factor.id}
            className="p-3.5 rounded-md border border-surface-border bg-surface-card flex flex-col gap-1.5 shadow-subtle"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-content-primary">{factor.title}</span>
              <RiskBadge level={factor.severity} />
            </div>
            <p className="text-xs text-content-muted leading-relaxed">{factor.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
