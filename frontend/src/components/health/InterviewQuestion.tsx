import React from 'react';
import { InterviewQuestionData } from '../../types/health';
import { ChoiceQuestion } from './QuestionTypes/ChoiceQuestion';
import { YesNoQuestion } from './QuestionTypes/YesNoQuestion';
import { NumberQuestion } from './QuestionTypes/NumberQuestion';
import { SeverityQuestion } from './QuestionTypes/SeverityQuestion';
import { MultiSelectQuestion } from './QuestionTypes/MultiSelectQuestion';
import { TextQuestion } from './QuestionTypes/TextQuestion';
import { Heart } from 'lucide-react';

export interface InterviewQuestionProps {
  question: InterviewQuestionData;
  value: unknown;
  onChange: (val: unknown) => void;
  acknowledgement?: string | null;
}

export const InterviewQuestion: React.FC<InterviewQuestionProps> = ({
  question,
  value,
  onChange,
  acknowledgement,
}) => {
  const renderQuestionControl = () => {
    switch (question.type) {
      case 'choice':
        return (
          <ChoiceQuestion
            options={question.options || []}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );

      case 'yes_no':
        return (
          <YesNoQuestion
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );

      case 'number':
        return (
          <NumberQuestion
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={onChange}
            unit={question.unit}
            min={question.min}
            max={question.max}
          />
        );

      case 'severity':
        return (
          <SeverityQuestion
            value={typeof value === 'number' ? value : 0}
            onChange={onChange}
          />
        );

      case 'multi_select':
        return (
          <MultiSelectQuestion
            options={question.options || []}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
          />
        );

      case 'text':
        return (
          <TextQuestion
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6 my-auto animate-fade-in">
      
      {/* Optional Acknowledgement Banner */}
      {acknowledgement && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold flex items-center gap-2 shadow-subtle">
          <Heart className="w-4 h-4 text-brand-600 shrink-0 fill-white/20" />
          <span>{acknowledgement}</span>
        </div>
      )}

      {/* Main Question Heading */}
      <div className="flex flex-col gap-2 text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary leading-snug">
          {question.question}
        </h2>
        {question.description && (
          <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
            {question.description}
          </p>
        )}
      </div>

      {/* Control Area */}
      <div className="w-full pt-1">
        {renderQuestionControl()}
      </div>

    </div>
  );
};
