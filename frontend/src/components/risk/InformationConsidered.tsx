import React from 'react';
import { InformationItem } from '../../types/risk';

export interface InformationConsideredProps {
  items: InformationItem[];
}

export const InformationConsidered: React.FC<InformationConsideredProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      <h3 className="text-base font-bold text-content-primary tracking-tight">
        Information considered
      </h3>

      <div className="bg-surface-card border border-surface-border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 shadow-subtle">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-content-muted">{item.label}</span>
            <span className="text-xs font-bold text-content-primary truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
