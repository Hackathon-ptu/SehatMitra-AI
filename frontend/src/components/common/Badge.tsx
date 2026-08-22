import React from 'react';
import { BadgeVariant } from '../../types/common';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'teal',
  size = 'md',
  icon,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    teal: 'bg-brand-50 text-brand-700 border-brand-200',
    blue: 'bg-medical-50 text-medical-700 border-medical-200',
    neutral: 'bg-surface-elevated text-content-secondary border-surface-border',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    emergency: 'bg-red-100 text-red-800 border-red-300 font-semibold',
    government: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    private: 'bg-slate-100 text-slate-800 border-slate-300',
    processing: 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse',
    ready: 'bg-teal-50 text-teal-800 border-teal-200',
    offline: 'bg-stone-100 text-stone-600 border-stone-300',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded',
    md: 'text-xs px-2.5 py-1 font-medium rounded-md gap-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border tracking-wide uppercase leading-tight select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
