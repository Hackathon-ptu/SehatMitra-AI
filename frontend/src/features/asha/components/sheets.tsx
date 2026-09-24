import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Baby, CloudOff, Plus, Trash2 } from 'lucide-react';
import { ashaHttp, errorMessage, postOrQueue } from '../api';
import { shortDate, todayIso, vaccineName } from '../format';
import { useReference } from '../hooks';
import type { Gender, MemberDetail, Urgency } from '../types';
import { Btn, ChipToggle, Field, Segmented, SelectInput, Sheet, TextArea, TextInput, toast } from './ui';

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ── Record vaccines ──────────────────────────────────────────────────────────

export const VaccinateSheet: React.FC<{ open: boolean; member: MemberDetail; onClose: () => void; onSaved: () => void }> = ({
  open, member, onClose, onSaved,
}) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const pregnant = !!member.pregnancy;

  const options = useMemo(() => {
    if (pregnant) {
      const given = new Set(member.pregnancy_vaccines.filter((v) => v.given_on >= member.pregnancy!.lmp_date).map((v) => v.code));
      return (ref?.pregnancy_vaccines ?? []).map((v) => ({ code: v.code, status: given.has(v.code) ? 'given' : 'due', due_date: null as string | null }));
    }
    return (member.vaccine_card ?? [])
      .filter((v) => v.status === 'due' || v.status === 'overdue' || (v.status === 'upcoming' && Date.parse(v.due_date) - Date.now() < 14 * 86_400_000))
      .map((v) => ({ code: v.code, status: v.status, due_date: v.due_date }));
  }, [member, pregnant, ref]);

  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(todayIso());
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(pregnant ? [] : options.filter((o) => o.status !== 'upcoming').map((o) => o.code));
      setDate(todayIso());
    }
  }, [open, options, pregnant]);

  const save = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      const r = await postOrQueue(`/members/${member.id}/immunizations`, { vaccines: selected, given_on: date, given_at: place || null },
        `${member.name}: ${selected.join(', ')}`);
      toast(r.queued ? t('offline.queued', 'Saved on phone — will sync when online') : t('vaccinate.saved', 'Vaccines recorded'), r.queued ? 'info' : 'success');
      onSaved();
    } catch (e) {
      toast(errorMessage(e, t('saveFailed', 'Could not save. Try again.')), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('vaccinate.title', { name: member.name, defaultValue: 'Vaccines given to {{name}}' })}
      footer={<Btn block size="lg" loading={saving} disabled={!selected.length} onClick={save}>
        {t('vaccinate.save', { count: selected.length, defaultValue: 'Save {{count}} vaccines' })}
      </Btn>}
    >
      {options.length === 0 ? (
        <p className="text-sm text-content-muted">{t('vaccinate.none', 'No vaccine is due right now.')}</p>
      ) : (
        <>
          <p className="text-sm text-content-muted mb-3">{t('vaccinate.hint', 'Tick the vaccines given today (check the MCP card).')}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {options.map((o) => (
              <ChipToggle
                key={o.code}
                selected={selected.includes(o.code)}
                onClick={() => setSelected((s) => (s.includes(o.code) ? s.filter((c) => c !== o.code) : [...s, o.code]))}
              >
                <span>
                  {vaccineName(o.code, ref, t)}
                  {o.status === 'overdue' && <span className="ml-1 text-[11px] font-semibold text-red-600 dark:text-red-400">· {t('vaccineStatus.overdue', 'Overdue')}</span>}
                  {o.status === 'given' && <span className="ml-1 text-[11px] text-content-muted">· {t('vaccineStatus.given', 'Given')}</span>}
                  {o.status === 'upcoming' && o.due_date && <span className="ml-1 text-[11px] text-content-muted">· {shortDate(o.due_date, i18n.language)}</span>}
                </span>
              </ChipToggle>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('vaccinate.date', 'Date given')}>
              <TextInput type="date" value={date} max={todayIso()} min={member.dob} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t('vaccinate.place', 'Where')}>
              <TextInput value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t('vaccinate.placePh', 'VHSND / PHC')} />
            </Field>
          </div>
        </>
      )}
    </Sheet>
  );
};

// ── Register pregnancy ───────────────────────────────────────────────────────

