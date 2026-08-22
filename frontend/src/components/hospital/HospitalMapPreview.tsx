import React from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';
import { Hospital } from '../../types/hospital';

export interface HospitalMapPreviewProps {
  primaryHospital?: Hospital;
}

export const HospitalMapPreview: React.FC<HospitalMapPreviewProps> = ({ primaryHospital }) => {
  return (
    <div className="w-full h-full min-h-[320px] rounded-lg border border-surface-border bg-stone-100 overflow-hidden relative flex flex-col justify-between p-4 shadow-subtle select-none">
      {/* Background Stylized Map Pattern Grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#0D9488_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Map Control Header Overlay */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="bg-surface-card/90 backdrop-blur border border-surface-border px-3 py-1.5 rounded-md text-xs font-bold text-content-primary flex items-center gap-1.5 shadow-subtle">
          <Compass className="w-3.5 h-3.5 text-brand-600 animate-spin-slow" />
          <span>Interactive map preview</span>
        </div>
        <div className="bg-surface-card/90 backdrop-blur border border-surface-border px-2.5 py-1 rounded text-[11px] font-semibold text-content-muted">
          Kapurthala Sector 4
        </div>
      </div>

      {/* Map Pin Mock Nodes */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-8 py-6">
        {/* Recommended Hospital Pin Node */}
        <div className="flex items-center gap-2 bg-surface-card border border-brand-300 p-2 rounded-md shadow-md animate-bounce-slow">
          <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 fill-white/20" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-content-primary truncate max-w-[140px]">
              {primaryHospital?.name || 'Recommended Hospital'}
            </span>
            <span className="text-[10px] font-semibold text-brand-700">
              {primaryHospital?.distance || '1.8 km'}
            </span>
          </div>
        </div>

        {/* User Location Node */}
        <div className="flex items-center gap-2 bg-surface-card/90 border border-stone-300 px-3 py-1.5 rounded-full shadow-subtle">
          <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-200 animate-pulse" />
          <span className="text-xs font-semibold text-content-primary">Your location</span>
        </div>
      </div>

      {/* Map Footer Action Overlay */}
      <div className="relative z-10 bg-surface-card/90 backdrop-blur border border-surface-border p-3 rounded-md flex items-center justify-between text-xs">
        <span className="text-content-muted font-medium">Map view simulation</span>
        <button
          type="button"
          onClick={() => {
            const url = primaryHospital?.navigationUrl || 'https://maps.google.com';
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1"
        >
          <span>Open maps</span>
          <Navigation className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
