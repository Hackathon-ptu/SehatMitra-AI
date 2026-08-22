import React from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface VoiceButtonProps {
  isRecording?: boolean;
  onToggleRecording?: () => void;
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isRecording = false,
  onToggleRecording,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onToggleRecording}
      aria-label={isRecording ? 'Stop voice recording' : 'Start voice interaction'}
      title={isRecording ? 'Stop voice recording' : 'Start voice interaction'}
      className={cn(
        'relative p-2 rounded-md transition-all flex items-center justify-center gap-1 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        isRecording
          ? 'bg-red-500 text-white border border-red-600 shadow-md animate-pulse'
          : 'bg-surface-elevated text-content-secondary hover:text-brand-600 hover:bg-brand-50 border border-surface-border',
        className
      )}
    >
      {isRecording ? (
        <>
          <div className="flex items-center gap-0.5 h-4 px-0.5">
            <span className="w-0.5 bg-white rounded-full animate-wave-bar-1" />
            <span className="w-0.5 bg-white rounded-full animate-wave-bar-2" />
            <span className="w-0.5 bg-white rounded-full animate-wave-bar-3" />
            <span className="w-0.5 bg-white rounded-full animate-wave-bar-4" />
          </div>
          <Square className="w-3.5 h-3.5 fill-white shrink-0 ml-1" />
        </>
      ) : (
        <Mic className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
};
