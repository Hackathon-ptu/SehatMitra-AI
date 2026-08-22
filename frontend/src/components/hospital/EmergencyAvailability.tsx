import React from 'react';
import { Badge } from '../common/Badge';
import { Flame, Clock } from 'lucide-react';

export interface EmergencyAvailabilityProps {
  isAvailable: boolean;
  className?: string;
}

export const EmergencyAvailability: React.FC<EmergencyAvailabilityProps> = ({
  isAvailable,
  className,
}) => {
  if (isAvailable) {
    return (
      <Badge
        variant="emergency"
        size="sm"
        icon={<Flame className="w-3 h-3 text-red-600" />}
        className={className}
      >
        24/7 Emergency ER Active
      </Badge>
    );
  }

  return (
    <Badge
      variant="neutral"
      size="sm"
      icon={<Clock className="w-3 h-3 text-content-muted" />}
      className={className}
    >
      Regular Operating Hours
    </Badge>
  );
};
