import React from 'react';
import { ArrowLeft, Globe } from 'lucide-react';
import { Badge } from '../common/Badge';
import { ThemeToggle } from '../common/ThemeToggle';

export interface InterviewHeaderProps {
  onBack: () => void;
  selectedLanguageName?: string;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  onBack,
  selectedLanguageName = 'English',
}) => {
  return (
    <header className="w-full bg-surface-card border-b border-surface-border h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-subtle z-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-brand-600 transition-colors py-1.5 px-2.5 rounded-md hover:bg-surface-elevated"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="h-4 w-px bg-surface-border" />
        <span className="text-sm font-bold text-content-primary">
          Health interview
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Badge variant="teal" size="sm" icon={<Globe className="w-3.5 h-3.5 text-brand-600" />}>
          {selectedLanguageName}
        </Badge>
      </div>
    </header>
  );
};
