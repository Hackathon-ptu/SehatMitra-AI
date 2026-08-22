import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SafetyDisclaimerProps {
  message?: string;
  className?: string;
}

export const SafetyDisclaimer: React.FC<SafetyDisclaimerProps> = ({
  message = 'SehatMitra AI provides preliminary health information and triage guidance. It is not a licensed physician or emergency dispatch. If experiencing severe chest pain, shortness of breath, or acute trauma, contact 112 / 108 emergency services immediately.',
  className,
}) => {
  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-md border border-amber-200 bg-amber-50/60 text-amber-900 flex items-start gap-3 text-xs leading-relaxed my-3 shadow-subtle',
        className
      )}
    >
      <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-amber-950 uppercase tracking-wider text-[11px]">
          Medical Notice & Safety Disclaimer
        </span>
        <p>{message}</p>
      </div>
    </div>
  );
};
