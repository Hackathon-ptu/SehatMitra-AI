import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export interface RecommendationBlockProps {
  title?: string;
  recommendations: string[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  isEmergency?: boolean;
  className?: string;
}

export const RecommendationBlock: React.FC<RecommendationBlockProps> = ({
  title = 'Recommended Next Steps',
  recommendations,
  primaryActionLabel,
  onPrimaryAction,
  isEmergency = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-5 rounded-md border flex flex-col gap-4 shadow-subtle',
        isEmergency
          ? 'bg-red-50/70 border-red-300 text-red-950'
          : 'bg-brand-50/40 border-brand-200 text-content-primary',
        className
      )}
    >
      <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>

      <ul className="flex flex-col gap-2">
        {recommendations.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
            <CheckCircle2
              className={cn(
                'w-4 h-4 shrink-0 mt-0.5',
                isEmergency ? 'text-red-700' : 'text-brand-600'
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {primaryActionLabel && onPrimaryAction && (
        <div className="pt-2">
          <Button
            variant={isEmergency ? 'emergency' : 'primary'}
            size="md"
            onClick={onPrimaryAction}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {primaryActionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
