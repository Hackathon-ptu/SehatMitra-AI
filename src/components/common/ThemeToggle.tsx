import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { mode, setMode, cycleMode, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActiveIcon = () => {
    if (mode === 'system') return <Laptop className="w-4 h-4 text-brand-600 dark:text-brand-400" />;
    if (isDark) return <Moon className="w-4 h-4 text-amber-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  const getModeLabel = () => {
    if (mode === 'system') return 'System (Auto)';
    if (mode === 'dark') return 'Dark Mode';
    return 'Light Mode';
  };

  const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5 text-amber-400" /> },
    { value: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> },
  ];

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center gap-1 text-left', className)}>
      {/* Primary Direct Toggle Button (One Click Cycle: Light -> Dark -> System) */}
      <button
        type="button"
        onClick={cycleMode}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Current theme: ${getModeLabel()}. Click to switch theme.`}
        title={`Theme: ${getModeLabel()} (Click to toggle)`}
        className="p-2 rounded-md transition-all bg-surface-card border border-surface-border text-content-primary hover:bg-surface-elevated active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 flex items-center justify-center shadow-subtle"
      >
        {getActiveIcon()}
      </button>

      {/* Dropdown Options trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open theme options"
        className="text-[10px] font-bold text-content-muted hover:text-brand-600 px-1 py-0.5 rounded transition-colors hidden sm:block"
      >
        {mode.toUpperCase()}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-surface-card border border-surface-border rounded-md shadow-elevated py-1.5 z-50 text-left animate-fade-in">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
            Theme Preference
          </div>
          {options.map((opt) => {
            const isSelected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMode(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors',
                  isSelected
                    ? 'bg-brand-50/80 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-content-primary hover:bg-surface-elevated'
                )}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
