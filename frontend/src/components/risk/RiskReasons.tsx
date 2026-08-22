import React from 'react';
import { RiskReasonItem } from '../../types/risk';
import { CheckCircle2 } from 'lucide-react';

export interface RiskReasonsProps {
  reasons: RiskReasonItem[];
}

export const RiskReasons: React.FC<RiskReasonsProps> = ({ reasons }) => {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      <h3 className="text-base font-bold text-content-primary tracking-tight">
        Why this result?
      </h3>

      <div className="flex flex-col gap-2.5">
        {reasons.map((r) => (
          <div
            key={r.id}
            className="p-3.5 rounded-md bg-surface-card border border-surface-border flex items-start gap-3 shadow-subtle"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-content-primary">
                {r.text}
              </span>
              {r.detail && (
                <span className="text-xs text-content-muted">{r.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
