import React from 'react';
import { useTranslation } from 'react-i18next';
import { useReference } from '../hooks';
import { todayIso } from '../format';
import type { Gender } from '../types';
import { ChipToggle, Field, Segmented, SelectInput, TextInput } from './ui';

export interface MemberDraft {
  name: string;
  gender: Gender | '';
  ageMode: 'years' | 'dob';
  age_years: string;
  dob: string;
  relation: string;
  marital_status: string;
  phone: string;
  chronic_conditions: string[];
}

export const emptyMember = (relation = ''): MemberDraft => ({
  name: '', gender: '', ageMode: 'years', age_years: '', dob: '', relation, marital_status: '', phone: '', chronic_conditions: [],
});

export const RELATIONS = [
  'HEAD', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'DAUGHTER_IN_LAW', 'SON_IN_LAW',
  'GRANDSON', 'GRANDDAUGHTER', 'BROTHER', 'SISTER', 'OTHER',
];

const RELATION_DEFAULT: Record<string, string> = {
  HEAD: 'Head of family', SPOUSE: 'Wife / Husband', SON: 'Son', DAUGHTER: 'Daughter', FATHER: 'Father',
  MOTHER: 'Mother', DAUGHTER_IN_LAW: 'Daughter-in-law', SON_IN_LAW: 'Son-in-law', GRANDSON: 'Grandson',
  GRANDDAUGHTER: 'Granddaughter', BROTHER: 'Brother', SISTER: 'Sister', OTHER: 'Other', CHILD: 'Child',
};

// Relations whose wording depends on the member's gender
const GENDERED: Record<string, Record<string, string>> = {
  SPOUSE: { F: 'WIFE', M: 'HUSBAND' },
  CHILD: { F: 'DAUGHTER', M: 'SON' },
};
const GENDERED_DEFAULT: Record<string, string> = { WIFE: 'Wife', HUSBAND: 'Husband' };

export const useRelationLabel = () => {
  const { t } = useTranslation('asha');
  return (code?: string | null, gender?: string) => {
    if (!code) return '';
    const resolved = (gender && GENDERED[code]?.[gender]) || code;
    return t(`relation.${resolved}`, GENDERED_DEFAULT[resolved] ?? RELATION_DEFAULT[resolved] ?? resolved);
  };
};

/** Returns an error message, or null when the member can be saved. */
export function validateMember(m: MemberDraft, t: (k: string, d: string) => string): string | null {
  if (!m.name.trim()) return t('member.errName', 'Enter the name');
  if (!m.gender) return t('member.errGender', 'Choose gender');
  if (m.ageMode === 'years' && (m.age_years === '' || Number(m.age_years) < 0 || Number(m.age_years) > 120)) {
    return t('member.errAge', 'Enter age in years');
  }
  if (m.ageMode === 'dob' && (!m.dob || m.dob > todayIso())) return t('member.errDob', 'Enter a valid date of birth');
  return null;
}

export function toMemberPayload(m: MemberDraft) {
  return {
    name: m.name.trim(),
    gender: m.gender,
    ...(m.ageMode === 'dob' ? { dob: m.dob } : { age_years: Number(m.age_years) }),
    relation: m.relation || null,
    marital_status: m.marital_status || null,
    phone: m.phone.trim() || null,
    chronic_conditions: m.chronic_conditions,
  };
}

export const MemberForm: React.FC<{ value: MemberDraft; onChange: (m: MemberDraft) => void; compact?: boolean }> = ({
  value: m, onChange, compact,
}) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  const relationLabel = useRelationLabel();
  const set = (patch: Partial<MemberDraft>) => onChange({ ...m, ...patch });
  const adult = m.ageMode === 'years' ? Number(m.age_years || 0) >= 15 : !!m.dob && m.dob <= `${new Date().getFullYear() - 15}-12-31`;

  return (
    <div className="space-y-4">
      <Field label={t('member.name', 'Full name')} required>
        <TextInput value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('member.namePh', 'e.g. Kamla Devi')} autoComplete="off" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('member.gender', 'Gender')} <span className="text-red-500">*</span></span>
          <Segmented
            value={m.gender || ('' as Gender)}
            onChange={(g) => set({ gender: g })}
            options={[
              { value: 'F', label: t('gender.F', 'Female') },
              { value: 'M', label: t('gender.M', 'Male') },
              { value: 'O', label: t('gender.O', 'Other') },
            ]}
            className="w-full [&>button]:flex-1"
          />
        </div>
        <Field label={t('member.relation', 'Relation to head')}>
          <SelectInput value={m.relation} onChange={(e) => set({ relation: e.target.value })}>
            <option value="">—</option>
            {RELATIONS.map((r) => <option key={r} value={r}>{relationLabel(r)}</option>)}
          </SelectInput>
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold text-content-secondary">{t('member.age', 'Age')} <span className="text-red-500">*</span></span>
          <button
            type="button"
            onClick={() => set({ ageMode: m.ageMode === 'years' ? 'dob' : 'years' })}
            className="text-xs font-semibold text-brand-700 dark:text-brand-400"
          >
            {m.ageMode === 'years' ? t('member.useDob', 'Know exact date of birth?') : t('member.useYears', 'Enter age in years instead')}
          </button>
        </div>
        {m.ageMode === 'years' ? (
          <TextInput type="number" inputMode="numeric" min={0} max={120} value={m.age_years}
            onChange={(e) => set({ age_years: e.target.value })} placeholder={t('member.agePh', 'Years')} />
        ) : (
          <TextInput type="date" max={todayIso()} value={m.dob} onChange={(e) => set({ dob: e.target.value })} />
        )}
      </div>

      {adult && (
        <Field label={t('member.marital', 'Marital status')}>
          <SelectInput value={m.marital_status} onChange={(e) => set({ marital_status: e.target.value })}>
            <option value="">—</option>
            {['MARRIED', 'UNMARRIED', 'WIDOWED', 'SEPARATED'].map((s) => (
              <option key={s} value={s}>{t(`marital.${s}`, s[0] + s.slice(1).toLowerCase())}</option>
            ))}
          </SelectInput>
        </Field>
      )}

      {!compact && (
        <Field label={t('member.phone', 'Mobile number')} hint={t('member.phoneHint', 'Optional — for reminders')}>
          <TextInput type="tel" inputMode="tel" maxLength={10} value={m.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })} />
        </Field>
      )}

      {ref && (
        <div>
          <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('member.conditions', 'Long-term illness')}</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ref.chronic_conditions).map(([code, label]) => (
              <ChipToggle
                key={code}
                selected={m.chronic_conditions.includes(code)}
                onClick={() => set({
                  chronic_conditions: m.chronic_conditions.includes(code)
                    ? m.chronic_conditions.filter((c) => c !== code)
                    : [...m.chronic_conditions, code],
                })}
              >
                {t(`condition.${code}`, label)}
              </ChipToggle>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
