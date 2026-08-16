import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

export interface DoctorDiscussionProps {
  points: string[];
}

export const DoctorDiscussion: React.FC<DoctorDiscussionProps> = ({ points }) => {
  if (!points || points.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="w-5 h-5 text-brand-600 shrink-0" />
        <h3 className="text-base font-bold text-content-primary tracking-tight">
          What to discuss with your doctor
        </h3>
      </div>

      <div className="bg-brand-50/60 border border-brand-200 rounded-lg p-4 sm:p-5 flex flex-col gap-2.5 shadow-subtle">
        {points.map((pt, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-brand-950 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 mt-2" />
            <span>{pt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
