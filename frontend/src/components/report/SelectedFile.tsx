import React from 'react';
import { FileText, X, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

export interface SelectedFileProps {
  file: File;
  onRemove: () => void;
  onExplain: () => void;
  disabled?: boolean;
}

export const SelectedFile: React.FC<SelectedFileProps> = ({
  file,
  onRemove,
  onExplain,
  disabled = false,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPdf = file.type === 'application/pdf';

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 animate-fade-in">
      <div className="p-4 rounded-lg bg-surface-card border border-surface-border flex items-center justify-between shadow-subtle text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col truncate max-w-[280px] sm:max-w-xs">
            <span className="text-sm font-bold text-content-primary truncate">
              {file.name}
            </span>
            <span className="text-xs text-content-muted">
              {isPdf ? 'PDF Document' : 'Image Scan'} · {formatSize(file.size)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-1.5 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-elevated transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onExplain}
        disabled={disabled}
        className="w-full"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Explain this report
      </Button>
    </div>
  );
};
