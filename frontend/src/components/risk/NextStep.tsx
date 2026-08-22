import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { RiskLevel } from '../../types/risk';

export interface NextStepProps {
  level: RiskLevel;
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionRoute: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const NextStep: React.FC<NextStepProps> = ({
  level,
  title,
  description,
  primaryActionLabel,
  primaryActionRoute,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const navigate = useNavigate();

  const isEmergency = level === 'emergency';

  return (
    <div className="flex flex-col gap-3 w-full text-left">
      <h3 className="text-base font-bold text-content-primary tracking-tight">
        What to do next
      </h3>

      <div className="p-5 rounded-lg bg-surface-card border border-surface-border flex flex-col gap-4 shadow-subtle">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-content-primary">
            {title}
          </span>
          <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant={isEmergency ? 'emergency' : 'primary'}
            size="md"
            onClick={() => navigate(primaryActionRoute)}
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {primaryActionLabel}
          </Button>

          {secondaryActionLabel && (
            <Button
              variant="outline"
              size="md"
              onClick={onSecondaryAction || (() => navigate('/health-interview'))}
              className="w-full sm:w-auto"
              leftIcon={<RotateCcw className="w-4 h-4 text-brand-600" />}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