export const PregnancySheet: React.FC<{ open: boolean; member: MemberDetail; onClose: () => void; onSaved: () => void }> = ({
  open, member, onClose, onSaved,
}) => {
  const { t, i18n } = useTranslation('asha');
  const [lmp, setLmp] = useState('');
  const [gravida, setGravida] = useState('');
  const [parity, setParity] = useState('');
  const [rch, setRch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const weeks = lmp ? Math.floor((Date.parse(todayIso()) - Date.parse(lmp)) / (7 * 86_400_000)) : null;

  const save = async () => {
    if (!lmp) return setError(t('preg.needLmp', 'Enter the first day of the last period (LMP)'));
    setSaving(true);
    setError('');
    try {
      const { data } = await ashaHttp.post(`/members/${member.id}/pregnancies`, {
        lmp_date: lmp,
        gravida: gravida ? Number(gravida) : null,
        parity: parity ? Number(parity) : null,
        rch_id: rch || null,
      });
      toast(data.high_risk ? t('preg.savedHighRisk', 'Pregnancy registered — marked high risk') : t('preg.saved', 'Pregnancy registered'));
      onSaved();
    } catch (e) {
      setError(errorMessage(e, t('saveFailed', 'Could not save. Try again.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('preg.title', 'Register pregnancy')}
      footer={<Btn block size="lg" loading={saving} onClick={save}>{t('preg.save', 'Register')}</Btn>}>
      <div className="space-y-4">
        <Field label={t('preg.lmp', 'First day of last period (LMP)')} required>
          <TextInput type="date" value={lmp} max={todayIso()} min={addDays(todayIso(), -44 * 7)} onChange={(e) => setLmp(e.target.value)} />
        </Field>
        {lmp && weeks !== null && (
          <div className="rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-800 dark:text-pink-200 px-4 py-3 text-sm">
            <b>{t('preg.weeksNow', { weeks, defaultValue: '{{weeks}} weeks pregnant' })}</b>
            {' · '}{t('preg.edd', 'EDD')} {shortDate(addDays(lmp, 280), i18n.language)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('preg.gravida', 'Pregnancy number')} hint={t('preg.gravidaHint', 'Including this one')}>
            <TextInput type="number" inputMode="numeric" min={1} max={15} value={gravida} onChange={(e) => setGravida(e.target.value)} />
          </Field>
          <Field label={t('preg.parity', 'Children born before')}>
            <TextInput type="number" inputMode="numeric" min={0} max={15} value={parity} onChange={(e) => setParity(e.target.value)} />
          </Field>
        </div>
        <Field label={t('preg.rch', 'RCH / MCP card number')}>
          <TextInput value={rch} onChange={(e) => setRch(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Sheet>
  );
};

// ── Delivery outcome ─────────────────────────────────────────────────────────

interface BabyDraft { name: string; gender: Gender | ''; weight: string }

export const DeliverySheet: React.FC<{ open: boolean; member: MemberDetail; onClose: () => void; onSaved: (babyIds: number[]) => void }> = ({
  open, member, onClose, onSaved,
}) => {
  const { t } = useTranslation('asha');
  const [outcome, setOutcome] = useState<'LIVE_BIRTH' | 'STILLBIRTH' | 'MISCARRIAGE' | 'ABORTION'>('LIVE_BIRTH');
  const [date, setDate] = useState(todayIso());
  const [place, setPlace] = useState<'INSTITUTIONAL' | 'HOME'>('INSTITUTIONAL');
  const [facility, setFacility] = useState('');
  const [babies, setBabies] = useState<BabyDraft[]>([{ name: '', gender: '', weight: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const p = member.pregnancy;
  if (!p) return null;

  const save = async () => {
    if (outcome === 'LIVE_BIRTH' && babies.some((b) => !b.gender)) return setError(t('delivery.needGender', "Choose each baby's gender"));
    setSaving(true);
    setError('');
    try {
      const { data } = await ashaHttp.post(`/pregnancies/${p.id}/outcome`, {
        outcome,
        outcome_date: date,
        delivery_place: outcome === 'LIVE_BIRTH' || outcome === 'STILLBIRTH' ? place : null,
        facility_name: place === 'INSTITUTIONAL' ? facility || null : null,
        babies: outcome === 'LIVE_BIRTH'
          ? babies.map((b) => ({ name: b.name || null, gender: b.gender, birth_weight_kg: b.weight ? Number(b.weight) : null }))
          : [],
      });
      toast(t('delivery.saved', 'Delivery recorded. Newborn visits are now scheduled.'));
      onSaved(data.baby_ids ?? []);
    } catch (e) {
      setError(errorMessage(e, t('saveFailed', 'Could not save. Try again.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('delivery.title', 'Record delivery outcome')}
      footer={<Btn block size="lg" loading={saving} onClick={save}>{t('save', 'Save')}</Btn>}>
      <div className="space-y-4">
        <Field label={t('delivery.outcome', 'Outcome')}>
          <SelectInput value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            {(['LIVE_BIRTH', 'STILLBIRTH', 'MISCARRIAGE', 'ABORTION'] as const).map((o) => (
              <option key={o} value={o}>{t(`outcome.${o}`, { LIVE_BIRTH: 'Live birth', STILLBIRTH: 'Stillbirth', MISCARRIAGE: 'Miscarriage', ABORTION: 'Abortion' }[o])}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t('delivery.date', 'Date')}>
          <TextInput type="date" value={date} max={todayIso()} min={p.lmp_date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {(outcome === 'LIVE_BIRTH' || outcome === 'STILLBIRTH') && (
          <>
            <div>
              <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('delivery.place', 'Place of delivery')}</span>
              <Segmented value={place} onChange={setPlace} className="w-full [&>button]:flex-1" options={[
                { value: 'INSTITUTIONAL', label: t('place.INSTITUTIONAL', 'Hospital') },
                { value: 'HOME', label: t('place.HOME', 'Home') },
              ]} />
            </div>
            {place === 'INSTITUTIONAL' && (
              <Field label={t('delivery.facility', 'Hospital name')}>
                <TextInput value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="CHC / PHC / DH" />
              </Field>
            )}
          </>
        )}
        {outcome === 'LIVE_BIRTH' && (
          <div className="space-y-3">
            {babies.map((b, i) => (
              <div key={i} className="rounded-xl border border-surface-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2"><Baby className="w-4 h-4 text-violet-500" />{t('delivery.baby', 'Baby')} {babies.length > 1 ? i + 1 : ''}</span>
                  {babies.length > 1 && (
                    <button onClick={() => setBabies((xs) => xs.filter((_, j) => j !== i))} className="p-1 text-content-muted" aria-label={t('remove', 'Remove')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Segmented value={b.gender || ('' as Gender)} onChange={(g) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, gender: g } : x)))}
                  className="w-full [&>button]:flex-1"
                  options={[{ value: 'F', label: t('gender.girl', 'Girl') }, { value: 'M', label: t('gender.boy', 'Boy') }]} />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput type="number" inputMode="decimal" step="0.1" value={b.weight} placeholder={t('delivery.weight', 'Weight (kg)')}
                    onChange={(e) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} />
                  <TextInput value={b.name} placeholder={t('delivery.babyName', 'Name (optional)')}
                    onChange={(e) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                </div>
              </div>
            ))}
            {babies.length < 3 && (
              <button onClick={() => setBabies((xs) => [...xs, { name: '', gender: '', weight: '' }])}
                className="text-sm font-semibold text-brand-700 dark:text-brand-400 inline-flex items-center gap-1">
                <Plus className="w-4 h-4" />{t('delivery.twins', 'Add another baby (twins)')}
              </button>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Sheet>
  );
};

// ── New referral ─────────────────────────────────────────────────────────────

export interface ReferralDraft { reason: string; urgency: Urgency; facility_type: string; facility_name: string }

export const ReferralFields: React.FC<{ value: ReferralDraft; onChange: (r: ReferralDraft) => void }> = ({ value: r, onChange }) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  return (
    <div className="space-y-4">
      <Field label={t('referral.reason', 'Reason for referral')} required>
        <TextArea value={r.reason} onChange={(e) => onChange({ ...r, reason: e.target.value })} rows={2} />
      </Field>
      <div>
        <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('referral.urgency', 'How urgent?')}</span>
        <Segmented value={r.urgency} onChange={(u) => onChange({ ...r, urgency: u })} className="w-full [&>button]:flex-1" options={[
          { value: 'ROUTINE', label: t('urgency.ROUTINE', 'Routine') },
          { value: 'URGENT', label: t('urgency.URGENT', 'Within 24h') },
          { value: 'EMERGENCY', label: t('urgency.EMERGENCY', 'Emergency') },
        ]} />
        {r.urgency === 'EMERGENCY' && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">{t('referral.emergencyHint', 'Call 108 for the ambulance. The hospital will see this case in its queue.')}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('referral.facilityType', 'Facility')}>
          <SelectInput value={r.facility_type} onChange={(e) => onChange({ ...r, facility_type: e.target.value })}>
            <option value="">—</option>
            {Object.entries(ref?.facility_types ?? {}).map(([k, label]) => <option key={k} value={k}>{t(`facility.${k}`, label)}</option>)}
          </SelectInput>
        </Field>
        <Field label={t('referral.facilityName', 'Name')}>
          <TextInput value={r.facility_name} onChange={(e) => onChange({ ...r, facility_name: e.target.value })} placeholder="PHC Adampur" />
        </Field>
      </div>
    </div>
  );
};

export const NewReferralSheet: React.FC<{ open: boolean; memberId: number; onClose: () => void; onSaved: () => void }> = ({
  open, memberId, onClose, onSaved,
}) => {
  const { t } = useTranslation('asha');
  const [draft, setDraft] = useState<ReferralDraft>({ reason: '', urgency: 'ROUTINE', facility_type: 'PHC', facility_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (draft.reason.trim().length < 2) return setError(t('referral.needReason', 'Write the reason for referral'));
    setSaving(true);
    try {
      const { data } = await ashaHttp.post('/referrals', {
        member_id: memberId, reason: draft.reason, urgency: draft.urgency,
        facility_type: draft.facility_type || null, facility_name: draft.facility_name || null,
      });
      toast(data.opd_token ? t('referral.savedToken', { token: data.opd_token, defaultValue: 'Referral sent · hospital token {{token}}' }) : t('referral.saved', 'Referral recorded'));
      setDraft({ reason: '', urgency: 'ROUTINE', facility_type: 'PHC', facility_name: '' });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, t('saveFailed', 'Could not save. Try again.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('referral.new', 'Refer to a health facility')}
      footer={<Btn block size="lg" tone={draft.urgency === 'EMERGENCY' ? 'danger' : 'primary'} loading={saving} onClick={save}>{t('referral.send', 'Record referral')}</Btn>}>
      <ReferralFields value={draft} onChange={setDraft} />
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Sheet>
  );
};

// ── Edit member ──────────────────────────────────────────────────────────────

export const EditMemberSheet: React.FC<{ open: boolean; member: MemberDetail; onClose: () => void; onSaved: () => void }> = ({
  open, member, onClose, onSaved,
}) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  const [form, setForm] = useState({
    name: member.name, phone: member.phone ?? '', abha_number: member.abha_number ?? '',
    chronic_conditions: member.chronic_conditions, status: member.status, notes: member.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({
      name: member.name, phone: member.phone ?? '', abha_number: member.abha_number ?? '',
      chronic_conditions: member.chronic_conditions, status: member.status, notes: member.notes ?? '',
    });
  }, [open, member]);

  const save = async () => {
    setSaving(true);
    try {
      await ashaHttp.patch(`/members/${member.id}`, {
        ...form, phone: form.phone || null, abha_number: form.abha_number || null, notes: form.notes || null,
      });
      toast(t('saved', 'Saved'));
      onSaved();
    } catch (e) {
      toast(errorMessage(e, t('saveFailed', 'Could not save. Try again.')), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('member.edit', 'Edit details')}
      footer={<Btn block size="lg" loading={saving} onClick={save}>{t('save', 'Save')}</Btn>}>
      <div className="space-y-4">
        <Field label={t('member.name', 'Full name')}>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('member.phone', 'Mobile number')}>
            <TextInput type="tel" inputMode="tel" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('member.abha', 'ABHA number')}>
            <TextInput value={form.abha_number} onChange={(e) => setForm({ ...form, abha_number: e.target.value })} placeholder="14 digits" />
          </Field>
        </div>
        <div>
          <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('member.conditions', 'Long-term illness')}</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ref?.chronic_conditions ?? {}).map(([code, label]) => (
              <ChipToggle key={code} selected={form.chronic_conditions.includes(code)} onClick={() => setForm({
                ...form,
                chronic_conditions: form.chronic_conditions.includes(code)
                  ? form.chronic_conditions.filter((c) => c !== code) : [...form.chronic_conditions, code],
              })}>{t(`condition.${code}`, label)}</ChipToggle>
            ))}
          </div>
        </div>
        <Field label={t('member.status', 'Status')}>
          <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            <option value="ACTIVE">{t('status.ACTIVE', 'Living here')}</option>
            <option value="MIGRATED">{t('tag.MIGRATED', 'Migrated')}</option>
            <option value="DECEASED">{t('tag.DECEASED', 'Deceased')}</option>
          </SelectInput>
        </Field>
        <Field label={t('member.notes', 'Notes')}>
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </Sheet>
  );
};

export const QueuedNotice: React.FC = () => {
  const { t } = useTranslation('asha');
  return (
    <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
      <CloudOff className="w-4 h-4" /> {t('offline.queuedShort', 'Saved on this phone. It will upload automatically.')}
    </p>
  );
};
