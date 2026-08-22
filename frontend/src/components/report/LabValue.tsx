import React from 'react';
import { LabValueItem } from '../../types/report';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

export interface LabValueProps {
  item: LabValueItem;
}

export const LabValue: React.FC<LabValueProps> = ({ item }) => {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'below_normal':
        return <Badge variant="warning" size="sm">Below normal</Badge>;
      case 'above_normal':
        return <Badge variant="warning" size="sm">Above normal</Badge>;
      case 'needs_attention':
        return <Badge variant="error" size="sm">Needs attention</Badge>;
      case 'normal':
        return <Badge variant="teal" size="sm">Within range</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Reported</Badge>;
    }
  };

  const isAbnormal = item.status !== 'normal';

  return (
    <div
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all flex flex-col gap-2.5 shadow-subtle',
        isAbnormal
          ? 'bg-amber-50/40 border-amber-200'
          : 'bg-surface-card border-surface-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-content-primary">
            {item.name}
          </span>
          <span className="text-xs text-content-muted">
            Reference range: {item.referenceRange}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-content-primary">
              {item.value}
            </span>
            <span className="text-xs font-semibold text-content-muted">
              {item.unit}
            </span>
          </div>
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
};
