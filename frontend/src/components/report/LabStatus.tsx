import React from 'react';
import { LabStatusType } from '../../types/report';
import { Badge } from '../common/Badge';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export interface LabStatusProps {
  status: LabStatusType;
  className?: string;
}

export const LabStatus: React.FC<LabStatusProps> = ({ status, className }) => {
  const map = {
    normal: {
      variant: 'success' as const,
      label: 'Normal Range',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-700" />,
    },
    abnormal: {
      variant: 'warning' as const,
      label: 'Abnormal',
      icon: <AlertTriangle className="w-3 h-3 text-amber-700" />,
    },
    critical: {
      variant: 'emergency' as const,
      label: 'Critical Value',
      icon: <AlertCircle className="w-3 h-3 text-red-700" />,
    },
  };

  const item = map[status] || map['normal'];

  return (
    <Badge variant={item.variant} size="sm" icon={item.icon} className={className}>
      {item.label}
    </Badge>
  );
};
