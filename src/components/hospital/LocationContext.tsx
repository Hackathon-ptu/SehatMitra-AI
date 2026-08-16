import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export interface LocationContextProps {
  locationName?: string;
  onChangeLocation?: () => void;
}

export const LocationContext: React.FC<LocationContextProps> = ({
  locationName = 'Kapurthala, Punjab',
  onChangeLocation,
}) => {
  return (
    <div className="w-full bg-surface-card border border-surface-border rounded-lg p-3 sm:p-4 flex items-center justify-between shadow-subtle mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-content-muted leading-none">
            Showing facilities near:
          </span>
          <span className="text-xs sm:text-sm font-bold text-content-primary leading-tight mt-0.5">
            {locationName}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onChangeLocation}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 px-2.5 rounded-md hover:bg-brand-50 transition-colors shrink-0"
      >
        <Navigation className="w-3.5 h-3.5" />
        <span>Change location</span>
      </button>
    </div>
  );
};
