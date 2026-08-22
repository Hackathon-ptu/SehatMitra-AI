import React from 'react';
import { Button } from '../common/Button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export interface InterviewNavigationProps {
  onPrevious: () => void;
  onContinue: () => void;
  canPrevious: boolean;
  canContinue: boolean;
  isLastStep?: boolean;
}

export const InterviewNavigation: React.FC<InterviewNavigationProps> = ({
  onPrevious,
  onContinue,
  canPrevious,
  canContinue,
  isLastStep = false,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto pt-6 border-t border-surface-border flex items-center justify-between mt-auto">
      <Button
        variant="outline"
        size="md"
        onClick={onPrevious}
        disabled={!canPrevious}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Previous
      </Button>

      <Button
        variant="primary"
        size="md"
        onClick={onContinue}
        disabled={!canContinue}
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        {isLastStep ? 'Complete Interview' : 'Continue'}
      </Button>
    </div>
  );
};
