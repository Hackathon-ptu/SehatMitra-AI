import React from 'react';
import { Button } from '../common/Button';
import { ArrowRight, Mic } from 'lucide-react';

export interface LanguageActionsProps {
  onContinue: () => void;
}

export const LanguageActions: React.FC<LanguageActionsProps> = ({ onContinue }) => {
  return (
    <div className="flex flex-col items-center gap-4 w-full mt-6">
      <Button
        variant="primary"
        size="lg"
        onClick={onContinue}
        className="w-full"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Continue
      </Button>

      <div className="flex items-center gap-1.5 text-xs text-content-muted">
        <Mic className="w-3.5 h-3.5 text-brand-600 shrink-0" />
        <span>You can type or speak during your conversation.</span>
      </div>
    </div>
  );
};
