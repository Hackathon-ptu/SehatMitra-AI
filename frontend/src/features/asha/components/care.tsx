import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Baby, CalendarCheck, ChevronRight, ClipboardList, HeartPulse, Hospital, Stethoscope, Syringe,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ageLabel, dueLabel, reasonLabel, shortDate, taskDetail, taskTitle, vaccineName } from '../format';
import { useReference } from '../hooks';
import type { CareTask, RiskReason, Tag, VaccineCardItem } from '../types';
import { Pill, StatusDot, Tone, statusTone } from './ui';

// ── Task routing ─────────────────────────────────────────────────────────────

export function taskHref(task: CareTask): string {
  const a = task.action;
  switch (a.type) {
    case 'visit': {
      const q = new URLSearchParams({ member: String(task.member.id), type: a.visit_type });
      if (a.schedule_key) q.set('key', a.schedule_key);
      return `/asha/visit?${q}`;
    }
    case 'immunization':
      return `/asha/members/${task.member.id}?action=vaccinate`;
    case 'delivery':
      return `/asha/members/${task.member.id}?action=delivery`;
    case 'referral':
      return `/asha/members/${task.member.id}?action=referral&id=${a.referral_id}`;
    default:
      return `/asha/members/${task.member.id}`;
  }
}

const KIND_ICON: Record<CareTask['kind'], React.ElementType> = {
  ANC: HeartPulse,
  PW_TD: Syringe,
  BIRTH_PREP: CalendarCheck,
  DELIVERY: Baby,
  HBNC: Baby,
  HBYC: Baby,
  IMMUNIZATION: Syringe,
  NCD: Stethoscope,
  FOLLOW_UP: ClipboardList,
  REFERRAL: Hospital,
};

const STATUS_RAIL: Record<CareTask['status'], string> = {
  overdue: 'before:bg-red-500',
  due: 'before:bg-amber-500',
  upcoming: 'before:bg-sky-500',
};

export const TaskCard: React.FC<{ task: CareTask; showHousehold?: boolean; compact?: boolean }> = ({
  task, showHousehold = true, compact,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');
  const ref = useReference();
  const Icon = KIND_ICON[task.kind] ?? ClipboardList;
  const detail = taskDetail(task, ref, t);

  return (
    <button
      onClick={() => navigate(taskHref(task))}
      className={cn(
        'group relative w-full text-left flex items-center gap-3 rounded-2xl bg-surface-card border border-surface-border pl-4 pr-3 py-3 overflow-hidden',
        'hover:border-brand-500/60 hover:shadow-elevated transition-all',
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
        STATUS_RAIL[task.status],
      )}
    >
      <span className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        task.high_risk ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
      )}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-content-primary text-[15px] leading-snug">{taskTitle(task, ref, t)}</span>
          {task.high_risk && <Pill tone="red" icon={<AlertTriangle className="w-3 h-3" />}>{t('highRisk', 'High risk')}</Pill>}
        </span>
        <span className="block text-sm text-content-secondary truncate">
          {task.member.name}
          <span className="text-content-muted"> · {ageLabel(task.member.dob, t)}</span>
          {showHousehold && task.household && (
            <span className="text-content-muted"> · {task.household.hamlet || task.household.household_code}</span>
          )}
        </span>
        {!compact && detail && <span className="block text-xs text-content-muted truncate mt-0.5">{detail}</span>}
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">
        <Pill tone={statusTone[task.status]}>{dueLabel(task.due_date, t)}</Pill>
        <ChevronRight className="w-4 h-4 text-content-disabled group-hover:text-brand-600 transition-colors" />
      </span>
    </button>
  );
};

// ── Member tags ──────────────────────────────────────────────────────────────

const TAG_TONE: Record<string, Tone> = {
  PREGNANT: 'pink',
  HIGH_RISK_PREGNANCY: 'red',
  HIGH_RISK: 'red',
  LACTATING: 'pink',
  ELIGIBLE_COUPLE: 'teal',
  NEWBORN: 'violet',
  INFANT: 'violet',
  CHILD_U5: 'sky',
  SENIOR: 'slate',
  CONDITION: 'amber',
  VACCINE_OVERDUE: 'red',
  REFERRAL_PENDING: 'amber',
  MIGRATED: 'slate',
  DECEASED: 'slate',
};

