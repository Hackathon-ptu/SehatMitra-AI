import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ashaHttp, clearDraft, errorMessage, loadDraft, saveDraft } from '../api';
import { MemberDraft, MemberForm, emptyMember, toMemberPayload, useRelationLabel, validateMember } from '../components/MemberForm';
import { Btn, Field, PageHeader, Panel, Segmented, SelectInput, TextInput, toast } from '../components/ui';
import { useAshaSession } from '../hooks';

interface FamilyDraft {
  hamlet: string;
  address: string;
  phone: string;
  social_category: string;
  is_bpl: boolean;
  drinking_water: string;
  has_toilet: '' | 'yes' | 'no';
  members: MemberDraft[];
  consent: boolean;
}

const DRAFT_KEY = 'new-household';
const blank = (): FamilyDraft => ({
  hamlet: '', address: '', phone: '', social_category: '', is_bpl: false, drinking_water: '', has_toilet: '',
  members: [emptyMember('HEAD')], consent: false,
});

export const NewHouseholdPage: React.FC = () => {
  const { t } = useTranslation('asha');
  const navigate = useNavigate();
  const session = useAshaSession();
  const relationLabel = useRelationLabel();
  const [form, setForm] = useState<FamilyDraft>(() => loadDraft<FamilyDraft>(DRAFT_KEY) ?? blank());
  const [openIdx, setOpenIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => saveDraft(DRAFT_KEY, form), [form]);

  const set = (patch: Partial<FamilyDraft>) => setForm((f) => ({ ...f, ...patch }));
  const setMember = (i: number, m: MemberDraft) => set({ members: form.members.map((x, j) => (j === i ? m : x)) });

  const save = async () => {
    setError('');
    for (let i = 0; i < form.members.length; i += 1) {
      const problem = validateMember(form.members[i], t);
      if (problem) {
        setOpenIdx(i);
        return setError(`${t('newHh.member', 'Member')} ${i + 1}: ${problem}`);
      }
    }
    if (!form.consent) return setError(t('newHh.needConsent', 'Family consent is needed before saving their health information.'));
    setSaving(true);
    try {
      const { data } = await ashaHttp.post('/households', {
        head_name: form.members[0].name.trim(),
        hamlet: form.hamlet || null,
        address: form.address || null,
        phone: form.phone || null,
        social_category: form.social_category || null,
        is_bpl: form.is_bpl,
        drinking_water: form.drinking_water || null,
        has_toilet: form.has_toilet === '' ? null : form.has_toilet === 'yes',
        consent_given: true,
        members: form.members.map(toMemberPayload),
      });
      clearDraft(DRAFT_KEY);
      toast(t('newHh.saved', { code: data.household_code, defaultValue: 'Family registered · {{code}}' }));
      navigate(`/asha/households/${data.id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e, t('saveFailed', 'Could not save. Try again.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        back="/asha/households"
        title={t('newHh.title', 'Register a family')}
        subtitle={session?.worker.village ? t('newHh.village', { village: session.worker.village, defaultValue: 'Village {{village}}' }) : undefined}
      />

      <div className="space-y-5">
        <Panel>
          <h2 className="font-semibold mb-4">{t('newHh.home', 'Home')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('newHh.hamlet', 'Ward / mohalla')}>
                <TextInput value={form.hamlet} onChange={(e) => set({ hamlet: e.target.value })} placeholder="Ward 1" />
              </Field>
              <Field label={t('newHh.phone', 'Family phone')}>
                <TextInput type="tel" inputMode="tel" maxLength={10} value={form.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
            <Field label={t('newHh.address', 'Landmark / address')}>
              <TextInput value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('newHh.category', 'Social category')}>
                <SelectInput value={form.social_category} onChange={(e) => set({ social_category: e.target.value })}>
                  <option value="">—</option>
                  {['GEN', 'OBC', 'SC', 'ST'].map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </Field>
              <Field label={t('newHh.water', 'Drinking water')}>
                <SelectInput value={form.drinking_water} onChange={(e) => set({ drinking_water: e.target.value })}>
                  <option value="">—</option>
                  {['PIPED', 'HANDPUMP', 'WELL', 'OTHER'].map((w) => <option key={w} value={w}>{t(`water.${w}`, w[0] + w.slice(1).toLowerCase())}</option>)}
                </SelectInput>
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('newHh.bpl', 'BPL / ration card')}</span>
                <Segmented value={form.is_bpl ? 'yes' : 'no'} onChange={(v) => set({ is_bpl: v === 'yes' })}
                  options={[{ value: 'yes', label: t('yes', 'Yes') }, { value: 'no', label: t('no', 'No') }]} />
              </div>
              <div>
                <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('newHh.toilet', 'Toilet at home')}</span>
                <Segmented value={form.has_toilet || ('' as 'yes')} onChange={(v) => set({ has_toilet: v })}
                  options={[{ value: 'yes', label: t('yes', 'Yes') }, { value: 'no', label: t('no', 'No') }]} />
              </div>
            </div>
          </div>
        </Panel>

        <div>
          <h2 className="font-semibold mb-3 px-1">{t('newHh.members', 'Family members')}</h2>
          <div className="space-y-3">
            {form.members.map((m, i) => (
              <Panel key={i} padded={false}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{m.name || (i === 0 ? t('newHh.head', 'Head of family') : t('newHh.newMember', 'New member'))}</span>
                    <span className="block text-xs text-content-muted">
                      {[relationLabel(m.relation), m.ageMode === 'years' && m.age_years ? `${m.age_years} ${t('yrs', 'yrs')}` : m.dob].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {i > 0 && (
                    <span role="button" tabIndex={0} aria-label={t('remove', 'Remove')}
                      onClick={(e) => { e.stopPropagation(); set({ members: form.members.filter((_, j) => j !== i) }); }}
                      className="p-2 text-content-muted hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </span>
                  )}
                  <ChevronDown className={cn('w-4 h-4 text-content-muted transition-transform', openIdx === i && 'rotate-180')} />
                </button>
                {openIdx === i && (
                  <div className="px-4 pb-4 border-t border-surface-border pt-4">
                    <MemberForm value={m} onChange={(next) => setMember(i, next)} />
                  </div>
                )}
              </Panel>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { set({ members: [...form.members, emptyMember()] }); setOpenIdx(form.members.length); }}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border py-3.5 text-sm font-semibold text-brand-700 dark:text-brand-400 hover:border-brand-500"
          >
            <UserPlus className="w-4 h-4" /> {t('newHh.addMember', 'Add another member')}
          </button>
        </div>

        <label className={cn('flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors',
          form.consent ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-500/10' : 'border-surface-border bg-surface-card')}>
          <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })}
            className="mt-1 w-5 h-5 rounded accent-brand-600" />
          <span>
            <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4 text-brand-600" />{t('newHh.consentTitle', 'Family has given consent')}</span>
            <span className="block text-sm text-content-muted mt-1">
              {t('newHh.consentBody', 'I explained that their health information will be recorded to plan their care, is seen only by their ASHA and health staff, and will not be shared for any other purpose.')}
            </span>
          </span>
        </label>

        {error && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm px-3 py-2.5">{error}</p>}

        <div className="flex gap-3">
          <Btn tone="secondary" size="lg" onClick={() => { clearDraft(DRAFT_KEY); setForm(blank()); setOpenIdx(0); }}>{t('clear', 'Clear')}</Btn>
          <Btn size="lg" block loading={saving} onClick={save}>{t('newHh.save', 'Register family')}</Btn>
        </div>
      </div>
    </div>
  );
};
