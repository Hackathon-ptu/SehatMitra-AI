import React from 'react';
import { InterviewAnswerItem } from '../../types/health';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Edit2, ArrowRight } from 'lucide-react';

export interface InterviewReviewProps {
  answers: InterviewAnswerItem[];
  onEditQuestion: (questionId: string) => void;
  onFinishReview: () => void;
}

export const InterviewReview: React.FC<InterviewReviewProps> = ({
  answers,
  onEditQuestion,
  onFinishReview,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6 my-auto">
      <div className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-bold tracking-tight text-content-primary">
          Review what you’ve shared
        </h2>
        <p className="text-xs text-content-muted">
          You can edit any response before proceeding to assessment guidance.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {answers.map((item) => (
          <Card key={item.questionId} variant="basic" padding="sm" className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 max-w-[80%]">
              <span className="text-xs font-semibold text-content-muted">{item.questionText}</span>
              <span className="text-sm font-bold text-content-primary">{item.displayText || 'Not answered'}</span>
            </div>
            <button
              type="button"
              onClick={() => onEditQuestion(item.questionId)}
              className="p-2 text-brand-600 hover:bg-brand-50 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t border-surface-border flex justify-end">
        <Button variant="primary" size="md" onClick={onFinishReview} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Confirm & Complete
        </Button>
      </div>
    </div>
  );
};
