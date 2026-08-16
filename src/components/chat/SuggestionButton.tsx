import React from 'react';
import { cn } from '../../utils/cn';

export interface SuggestionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
}

export const SuggestionButton: React.FC<SuggestionButtonProps> = ({
  label,
  icon,
  className,
  onClick,
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50/80 border border-brand-200 rounded-md hover:bg-brand-100 active:bg-brand-200 transition-colors text-left shadow-subtle',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-brand-600">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
