import React from 'react';
import { AlertCircle, RotateCcw, UploadCloud } from 'lucide-react';
import { Button } from '../common/Button';

export interface ReportErrorProps {
  message?: string;
  onRetry: () => void;
  onUploadAnother: () => void;
}

export const ReportError: React.FC<ReportErrorProps> = ({
  message = "We couldn't read the test values in this report scan.",
  onRetry,
  onUploadAnother,
}) => {
  return (
    <div className="flex flex-col items-center text-center my-auto py-12 px-4 gap-5 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-subtle">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight text-content-primary">
          We couldn’t read this report.
        </h2>
        <p className="text-xs text-content-muted leading-relaxed">
          {message} Please ensure your PDF or image scan is clear and legible.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full pt-2">
        <Button variant="outline" size="md" onClick={onRetry} className="w-1/2" leftIcon={<RotateCcw className="w-4 h-4" />}>
          Try again
        </Button>
        <Button variant="primary" size="md" onClick={onUploadAnother} className="w-1/2" leftIcon={<UploadCloud className="w-4 h-4" />}>
          Choose another
        </Button>
      </div>
    </div>
  );
};
