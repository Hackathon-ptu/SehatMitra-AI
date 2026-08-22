import React from 'react';
import { Progress } from '../common/Progress';

export interface InterviewProgressProps {
  currentStep: number;
  totalSteps: number;
}

export const InterviewProgress: React.FC<InterviewProgressProps> = ({
  currentStep,
  totalSteps,
}) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2 my-4">
      <Progress
        value={percentage}
        label={`Step ${currentStep} of ${totalSteps}`}
        showPercentage
      />
    </div>
  );
};
