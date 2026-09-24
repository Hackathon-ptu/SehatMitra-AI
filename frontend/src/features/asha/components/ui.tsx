/**
 * Small UI kit for the ASHA portal. Built on the same surface/content/brand
 * tokens as the citizen app so both look like one product in light and dark.
 */
import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, CheckCircle2, CloudOff, Info, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import type { RiskLevel, TaskStatus } from '../types';

// ── Surfaces ─────────────────────────────────────────────────────────────────

export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }> = ({
  className, padded = true, ...props
}) => (
  <div
    className={cn('rounded-2xl bg-surface-card border border-surface-border shadow-subtle', padded && 'p-4 sm:p-5', className)}
    {...props}
  />
);

export const SectionTitle: React.FC<{ title: string; count?: number; action?: React.ReactNode; className?: string }> = ({
  title, count, action, className,
}) => (
  <div className={cn('flex items-center justify-between gap-3 mb-2.5', className)}>
    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-content-muted flex items-center gap-2">
      {title}
      {count !== undefined && (
        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] font-semibold text-content-secondary normal-case tracking-normal">
          {count}
        </span>
      )}
    </h2>
    {action}
  </div>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  back?: string | boolean;
  actions?: React.ReactNode;
}> = ({ title, subtitle, back, actions }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');
  return (
    <div className="flex items-start gap-3 mb-4 sm:mb-6">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="mt-0.5 p-2 -ml-2 rounded-xl text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors shrink-0"
          aria-label={t('back', 'Back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary truncate">{title}</h1>
        {subtitle && <div className="text-sm text-content-muted mt-0.5">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

// ── Pills & badges ───────────────────────────────────────────────────────────

export type Tone = 'red' | 'amber' | 'green' | 'teal' | 'sky' | 'violet' | 'pink' | 'slate';

const TONES: Record<Tone, string> = {
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-500/30',
  slate: 'bg-surface-elevated text-content-secondary ring-surface-border',
};

export const Pill: React.FC<{ tone?: Tone; icon?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  tone = 'slate', icon, className, children,
}) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>
    {icon}
    {children}
  </span>
);

export const statusTone: Record<TaskStatus, Tone> = { overdue: 'red', due: 'amber', upcoming: 'sky' };
export const riskTone: Record<RiskLevel, Tone> = { HIGH: 'red', MODERATE: 'amber', LOW: 'green' };

export const StatusDot: React.FC<{ status: TaskStatus }> = ({ status }) => (
  <span
    className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0', {
      'bg-red-500': status === 'overdue',
      'bg-amber-500': status === 'due',
      'bg-sky-500': status === 'upcoming',
    })}
  />
);

export const Avatar: React.FC<{ name: string; gender?: string; size?: 'sm' | 'md' | 'lg'; highRisk?: boolean }> = ({
  name, gender, size = 'md', highRisk,
}) => {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-bold shrink-0',
        size === 'sm' && 'w-8 h-8 text-xs',
        size === 'md' && 'w-10 h-10 text-sm',
        size === 'lg' && 'w-14 h-14 text-lg',
        gender === 'F'
          ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300'
          : gender === 'M'
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
            : 'bg-surface-elevated text-content-secondary',
      )}
    >
      {letters}
      {highRisk && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-surface-card" />}
    </span>
  );
};

// ── States ───────────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }> = ({
  icon, title, body, action,
}) => (
  <div className="flex flex-col items-center text-center py-10 px-6">
    {icon && <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center mb-3">{icon}</div>}
    <p className="font-semibold text-content-primary">{title}</p>
    {body && <p className="text-sm text-content-muted mt-1 max-w-sm">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => {
  const { t } = useTranslation('asha');
  return (
    <Panel className="flex flex-col items-center text-center py-10">
      <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
      <p className="text-sm text-content-secondary max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-400">
          <RefreshCw className="w-4 h-4" /> {t('retry', 'Try again')}
        </button>
      )}
    </Panel>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-xl bg-surface-elevated', className)} />
);

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-[72px]" />
    ))}
  </div>
);

export const SavedCopyNotice: React.FC<{ savedAt?: number }> = ({ savedAt }) => {
  const { t } = useTranslation('asha');
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2 text-xs font-medium">
      <CloudOff className="w-4 h-4 shrink-0" />
      {t('offline.savedCopy', 'Offline — showing information saved on this phone')}
      {savedAt ? ` (${new Date(savedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })})` : ''}
    </div>
  );
};

