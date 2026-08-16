import React from 'react';
import { RiskLevel } from '../../types/common';
import { ShieldCheck, AlertTriangle, AlertCircle, Flame } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className }) => {
  const config = {
    low: {
      label: 'Low Risk',
      bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
    },
    moderate: {
      label: 'Moderate Risk',
      bgColor: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
    },
    high: {
      label: 'High Risk',
      bgColor: 'bg-orange-50 border-orange-200 text-orange-900',
      icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />,
    },
    emergency: {
      label: 'Emergency Needed',
      bgColor: 'bg-red-100 border-red-300 text-red-900 font-bold',
      icon: <Flame className="w-3.5 h-3.5 text-red-600" />,
    },
  };

  const current = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider border rounded-md select-none',
        current.bgColor,
        className
      )}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
