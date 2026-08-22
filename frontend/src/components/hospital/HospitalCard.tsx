import React from 'react';
import { Hospital } from '../../types/hospital';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { MapPin, Navigation, Info, ShieldCheck, Flame } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface HospitalCardProps {
  hospital?: Hospital;
  facility?: {
    id: string;
    name: string;
    type: string;
    distanceKm: number;
    address: string;
    phone: string;
    has24x7Emergency: boolean;
    rating: number;
  };
  isPrimary?: boolean;
  onViewDetails?: (hospital: Hospital) => void;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital: propHospital,
  facility,
  isPrimary = false,
  onViewDetails,
}) => {
  // Normalize hospital object from either hospital prop or legacy facility preview prop
  const item: Hospital = propHospital || {
    id: facility?.id || 'f1',
    name: facility?.name || 'Hospital',
    distance: facility ? `${facility.distanceKm} km` : '1.8 km',
    distanceValue: facility?.distanceKm || 1.8,
    type: facility?.type.toLowerCase().includes('gov') ? 'government' : 'private',
    category: facility?.has24x7Emergency ? 'emergency_hospital' : 'general_hospital',
    emergencyAvailable: facility?.has24x7Emergency ?? true,
    address: facility?.address || 'Kapurthala',
    phone: facility?.phone,
  };

  const handleGetDirections = () => {
    const url =
      item.navigationUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(item.name + ' ' + item.address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={cn(
        'w-full p-4 sm:p-5 rounded-lg border text-left transition-all flex flex-col gap-3 shadow-subtle',
        isPrimary
          ? 'bg-surface-card border-brand-300 ring-1 ring-brand-100 shadow-md'
          : 'bg-surface-card border-surface-border hover:border-stone-300'
      )}
    >
      {/* Primary recommendation tag */}
      {isPrimary && item.recommendationReason && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-700 uppercase tracking-wider bg-brand-50 border border-brand-200 px-2.5 py-1 rounded w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>{item.recommendationReason}</span>
        </div>
      )}

      {/* Hospital Name & Type Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base sm:text-lg font-bold text-content-primary leading-tight">
            {item.name}
          </h3>
          <p className="text-xs text-content-muted flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-content-disabled shrink-0" />
            <span className="truncate">{item.address}</span>
          </p>
        </div>

        <span className="text-sm font-bold text-brand-700 shrink-0 bg-brand-50 px-2.5 py-1 rounded border border-brand-200">
          {item.distance}
        </span>
      </div>

      {/* Category Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge
          variant={item.type === 'government' ? 'teal' : 'neutral'}
          size="sm"
        >
          {item.type === 'government' ? 'Government' : 'Private'}
        </Badge>

        {item.emergencyAvailable ? (
          <Badge
            variant="error"
            size="sm"
            icon={<Flame className="w-3 h-3 text-red-600" />}
          >
            Emergency available
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            No emergency service
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-surface-border mt-1">
        <Button
          variant={isPrimary ? 'primary' : 'outline'}
          size="sm"
          onClick={handleGetDirections}
          className="flex-1"
          leftIcon={<Navigation className="w-3.5 h-3.5" />}
        >
          Get directions
        </Button>

        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(item)}
            className="text-xs font-semibold text-content-muted hover:text-content-primary"
            leftIcon={<Info className="w-3.5 h-3.5" />}
          >
            Details
          </Button>
        )}
      </div>
    </div>
  );
};
