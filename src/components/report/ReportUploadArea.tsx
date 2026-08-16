import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ReportUploadAreaProps {
  onFileSelected?: (file: File) => void;
  onError?: (errorMsg: string) => void;
  disabled?: boolean;
}

export const ReportUploadArea: React.FC<ReportUploadAreaProps> = ({
  onFileSelected,
  onError,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndPass = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      if (onError) onError("That file type isn't supported. Please upload a PDF or image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (onError) onError('File size exceeds 10 MB. Please select a smaller document.');
      return;
    }
    if (onFileSelected) onFileSelected(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPass(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      tabIndex={0}
      role="button"
      aria-label="Upload medical report"
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        'w-full max-w-xl mx-auto p-8 rounded-lg border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        isDragOver
          ? 'border-brand-600 bg-brand-50/80 shadow-subtle scale-[1.01]'
          : 'border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-stone-300'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
        {isDragOver ? (
          <FileText className="w-6 h-6 animate-bounce" />
        ) : (
          <UploadCloud className="w-6 h-6" />
        )}
      </div>

      <div className="flex flex-col gap-1 max-w-sm">
        <span className="text-base font-bold text-content-primary">
          {isDragOver ? 'Drop your report here' : 'Upload your medical report'}
        </span>
        <span className="text-xs text-content-muted leading-relaxed">
          PDF or image files are supported (up to 10 MB). You can upload a blood test, lab scan, or hospital report.
        </span>
      </div>
    </div>
  );
};
