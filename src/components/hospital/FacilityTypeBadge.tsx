import React from 'react';
import { FacilityType } from '../../types/hospital';
import { Badge } from '../common/Badge';
import { Building, Building2, Stethoscope, Landmark } from 'lucide-react';

export interface FacilityTypeBadgeProps {
  type: FacilityType;
  className?: string;
}

export const FacilityTypeBadge: React.FC<FacilityTypeBadgeProps> = ({ type, className }) => {
  const map = {
    Government: { variant: 'government' as const, icon: <Landmark className="w-3 h-3" /> },
    Private: { variant: 'private' as const, icon: <Building2 className="w-3 h-3" /> },
    Clinic: { variant: 'teal' as const, icon: <Stethoscope className="w-3 h-3" /> },
    'Specialty Hospital': { variant: 'blue' as const, icon: <Building className="w-3 h-3" /> },
  };

  const item = map[type] || map['Government'];

  return (
    <Badge variant={item.variant} size="sm" icon={item.icon} className={className}>
      {type}
    </Badge>
  );
};
