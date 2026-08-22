import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';

export const ReportProcessing: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    'Reading report document...',
    'Finding important test values...',
    'Preparing plain-language explanations...',
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStepIndex(1), 500);
    const timer2 = setTimeout(() => setStepIndex(2), 1000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center my-auto py-12 px-4 gap-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle animate-pulse">
        <FileText className="w-8 h-8" />
      </div>

      <div className="flex flex-col gap-1.5 max-w-md">
        <h2 className="text-xl font-bold tracking-tight text-content-primary">
          Reading your report...
        </h2>
        <p className="text-xs text-content-muted leading-relaxed">
          We’re identifying the important test values before explaining them in simpler language.
        </p>
      </div>

      {/* Step Sequence */}
      <div className="w-full max-w-sm flex flex-col gap-2 bg-surface-card border border-surface-border rounded-md p-4 text-xs text-left">
        {steps.map((text, idx) => {
          const isDone = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <div key={idx} className="flex items-center gap-2.5">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <span className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
              )}
              <span className={isCurrent ? 'font-bold text-content-primary' : isDone ? 'text-content-secondary' : 'text-content-disabled'}>
                {text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Skeleton Preview */}
      <div className="w-full flex flex-col gap-3 pt-2">
        <Skeleton variant="text" width="60%" height="20px" />
        <Skeleton variant="rectangular" width="100%" height="60px" className="rounded-md" />
      </div>
    </div>
  );
};
