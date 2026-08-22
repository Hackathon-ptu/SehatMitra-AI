import React from 'react';
import { LabValueItem } from '../../types/report';
import { LabValue } from './LabValue';
import { HelpCircle, ArrowRight } from 'lucide-react';

export interface ExplanationBlockProps {
  item?: LabValueItem;
  medicalTerm?: string;
  simpleExplanation?: string;
  clinicalContext?: string;
}

export const ExplanationBlock: React.FC<ExplanationBlockProps> = ({
  item: propItem,
  medicalTerm,
  simpleExplanation,
  clinicalContext,
}) => {
  const item: LabValueItem = propItem || {
    id: 'exp-1',
    name: medicalTerm || 'Hemoglobin',
    value: '9.2',
    unit: 'g/dL',
    referenceRange: '12.0 – 16.0 g/dL',
    status: 'below_normal',
    explanation: simpleExplanation || 'Your level is lower than the reference range.',
    possibleContext: clinicalContext,
    nextStep: 'Discuss this result with your physician.',
  };

  return (
    <div className="w-full bg-surface-card border border-surface-border rounded-lg p-5 flex flex-col gap-4 text-left shadow-subtle">
      {/* Target Lab Value Card Header */}
      <LabValue item={item} />

      {/* What does this mean? */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-brand-600 shrink-0" />
          <span>What does this mean?</span>
        </div>
        <p className="text-xs sm:text-sm text-content-primary leading-relaxed font-medium">
          {item.explanation}
        </p>
        {item.possibleContext && (
          <p className="text-xs text-content-secondary leading-relaxed bg-surface-bg border border-surface-border p-3 rounded-md mt-1">
            {item.possibleContext}
          </p>
        )}
      </div>

      {/* What to do next */}
      {item.nextStep && (
        <div className="flex flex-col gap-1 pt-2 border-t border-surface-border">
          <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
            What to do next
          </span>
          <p className="text-xs sm:text-sm font-semibold text-brand-800 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>{item.nextStep}</span>
          </p>
        </div>
      )}
    </div>
  );
};
