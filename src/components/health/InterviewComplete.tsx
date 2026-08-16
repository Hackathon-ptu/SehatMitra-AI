import React from 'react';
import { Heart, ArrowRight, ClipboardCheck } from 'lucide-react';
import { Button } from '../common/Button';

export interface InterviewCompleteProps {
  onContinueToAssessment: () => void;
  onReviewAnswers: () => void;
}

export const InterviewComplete: React.FC<InterviewCompleteProps> = ({
  onContinueToAssessment,
  onReviewAnswers,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center gap-6 my-auto p-6 sm:p-8 bg-surface-card border border-surface-border rounded-lg shadow-elevated">
      <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
        <Heart className="w-7 h-7 fill-white/20" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-content-primary">
          Thanks. I have a better picture now.
        </h2>
        <p className="text-body-md text-content-secondary leading-relaxed">
          I’ll use the information you shared to prepare your next-step guidance.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-2">
        <Button
          variant="outline"
          size="md"
          onClick={onReviewAnswers}
          className="w-full sm:w-1/2"
          leftIcon={<ClipboardCheck className="w-4 h-4 text-brand-600" />}
        >
          Review my answers
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={onContinueToAssessment}
          className="w-full sm:w-1/2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to assessment
        </Button>
      </div>
    </div>
  );
};