// ── Buttons ──────────────────────────────────────────────────────────────────

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export const Btn = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: React.ReactNode; block?: boolean;
}>(({ tone = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/50',
      size === 'sm' && 'text-xs px-3 h-8',
      size === 'md' && 'text-sm px-4 h-10',
      size === 'lg' && 'text-base px-5 h-12',
      tone === 'primary' && 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/20',
      tone === 'secondary' && 'bg-surface-card border border-surface-border text-content-primary hover:bg-surface-elevated',
      tone === 'ghost' && 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
      tone === 'danger' && 'bg-red-600 hover:bg-red-700 text-white',
      block && 'w-full',
      className,
    )}
    {...props}
  >
    {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
    {children}
  </button>
));
Btn.displayName = 'Btn';

// ── Form controls ────────────────────────────────────────────────────────────

const controlClass =
  'w-full h-11 rounded-xl border border-surface-border bg-surface-card px-3 text-[15px] text-content-primary placeholder:text-content-disabled focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors';

export const Field: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }> = ({
  label, hint, required, children, className,
}) => (
  <label className={cn('block', className)}>
    <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-content-muted mt-1">{hint}</span>}
  </label>
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(controlClass, className)} {...props} />,
);
TextInput.displayName = 'TextInput';

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
  <textarea className={cn(controlClass, 'h-auto min-h-[88px] py-2.5 resize-y', className)} {...props} />
);

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select className={cn(controlClass, 'appearance-none bg-[length:16px] bg-no-repeat bg-[right_12px_center] pr-9', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716C' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
    {...props}
  >
    {children}
  </select>
);

/** Number field with a unit suffix, sized for thumbs. Empty string means "not measured". */
export const MeasureInput: React.FC<{
  label: string; unit?: string; value: string; onChange: (v: string) => void; step?: string; placeholder?: string;
  warn?: boolean;
}> = ({ label, unit, value, onChange, step = '1', placeholder, warn }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-content-secondary mb-1.5">{label}</label>
      <div className={cn('flex items-center rounded-xl border bg-surface-card focus-within:ring-2 focus-within:ring-brand-600/40 transition-colors',
        warn ? 'border-red-400 dark:border-red-500/60' : 'border-surface-border focus-within:border-brand-600')}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 bg-transparent px-3 text-[15px] text-content-primary placeholder:text-content-disabled focus:outline-none"
        />
        {unit && <span className="pr-3 text-xs font-medium text-content-muted whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
};

/** Big tappable multi-select chips (danger signs, counselling topics…). */
export const ChipToggle: React.FC<{
  selected: boolean; onClick: () => void; children: React.ReactNode; tone?: 'danger' | 'brand';
}> = ({ selected, onClick, children, tone = 'brand' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border px-3 py-2 text-sm text-left transition-colors',
      selected
        ? tone === 'danger'
          ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/60'
          : 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200 dark:border-brand-500/60'
        : 'border-surface-border bg-surface-card text-content-secondary hover:bg-surface-elevated',
    )}
  >
    {selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
    {children}
  </button>
);

export function Segmented<T extends string>({ value, options, onChange, className }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-surface-elevated p-1 gap-1', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 h-9 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
            value === o.value ? 'bg-surface-card text-content-primary shadow-subtle' : 'text-content-muted hover:text-content-primary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Sheet (bottom sheet on phones, dialog on desktop) ────────────────────────

export const Sheet: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({
  open, onClose, title, children, footer,
}) => {
  const { t } = useTranslation('asha');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] asha-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-surface-card sm:rounded-2xl rounded-t-3xl shadow-2xl border border-surface-border asha-sheet-in">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-surface-border">
          <h2 className="text-base font-bold text-content-primary">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-content-muted hover:bg-surface-elevated" aria-label={t('close', 'Close')}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-surface-border pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

// ── Toasts ───────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'info' | 'error';
const TOAST_EVENT = 'asha-toast';

export const toast = (message: string, tone: ToastTone = 'success'): void => {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, tone } }));
};

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<{ id: number; message: string; tone: ToastTone }[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, message, tone }]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3500);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);
  return createPortal(
    <div className="fixed inset-x-0 bottom-24 lg:bottom-6 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
      {items.map((x) => (
        <div
          key={x.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg asha-fade-in max-w-md',
            x.tone === 'success' && 'bg-brand-700 text-white',
            x.tone === 'info' && 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900',
            x.tone === 'error' && 'bg-red-600 text-white',
          )}
        >
          {x.tone === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : x.tone === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
          {x.message}
        </div>
      ))}
    </div>,
    document.body,
  );
};
