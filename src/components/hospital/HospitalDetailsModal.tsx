import React from 'react';
import { Hospital } from '../../types/hospital';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { X, MapPin, Phone, Clock, Navigation, ShieldCheck, Flame } from 'lucide-react';

export interface HospitalDetailsModalProps {
  hospital: Hospital | null;
  onClose: () => void;
}

export const HospitalDetailsModal: React.FC<HospitalDetailsModalProps> = ({
  hospital,
  onClose,
}) => {
  if (!hospital) return null;

  const handleGetDirections = () => {
    const url =
      hospital.navigationUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(hospital.name + ' ' + hospital.address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-surface-card border border-surface-border rounded-lg p-6 shadow-elevated flex flex-col gap-5 text-left animate-fade-in">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
              Healthcare Facility Details
            </span>
            <h3 className="text-xl font-bold text-content-primary leading-tight">
              {hospital.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details dialog"
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hospital.type === 'government' ? 'teal' : 'neutral'} size="md">
            {hospital.type === 'government' ? 'Government Hospital' : 'Private Health Center'}
          </Badge>
          {hospital.emergencyAvailable ? (
            <Badge variant="error" size="md" icon={<Flame className="w-3.5 h-3.5 text-red-600" />}>
              24/7 Emergency Care
            </Badge>
          ) : (
            <Badge variant="neutral" size="md">
              No Emergency Listed
            </Badge>
          )}
        </div>

        {/* Details Grid */}
        <div className="flex flex-col gap-3 bg-surface-bg border border-surface-border rounded-md p-4 text-xs">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold text-content-muted">Address</span>
              <span className="font-bold text-content-primary mt-0.5">{hospital.address}</span>
            </div>
          </div>

          {hospital.phone && (
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-content-muted">Contact Phone</span>
                <span className="font-bold text-content-primary mt-0.5">{hospital.phone}</span>
              </div>
            </div>
          )}

          {hospital.hours && (
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-content-muted">Operating Hours</span>
                <span className="font-bold text-content-primary mt-0.5">{hospital.hours}</span>
              </div>
            </div>
          )}

          {hospital.recommendationReason && (
            <div className="flex items-start gap-2.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-content-muted">Recommendation Reason</span>
                <span className="font-bold text-brand-800 mt-0.5">{hospital.recommendationReason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleGetDirections}
            rightIcon={<Navigation className="w-4 h-4" />}
          >
            Get directions
          </Button>
        </div>

      </div>
    </div>
  );
};