const TAG_DEFAULT: Record<string, string> = {
  PREGNANT: 'Pregnant · {{value}} wk',
  HIGH_RISK_PREGNANCY: 'High-risk pregnancy',
  HIGH_RISK: 'High risk',
  LACTATING: 'Lactating mother',
  ELIGIBLE_COUPLE: 'Eligible couple',
  NEWBORN: 'Newborn',
  INFANT: 'Infant',
  CHILD_U5: 'Under 5',
  SENIOR: 'Senior',
  VACCINE_OVERDUE: 'Vaccine overdue',
  REFERRAL_PENDING: 'Referral pending',
  MIGRATED: 'Migrated',
  DECEASED: 'Deceased',
};

export const useTagLabel = () => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  return (tag: Tag | string) => {
    const code = typeof tag === 'string' ? tag : tag.code;
    const value = typeof tag === 'string' ? undefined : tag.value;
    if (code === 'CONDITION') {
      return t(`condition.${value}`, ref?.chronic_conditions[String(value)] ?? String(value));
    }
    if (code === 'PREGNANT' && value === undefined) return t('tag.PREGNANT_SHORT', 'Pregnant');
    return t(`tag.${code}`, { value, defaultValue: TAG_DEFAULT[code] ?? code });
  };
};

export const TagList: React.FC<{ tags: (Tag | string)[]; max?: number; className?: string }> = ({ tags, max, className }) => {
  const label = useTagLabel();
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((tag, i) => {
        const code = typeof tag === 'string' ? tag : tag.code;
        return <Pill key={`${code}-${i}`} tone={TAG_TONE[code] ?? 'slate'}>{label(tag)}</Pill>;
      })}
      {max && tags.length > max && <Pill>+{tags.length - max}</Pill>}
    </div>
  );
};

// ── Risk reasons ─────────────────────────────────────────────────────────────

export const RiskReasons: React.FC<{ reasons: RiskReason[]; className?: string }> = ({ reasons, className }) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  if (!reasons.length) return null;
  return (
    <ul className={cn('space-y-1', className)}>
      {reasons.map((r, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', r.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500')} />
          <span className="text-content-secondary">{reasonLabel(r, ref, t)}</span>
        </li>
      ))}
    </ul>
  );
};

// ── Vaccine card ─────────────────────────────────────────────────────────────

const GROUP_DEFAULT: Record<string, string> = {
  BIRTH: 'At birth', W6: '6 weeks', W10: '10 weeks', W14: '14 weeks', M9: '9 months',
  M16: '16–24 months', Y5: '5–6 years', Y10: '10 years', Y16: '16 years',
};

const VACCINE_STATUS_TONE: Record<VaccineCardItem['status'], string> = {
  given: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  due: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  overdue: 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  upcoming: 'border-surface-border bg-surface-card text-content-secondary',
  missed: 'border-dashed border-surface-border bg-transparent text-content-disabled line-through',
};

export const VaccineCard: React.FC<{ items: VaccineCardItem[]; ageDays: number }> = ({ items, ageDays }) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const groups: Record<string, VaccineCardItem[]> = {};
  for (const it of items) (groups[it.group] ??= []).push(it);
  // Hide far-future milestones for young children to keep the card readable
  const visible = Object.entries(groups).filter(([, xs]) =>
    xs.some((x) => x.status !== 'upcoming') || (Date.parse(xs[0].due_date) - Date.now()) / 86_400_000 < 400 || ageDays < 60);

  return (
    <div className="space-y-3">
      {visible.map(([group, xs]) => (
        <div key={group} className="grid grid-cols-[88px_1fr] gap-3 items-start">
          <div className="pt-1.5">
            <p className="text-xs font-semibold text-content-secondary">{t(`vaccineGroup.${group}`, GROUP_DEFAULT[group] ?? group)}</p>
            <p className="text-[11px] text-content-muted">{shortDate(xs[0].due_date, i18n.language)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {xs.map((v) => (
              <span
                key={v.code}
                title={v.given_on ? `${t('givenOn', 'Given on')} ${shortDate(v.given_on, i18n.language)}` : undefined}
                className={cn('inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium', VACCINE_STATUS_TONE[v.status])}
              >
                {vaccineName(v.code, ref, t)}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-content-muted">
        {(['given', 'due', 'overdue', 'upcoming'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded border', VACCINE_STATUS_TONE[s])} />
            {t(`vaccineStatus.${s}`, s[0].toUpperCase() + s.slice(1))}
          </span>
        ))}
      </div>
    </div>
  );
};

export { StatusDot };
