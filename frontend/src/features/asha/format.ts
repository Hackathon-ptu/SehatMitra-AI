import type { TFunction } from 'i18next';
import type { CareTask, ReferenceData, RiskReason } from './types';

const DAY = 86_400_000;

export const todayIso = () => {
  // India-first product: compute "today" in IST so it matches the server's work list
  const now = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60_000);
  return now.toISOString().slice(0, 10);
};

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY);

export function ageLabel(dobIso: string, t: TFunction): string {
  const days = daysBetween(dobIso, todayIso());
  if (days < 0) return '';
  if (days < 31) return t('age.days', { count: days, defaultValue: '{{count}} days' });
  const months = Math.floor(days / 30.44);
  if (months < 24) return t('age.months', { count: months, defaultValue: '{{count}} months' });
  return t('age.years', { count: Math.floor(days / 365.25), defaultValue: '{{count}} yrs' });
}

export function shortDate(iso: string | null | undefined, lang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

/** "Today", "Tomorrow", "3 days overdue", "in 5 days" */
export function dueLabel(iso: string, t: TFunction): string {
  const diff = daysBetween(todayIso(), iso);
  if (diff === 0) return t('due.today', 'Today');
  if (diff === 1) return t('due.tomorrow', 'Tomorrow');
  if (diff === -1) return t('due.yesterday', 'Since yesterday');
  if (diff > 1) return t('due.inDays', { count: diff, defaultValue: 'In {{count}} days' });
  return t('due.daysAgo', { count: -diff, defaultValue: 'Since {{count}} days' });
}

export function relativeDay(iso: string | null | undefined, t: TFunction, lang = 'en'): string {
  if (!iso) return t('never', 'Never');
  const diff = daysBetween(iso, todayIso());
  if (diff === 0) return t('due.today', 'Today');
  if (diff === 1) return t('yesterday', 'Yesterday');
  if (diff > 1 && diff < 30) return t('daysAgo', { count: diff, defaultValue: '{{count}} days ago' });
  return shortDate(iso, lang);
}

export const vaccineName = (code: string, ref: ReferenceData | null, t: TFunction) => {
  const label = ref?.vaccines.find((v) => v.code === code)?.label
    ?? ref?.pregnancy_vaccines.find((v) => v.code === code)?.label
    ?? code;
  return t(`vaccine.${code}`, label);
};

export const dangerSignName = (code: string, ref: ReferenceData | null, t: TFunction) =>
  t(`danger.${code}`, ref?.danger_signs[code]?.label ?? code.replace(/_/g, ' ').toLowerCase());

const REASON_DEFAULTS: Record<string, string> = {
  BP_SEVERE: 'Very high BP {{value}}',
  BP_HIGH: 'High BP {{value}}',
  SPO2_CRITICAL: 'Very low oxygen {{value}}%',
  SPO2_LOW: 'Low oxygen {{value}}%',
  NEWBORN_TEMPERATURE: 'Abnormal newborn temperature {{value}}°C',
  FEVER_HIGH: 'High fever {{value}}°C',
  FEVER: 'Fever {{value}}°C',
  HB_SEVERE: 'Severe anaemia (Hb {{value}})',
  HB_LOW: 'Anaemia (Hb {{value}})',
  SUGAR_LOW: 'Low blood sugar {{value}}',
  SUGAR_VERY_HIGH: 'Very high blood sugar {{value}}',
  SUGAR_HIGH: 'High blood sugar {{value}}',
  PULSE_ABNORMAL: 'Abnormal pulse {{value}}',
  LBW_VERY: 'Very low birth weight {{value}} kg',
  LBW: 'Low birth weight {{value}} kg',
  MUAC_SAM: 'Severe acute malnutrition (MUAC {{value}})',
  MUAC_MAM: 'Moderate malnutrition (MUAC {{value}})',
  CBAC_HIGH: 'CBAC score {{value}} — needs NCD screening',
  AGE_UNDER_18: 'Mother under 18',
  AGE_OVER_35: 'Mother over 35',
  GRAND_MULTIPARA: '5th or later pregnancy',
};

// Same reasons without a measured value (e.g. pregnancy risk factors)
const REASON_SHORT: Record<string, string> = {
  BP_SEVERE: 'Very high BP', BP_HIGH: 'High BP', SPO2_CRITICAL: 'Very low oxygen', SPO2_LOW: 'Low oxygen',
  NEWBORN_TEMPERATURE: 'Abnormal newborn temperature', FEVER_HIGH: 'High fever', FEVER: 'Fever',
  HB_SEVERE: 'Severe anaemia', HB_LOW: 'Anaemia', SUGAR_LOW: 'Low blood sugar', SUGAR_VERY_HIGH: 'Very high blood sugar',
  SUGAR_HIGH: 'High blood sugar', PULSE_ABNORMAL: 'Abnormal pulse', LBW_VERY: 'Very low birth weight', LBW: 'Low birth weight',
  MUAC_SAM: 'Severe acute malnutrition', MUAC_MAM: 'Moderate malnutrition', CBAC_HIGH: 'High CBAC score',
};

export function reasonLabel(r: RiskReason | string, ref: ReferenceData | null, t: TFunction): string {
  const code = typeof r === 'string' ? r : r.code;
  const value = typeof r === 'string' ? undefined : r.value;
  if (ref?.danger_signs[code]) return dangerSignName(code, ref, t);
  const fallback = code.replace(/_/g, ' ').toLowerCase();
  if (value === undefined || value === null || value === '') {
    return t(`reasonShort.${code}`, REASON_SHORT[code] ?? REASON_DEFAULTS[code] ?? fallback);
  }
  return t(`reason.${code}`, { value, defaultValue: REASON_DEFAULTS[code] ?? fallback });
}

export function taskTitle(task: CareTask, ref: ReferenceData | null, t: TFunction): string {
  const p = task.params;
  switch (task.kind) {
    case 'ANC':
      return t('task.anc', { n: p.number, defaultValue: 'ANC check-up {{n}}' });
    case 'PW_TD':
      return t('task.pwTd', { dose: vaccineName(p.dose, ref, t), defaultValue: '{{dose}} vaccine' });
    case 'BIRTH_PREP':
      return t('task.birthPrep', 'Birth preparedness plan');
    case 'DELIVERY':
      return daysBetween(todayIso(), task.due_date) > 0
        ? t('task.deliveryExpected', 'Delivery expected')
        : t('task.deliveryOutcome', 'Record delivery outcome');
    case 'HBNC':
      return t('task.hbnc', { day: p.label, defaultValue: 'Newborn visit · day {{day}}' });
    case 'HBYC':
      return t('task.hbyc', { month: p.label, defaultValue: 'Child visit · {{month}} months' });
    case 'IMMUNIZATION':
      return t('task.vaccines', 'Vaccination');
    case 'NCD':
      return t('task.ncd', 'NCD screening (CBAC)');
    case 'FOLLOW_UP':
      return t('task.followUp', 'Follow-up visit');
    case 'REFERRAL':
      return t('task.referral', 'Did they reach the facility?');
    default:
      return task.kind;
  }
}

export function taskDetail(task: CareTask, ref: ReferenceData | null, t: TFunction): string | null {
  const p = task.params;
  switch (task.kind) {
    case 'IMMUNIZATION':
      return (p.vaccines as string[]).map((c) => vaccineName(c, ref, t)).join(', ');
    case 'REFERRAL':
      return [p.facility, p.reason].filter(Boolean).join(' · ');
    case 'DELIVERY':
      return t('task.edd', { date: shortDate(p.edd), defaultValue: 'EDD {{date}}' });
    case 'FOLLOW_UP':
      return t(`visitType.${p.after_visit_type}`, ref?.visit_types[p.after_visit_type as keyof ReferenceData['visit_types']] ?? '');
    default:
      return null;
  }
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
