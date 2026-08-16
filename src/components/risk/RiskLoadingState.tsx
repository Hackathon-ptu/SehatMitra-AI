import React from 'react';
import { Heart } from 'lucide-react';

export const RiskLoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center my-auto py-16 px-4 gap-4 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle animate-pulse">
          <Heart className="w-8 h-8 fill-brand-600/20" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-w-sm">
        <h2 className="text-xl font-bold tracking-tight text-content-primary">
          Reviewing what you’ve shared...
        </h2>
        <p className="text-xs text-content-muted leading-relaxed">
          We’re looking at the information from your health interview to prepare personalized care guidance.
        </p>
      </div>
    </div>
  );
};
