import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Baby, CheckCircle2, ChevronRight, ClipboardList, CloudOff, HeartPulse, Search, Stethoscope, Syringe, Ticket, UserRound,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { clearDraft, errorMessage, loadDraft, postOrQueue, saveDraft } from '../api';
import { RiskReasons, TagList, TaskCard } from '../components/care';
import { ReferralDraft, ReferralFields } from '../components/sheets';
import {
  Avatar, Btn, ChipToggle, EmptyState, ErrorState, Field, ListSkeleton, MeasureInput, PageHeader, Panel, Pill, SectionTitle,
  Segmented, TextArea, TextInput, riskTone, toast,
} from '../components/ui';
import { VoiceNote } from '../components/VoiceNote';
import { ageLabel, dangerSignName, shortDate, todayIso } from '../format';
import { useAshaQuery, useReference } from '../hooks';
import type {
  HouseholdListItem, MemberDetail, Referral, RiskReason, RiskLevel, TodayResponse, Visit, VisitType, VoiceDraft,
} from '../types';

// ── Entry: pick member → pick visit type → form ──────────────────────────────

export const VisitPage: React.FC = () => {
  const [params] = useSearchParams();
  const memberId = params.get('member');
  const type = params.get('type') as VisitType | null;
  const key = params.get('key');

  if (!memberId) return <MemberPicker />;
  return <VisitForMember memberId={memberId} type={type} scheduleKey={key} />;
};

const MemberPicker: React.FC = () => {
  const { t } = useTranslation('asha');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]);
  const today = useAshaQuery<TodayResponse>(debounced ? null : '/today');
  const search = useAshaQuery<{ households: HouseholdListItem[] }>(debounced ? '/households' : null, { q: debounced });
  const visitTasks = (today.data?.tasks ?? []).filter((x) => x.action.type === 'visit' && x.status !== 'upcoming' && x.kind !== 'NCD').slice(0, 6);
  const needle = debounced.toLowerCase();

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('visit.title', 'Record a visit')} subtitle={t('visit.pickMember', 'Whom are you visiting?')} />
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder={t('visit.searchPh', 'Search by name, house number or phone')}
          className="w-full h-12 rounded-2xl border border-surface-border bg-surface-card pl-10 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 placeholder:text-content-disabled"
        />
      </div>

      {!debounced ? (
        <section>
          <SectionTitle title={t('visit.suggested', 'Visits due now')} />
          {today.loading && !today.data ? <ListSkeleton rows={3} /> : visitTasks.length ? (
            <div className="space-y-2.5">{visitTasks.map((task) => <TaskCard key={task.id} task={task} compact />)}</div>
          ) : (
            <p className="text-sm text-content-muted">{t('visit.noneDue', 'No scheduled visits due. Search for a family above.')}</p>
          )}
        </section>
      ) : search.loading && !search.data ? <ListSkeleton rows={3} /> : !search.data?.households.length ? (
        <Panel><EmptyState icon={<Search className="w-6 h-6" />} title={t('households.noMatch', 'No family matches your search')} /></Panel>
      ) : (
        <div className="space-y-3">
          {search.data.households.map((h) => (
            <Panel key={h.id} padded={false}>
              <p className="px-4 pt-3 pb-2 text-xs font-semibold text-content-muted">{h.head_name} · <span className="font-mono">{h.household_code}</span></p>
              <div className="divide-y divide-surface-border">
                {[...h.members].sort((a, b) => Number(b.name.toLowerCase().includes(needle)) - Number(a.name.toLowerCase().includes(needle))).map((m) => (
                  <button key={m.id} onClick={() => navigate(`/asha/visit?member=${m.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-elevated transition-colors">
                    <Avatar name={m.name} gender={m.gender} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{m.name}</span>
                      <span className="block text-xs text-content-muted">{ageLabel(m.dob, t)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-content-disabled" />
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
};

const TYPE_META: Record<VisitType, { icon: React.ElementType; label: string; hint: string }> = {
  ANC: { icon: HeartPulse, label: 'Pregnancy check (ANC)', hint: 'BP, weight, Hb, danger signs' },
  HBNC: { icon: Baby, label: 'Newborn & mother (HBNC)', hint: 'Weight, temperature, feeding' },
  HBYC: { icon: Baby, label: 'Young child (HBYC)', hint: 'Growth, feeding, development' },
  NCD: { icon: Stethoscope, label: 'NCD screening (CBAC)', hint: 'BP, sugar, risk score' },
  FOLLOW_UP: { icon: ClipboardList, label: 'Follow-up', hint: 'Check on an earlier problem' },
  GENERAL: { icon: UserRound, label: 'General home visit', hint: 'Illness, counselling, anything else' },
};

function suggestedTypes(m: MemberDetail): VisitType[] {
  const types: VisitType[] = [];
  if (m.pregnancy) types.push('ANC');
  if (m.age_days <= 60) types.push('HBNC');
  else if (m.age_days <= 500) types.push('HBYC');
  if (m.age_days >= 30 * 365 && !m.pregnancy) types.push('NCD');
  types.push('FOLLOW_UP', 'GENERAL');
  return types;
}

const VisitForMember: React.FC<{ memberId: string; type: VisitType | null; scheduleKey: string | null }> = ({ memberId, type, scheduleKey }) => {
  const { t } = useTranslation('asha');
  const navigate = useNavigate();
  const { data: m, loading, error, reload } = useAshaQuery<MemberDetail>(`/members/${memberId}`);

  if (error && !m) return <><PageHeader title={t('visit.title', 'Record a visit')} back /><ErrorState message={error} onRetry={reload} /></>;
  if (loading && !m) return <><PageHeader title={t('visit.title', 'Record a visit')} back /><ListSkeleton rows={3} /></>;
  if (!m) return null;

  if (!type) {
    const suggested = suggestedTypes(m);
    const dueTask = m.tasks.find((x) => x.action.type === 'visit');
    return (
      <div className="max-w-2xl">
        <PageHeader back title={m.name} subtitle={t('visit.pickType', 'What kind of visit?')} />
        <div className="grid gap-2.5">
          {suggested.map((vt) => {
            const { icon: Icon, label, hint } = TYPE_META[vt];
            const due = dueTask?.action.type === 'visit' && dueTask.action.visit_type === vt ? dueTask : null;
            const q = new URLSearchParams({ member: String(m.id), type: vt });
            if (due?.action.type === 'visit' && due.action.schedule_key) q.set('key', due.action.schedule_key);
            return (
              <button key={vt} onClick={() => navigate(`/asha/visit?${q}`)}
                className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-card p-4 text-left hover:border-brand-500/60 hover:shadow-elevated transition-all">
                <span className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{t(`visitType.${vt}`, label)}</span>
                  <span className="block text-sm text-content-muted">{t(`visitHint.${vt}`, hint)}</span>
                </span>
                {due && <Pill tone={due.status === 'overdue' ? 'red' : 'amber'}>{t('dueNow', 'Due')}</Pill>}
                <ChevronRight className="w-4 h-4 text-content-disabled" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <VisitForm member={m} type={type} scheduleKey={scheduleKey} />;
};

// ── The form ─────────────────────────────────────────────────────────────────

interface FormState {
  visit_date: string;
  vitals: Record<string, string>;
  danger: string[];
  motherDanger: string[];
  counselling: string[];
  findings: Record<string, any>;
  notes: string;
  followup: string;
  refer: boolean;
  referral: ReferralDraft;
  transcript: string;
  inputMode: 'FORM' | 'VOICE';
  scheduleKey: string;
}

const VITALS_BY_TYPE: Record<VisitType, [string, string, string, string][]> = {
  // [field, label, unit, step]
  ANC: [['bp_systolic', 'BP (upper)', 'mmHg', '1'], ['bp_diastolic', 'BP (lower)', 'mmHg', '1'], ['weight_kg', 'Weight', 'kg', '0.1'], ['hb', 'Haemoglobin', 'g/dL', '0.1']],
  HBNC: [['weight_kg', 'Baby weight', 'kg', '0.01'], ['temperature_c', 'Temperature', '°C', '0.1']],
  HBYC: [['weight_kg', 'Weight', 'kg', '0.1'], ['muac_cm', 'MUAC', 'cm', '0.1'], ['temperature_c', 'Temperature', '°C', '0.1']],
  NCD: [['bp_systolic', 'BP (upper)', 'mmHg', '1'], ['bp_diastolic', 'BP (lower)', 'mmHg', '1'], ['blood_sugar', 'Blood sugar (random)', 'mg/dL', '1'], ['weight_kg', 'Weight', 'kg', '0.1']],
  GENERAL: [['temperature_c', 'Temperature', '°C', '0.1'], ['bp_systolic', 'BP (upper)', 'mmHg', '1'], ['bp_diastolic', 'BP (lower)', 'mmHg', '1'], ['spo2', 'SpO₂', '%', '1'], ['pulse', 'Pulse', '/min', '1'], ['blood_sugar', 'Blood sugar', 'mg/dL', '1']],
  FOLLOW_UP: [['temperature_c', 'Temperature', '°C', '0.1'], ['bp_systolic', 'BP (upper)', 'mmHg', '1'], ['bp_diastolic', 'BP (lower)', 'mmHg', '1'], ['spo2', 'SpO₂', '%', '1'], ['blood_sugar', 'Blood sugar', 'mg/dL', '1']],
};

const TOPICS_BY_TYPE: Record<VisitType, string[]> = {
  ANC: ['IFA_CALCIUM', 'NUTRITION', 'BIRTH_PREPAREDNESS', 'INSTITUTIONAL_DELIVERY', 'DANGER_SIGNS', 'FAMILY_PLANNING'],
  HBNC: ['EXCLUSIVE_BREASTFEEDING', 'KANGAROO_CARE', 'HANDWASHING', 'IMMUNIZATION', 'DANGER_SIGNS', 'FAMILY_PLANNING'],
  HBYC: ['COMPLEMENTARY_FEEDING', 'IMMUNIZATION', 'ORS_ZINC', 'HANDWASHING', 'NUTRITION', 'DANGER_SIGNS'],
  NCD: ['NCD_LIFESTYLE', 'NUTRITION', 'TB_ADHERENCE', 'DANGER_SIGNS'],
  GENERAL: ['DANGER_SIGNS', 'HANDWASHING', 'ORS_ZINC', 'NUTRITION', 'TB_ADHERENCE', 'NCD_LIFESTYLE', 'FAMILY_PLANNING', 'MENSTRUAL_HYGIENE'],
  FOLLOW_UP: ['DANGER_SIGNS', 'NUTRITION', 'TB_ADHERENCE', 'NCD_LIFESTYLE'],
};

/** Client-side mirror of the server's main thresholds, so the ASHA sees a warning before saving. */
function previewRisk(type: VisitType, f: FormState, severityOf: (c: string) => string | undefined, pregnant: boolean): RiskLevel {
  const n = (k: string) => (f.vitals[k] ? Number(f.vitals[k]) : null);
  let level: RiskLevel = 'LOW';
  const bump = (l: RiskLevel) => { if (l === 'HIGH' || (l === 'MODERATE' && level === 'LOW')) level = l; };
  [...f.danger, ...f.motherDanger].forEach((c) => bump(severityOf(c) === 'HIGH' ? 'HIGH' : 'MODERATE'));
  const sys = n('bp_systolic'); const dia = n('bp_diastolic');
  if (sys && dia) {
    if (sys >= 160 || dia >= 110) bump('HIGH');
    else if (sys >= 140 || dia >= 90) bump(pregnant ? 'HIGH' : 'MODERATE');
  }
  const hb = n('hb'); if (hb) bump(hb < 7 ? 'HIGH' : hb < (pregnant ? 11 : 10) ? 'MODERATE' : 'LOW');
  const spo2 = n('spo2'); if (spo2) bump(spo2 < 90 ? 'HIGH' : spo2 < 94 ? 'MODERATE' : 'LOW');
  const sugar = n('blood_sugar'); if (sugar) bump(sugar < 70 || sugar >= 300 ? 'HIGH' : sugar >= 200 ? 'MODERATE' : 'LOW');
  const w = n('weight_kg'); if (w && type === 'HBNC') bump(w < 1.8 ? 'HIGH' : w < 2.5 ? 'MODERATE' : 'LOW');
  const muac = n('muac_cm'); if (muac) bump(muac < 11.5 ? 'HIGH' : muac < 12.5 ? 'MODERATE' : 'LOW');
  const temp = n('temperature_c');
  if (temp) bump(type === 'HBNC' ? (temp >= 37.5 || temp < 35.5 ? 'HIGH' : 'LOW') : temp >= 39.5 ? 'HIGH' : temp >= 38 ? 'MODERATE' : 'LOW');
  return level;
}

function cbacPreview(ageDays: number, gender: string, c: Record<string, any>): number {
  const age = ageDays / 365;
  let s = age >= 60 ? 3 : age >= 50 ? 2 : age >= 40 ? 1 : 0;
  s += c.tobacco === 'DAILY' ? 2 : c.tobacco === 'PAST' ? 1 : 0;
  if (c.alcohol_daily) s += 1;
  const w = Number(c.waist_cm || 0);
  if (w) s += gender === 'F' ? (w > 90 ? 2 : w > 80 ? 1 : 0) : (w > 100 ? 2 : w > 90 ? 1 : 0);
  if (c.inactive) s += 1;
  if (c.family_history) s += 2;
  return s;
}

const VisitForm: React.FC<{ member: MemberDetail; type: VisitType; scheduleKey: string | null }> = ({ member: m, type, scheduleKey }) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  const draftKey = `visit:${m.id}:${type}:${scheduleKey ?? ''}`;
  const pregnant = !!m.pregnancy;
  const blank: FormState = {
    visit_date: todayIso(), vitals: {}, danger: [], motherDanger: [], counselling: [], findings: type === 'NCD' ? { cbac: { tobacco: 'NEVER' } } : {},
    notes: '', followup: '', refer: false,
    referral: { reason: '', urgency: 'ROUTINE', facility_type: 'PHC', facility_name: '' },
    transcript: '', inputMode: 'FORM', scheduleKey: scheduleKey ?? '',
  };
  const [f, setF] = useState<FormState>(() => loadDraft<FormState>(draftKey) ?? blank);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<null | { queued: true } | { queued: false; visit: Visit; risk: { level: RiskLevel; reasons: RiskReason[] }; referral: Referral | null }>(null);

  useEffect(() => saveDraft(draftKey, f), [draftKey, f]);

  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));
  const toggle = (list: 'danger' | 'motherDanger' | 'counselling', code: string) =>
    set({ [list]: f[list].includes(code) ? f[list].filter((c) => c !== code) : [...f[list], code] } as Partial<FormState>);
  const setFinding = (k: string, v: any) => set({ findings: { ...f.findings, [k]: v } });
  const setCbac = (k: string, v: any) => set({ findings: { ...f.findings, cbac: { ...(f.findings.cbac ?? {}), [k]: v } } });

  const severityOf = (c: string) => ref?.danger_signs[c]?.severity;
  const risk = previewRisk(type, f, severityOf, pregnant);
  const cbacScore = type === 'NCD' ? cbacPreview(m.age_days, m.gender, f.findings.cbac ?? {}) : null;
  const signs = ref?.danger_sign_sets[type] ?? [];
  const motherSigns = type === 'HBNC' ? ref?.danger_sign_sets.PNC ?? [] : [];

  // Pre-fill the referral reason from what was found
  const autoReason = useMemo(() => {
    const parts = [...f.danger, ...f.motherDanger].map((c) => dangerSignName(c, ref, t));
    if (f.vitals.bp_systolic && f.vitals.bp_diastolic) parts.push(`BP ${f.vitals.bp_systolic}/${f.vitals.bp_diastolic}`);
    if (pregnant && m.pregnancy?.gestation_weeks) parts.push(`${m.pregnancy.gestation_weeks} ${t('preg.wk', 'wk')}`);
    return parts.join(', ');
  }, [f.danger, f.motherDanger, f.vitals, ref, t, pregnant, m.pregnancy]);

  const enableReferral = () => set({
    refer: true,
    referral: {
      ...f.referral,
      reason: f.referral.reason || autoReason,
      urgency: risk === 'HIGH' ? ([...f.danger, ...f.motherDanger].some((c) => severityOf(c) === 'HIGH') ? 'EMERGENCY' : 'URGENT') : 'ROUTINE',
      facility_type: risk === 'HIGH' ? 'CHC' : f.referral.facility_type,
    },
  });

  const applyVoice = (d: VoiceDraft) => {
    const vitals = { ...f.vitals };
    Object.entries(d.vitals).forEach(([k, v]) => { if (v !== null && v !== undefined) vitals[k] = String(v); });
    const allowed = new Set([...signs, ...motherSigns]);
    set({
      vitals,
      danger: Array.from(new Set([...f.danger, ...d.danger_signs.filter((s) => signs.includes(s))])),
      motherDanger: Array.from(new Set([...f.motherDanger, ...d.danger_signs.filter((s) => motherSigns.includes(s) && !signs.includes(s))])),
      notes: f.notes || [d.summary, d.suggested_action].filter(Boolean).join('\n'),
      inputMode: 'VOICE',
    });
    if (d.danger_signs.some((s) => !allowed.has(s))) toast(t('voice.extraSigns', 'Some signs did not match this visit type'), 'info');
  };

  const save = async () => {
    if (f.refer && f.referral.reason.trim().length < 2) {
      toast(t('referral.needReason', 'Write the reason for referral'), 'error');
      return;
    }
    setSaving(true);
    const vitals: Record<string, number> = {};
    Object.entries(f.vitals).forEach(([k, v]) => { if (v !== '' && !Number.isNaN(Number(v))) vitals[k] = Number(v); });
    const body = {
      member_id: m.id,
      visit_type: type,
      schedule_key: f.scheduleKey || null,
      visit_date: f.visit_date,
      ...vitals,
      danger_signs: [...f.danger, ...f.motherDanger],
      findings: f.findings,
      counselling: f.counselling,
      notes: f.notes || null,
      next_followup_date: f.followup || null,
      input_mode: f.inputMode,
      voice_transcript: f.transcript || null,
      referral: f.refer ? {
        reason: f.referral.reason, urgency: f.referral.urgency,
        facility_type: f.referral.facility_type || null, facility_name: f.referral.facility_name || null,
      } : null,
    };
    try {
      const r = await postOrQueue<{ visit: Visit; risk: { level: RiskLevel; reasons: RiskReason[] }; referral: Referral | null }>(
        '/visits', body, `${m.name} · ${type}`,
      );
      clearDraft(draftKey);
      setResult(r.queued ? { queued: true } : { queued: false, ...r.data });
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast(errorMessage(e, t('saveFailed', 'Could not save. Try again.')), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (result) return <VisitResult member={m} result={result} />;

  const scheduleOptions = type === 'ANC'
    ? [...(ref?.anc_schedule ?? []).map((a) => ({ value: `ANC_${a.number}`, label: `ANC ${a.number} (${a.from_week}–${a.to_week} ${t('preg.wk', 'wk')})` })), { value: 'BIRTH_PREP', label: t('schedule.BIRTH_PREP', 'Birth preparedness') }]
    : type === 'HBNC'
      ? (ref?.hbnc_days ?? []).map((d) => ({ value: `HBNC_D${d}`, label: t('schedule.day', { d, defaultValue: 'Day {{d}}' }) }))
      : type === 'HBYC'
        ? (ref?.hbyc_months ?? []).map((mo) => ({ value: `HBYC_M${mo}`, label: t('schedule.month', { mo, defaultValue: '{{mo}} months' }) }))
        : [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        back
        title={t(`visitType.${type}`, TYPE_META[type].label)}
        subtitle={<span className="inline-flex items-center gap-2 flex-wrap">{m.name} · {ageLabel(m.dob, t)}{m.tags.length > 0 && <TagList tags={m.tags} max={2} />}</span>}
      />

      <div className="space-y-5">
        <VoiceNote visitType={type} transcript={f.transcript} onTranscript={(x) => set({ transcript: x })} onDraft={applyVoice} />

        <Panel>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('visit.date', 'Visit date')}>
              <TextInput type="date" value={f.visit_date} max={todayIso()} onChange={(e) => set({ visit_date: e.target.value })} />
            </Field>
            {scheduleOptions.length > 0 && (
              <Field label={type === 'ANC' ? t('visit.ancNumber', 'Which ANC check-up?') : t('visit.scheduleVisit', 'Which visit?')}>
                <select value={f.scheduleKey} onChange={(e) => set({ scheduleKey: e.target.value })}
                  className="w-full h-11 rounded-xl border border-surface-border bg-surface-card px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-600/40">
                  <option value="">{t('visit.auto', 'Auto')}</option>
                  {scheduleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={t('visit.measurements', 'Measurements')} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VITALS_BY_TYPE[type].map(([k, label, unit, step]) => (
              <MeasureInput key={k} label={t(`vitalField.${k}`, label)} unit={unit} step={step}
                value={f.vitals[k] ?? ''} onChange={(v) => set({ vitals: { ...f.vitals, [k]: v } })} />
            ))}
          </div>
          <p className="text-xs text-content-muted mt-3">{t('visit.skipHint', 'Leave blank what you could not measure.')}</p>
        </Panel>

        {/* Type-specific questions */}
        {type === 'ANC' && (
          <Panel>
            <SectionTitle title={t('visit.questions', 'Questions')} />
            <YesNo label={t('q.ifa', 'Taking iron (IFA) tablets daily?')} value={f.findings.ifa} onChange={(v) => setFinding('ifa', v)} />
            <YesNo label={t('q.calcium', 'Taking calcium tablets?')} value={f.findings.calcium} onChange={(v) => setFinding('calcium', v)} />
            <YesNo label={t('q.deliveryPlan', 'Delivery place & transport planned?')} value={f.findings.delivery_plan} onChange={(v) => setFinding('delivery_plan', v)} />
          </Panel>
        )}
        {type === 'HBNC' && (
          <Panel>
            <SectionTitle title={t('visit.questions', 'Questions')} />
            <div className="mb-3">
              <span className="block text-sm text-content-secondary mb-1.5">{t('q.breastfeeding', 'Breastfeeding')}</span>
              <Segmented value={f.findings.breastfeeding ?? ''} onChange={(v) => setFinding('breastfeeding', v)} options={[
                { value: 'EXCLUSIVE', label: t('q.bfExclusive', 'Only breastmilk') },
                { value: 'PARTIAL', label: t('q.bfPartial', 'Also other feeds') },
                { value: 'NONE', label: t('q.bfNone', 'Not feeding') },
              ]} />
            </div>
            <YesNo label={t('q.warm', 'Baby kept warm / skin-to-skin?')} value={f.findings.kept_warm} onChange={(v) => setFinding('kept_warm', v)} />
            <YesNo label={t('q.cordDry', 'Cord clean and dry?')} value={f.findings.cord_dry} onChange={(v) => setFinding('cord_dry', v)} />
          </Panel>
        )}
        {type === 'HBYC' && (
          <Panel>
            <SectionTitle title={t('visit.questions', 'Questions')} />
            <div className="mb-3">
              <span className="block text-sm text-content-secondary mb-1.5">{t('q.feeding', 'Feeding')}</span>
              <Segmented value={f.findings.feeding ?? ''} onChange={(v) => setFinding('feeding', v)} options={[
                { value: 'BREASTMILK', label: t('q.feedBm', 'Breastmilk only') },
                { value: 'COMPLEMENTARY', label: t('q.feedComp', 'Breastmilk + food') },
                { value: 'FAMILY_FOOD', label: t('q.feedFamily', 'Family food') },
              ]} />
            </div>
            <YesNo label={t('q.development', 'Milestones on track for age?')} value={f.findings.development_ok} onChange={(v) => setFinding('development_ok', v)} />
            <YesNo label={t('q.ifaSyrup', 'Getting IFA syrup twice a week?')} value={f.findings.ifa_syrup} onChange={(v) => setFinding('ifa_syrup', v)} />
          </Panel>
        )}
        {type === 'NCD' && (
          <Panel>
            <SectionTitle title={t('visit.cbac', 'CBAC risk questions')} action={cbacScore !== null && (
              <Pill tone={cbacScore > 4 ? 'red' : 'green'}>{t('visit.cbacScore', 'CBAC score')}: {cbacScore}</Pill>
            )} />
            <div className="mb-3">
              <span className="block text-sm text-content-secondary mb-1.5">{t('q.tobacco', 'Smoking or tobacco')}</span>
              <Segmented value={f.findings.cbac?.tobacco ?? 'NEVER'} onChange={(v) => setCbac('tobacco', v)} options={[
                { value: 'NEVER', label: t('q.never', 'Never') }, { value: 'PAST', label: t('q.past', 'Used to') }, { value: 'DAILY', label: t('q.daily', 'Daily') },
              ]} />
            </div>
            <YesNo label={t('q.alcohol', 'Drinks alcohol daily?')} value={f.findings.cbac?.alcohol_daily} onChange={(v) => setCbac('alcohol_daily', v)} />
            <YesNo label={t('q.inactive', 'Less than 150 min of activity a week?')} value={f.findings.cbac?.inactive} onChange={(v) => setCbac('inactive', v)} />
            <YesNo label={t('q.familyHistory', 'Parent/sibling has BP, diabetes or heart disease?')} value={f.findings.cbac?.family_history} onChange={(v) => setCbac('family_history', v)} />
            <div className="mt-3 max-w-[200px]">
              <MeasureInput label={t('q.waist', 'Waist')} unit="cm" value={f.findings.cbac?.waist_cm ?? ''} onChange={(v) => setCbac('waist_cm', v)} />
            </div>
          </Panel>
        )}

        <Panel>
          <SectionTitle title={type === 'HBNC' ? t('visit.babySigns', 'Danger signs in baby') : t('visit.dangerSigns', 'Danger signs')} />
          <div className="flex flex-wrap gap-2">
            {signs.map((c) => (
              <ChipToggle key={c} tone="danger" selected={f.danger.includes(c)} onClick={() => toggle('danger', c)}>{dangerSignName(c, ref, t)}</ChipToggle>
            ))}
          </div>
          {motherSigns.length > 0 && (
            <>
              <SectionTitle title={t('visit.motherSigns', 'Danger signs in mother')} className="mt-5" />
              <div className="flex flex-wrap gap-2">
                {motherSigns.map((c) => (
                  <ChipToggle key={c} tone="danger" selected={f.motherDanger.includes(c)} onClick={() => toggle('motherDanger', c)}>{dangerSignName(c, ref, t)}</ChipToggle>
                ))}
              </div>
            </>
          )}
        </Panel>

        {risk !== 'LOW' && (
          <div className={cn('rounded-2xl border p-4',
            risk === 'HIGH' ? 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10' : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10')}>
            <p className="flex items-center gap-2 font-semibold text-content-primary">
              <AlertTriangle className={cn('w-5 h-5', risk === 'HIGH' ? 'text-red-600' : 'text-amber-600')} />
              {risk === 'HIGH' ? t('visit.riskHigh', 'High risk — refer to a facility now') : t('visit.riskModerate', 'Needs attention — consider referral and follow up soon')}
            </p>
            {!f.refer && <Btn size="sm" className="mt-3" tone={risk === 'HIGH' ? 'danger' : 'secondary'} onClick={enableReferral}>{t('visit.addReferral', 'Add referral')}</Btn>}
          </div>
        )}

        <Panel>
          <SectionTitle title={t('visit.counselling', 'Counselling given')} />
          <div className="flex flex-wrap gap-2">
            {TOPICS_BY_TYPE[type].map((c) => (
              <ChipToggle key={c} selected={f.counselling.includes(c)} onClick={() => toggle('counselling', c)}>
                {t(`topic.${c}`, ref?.counselling_topics[c] ?? c)}
              </ChipToggle>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title={t('visit.referral', 'Referral')} className="mb-0" />
            <Segmented value={f.refer ? 'yes' : 'no'} onChange={(v) => (v === 'yes' ? enableReferral() : set({ refer: false }))}
              options={[{ value: 'no', label: t('no', 'No') }, { value: 'yes', label: t('visit.refer', 'Refer') }]} />
          </div>
          {f.refer && <div className="mt-4"><ReferralFields value={f.referral} onChange={(r) => set({ referral: r })} /></div>}
        </Panel>

        <Panel>
          <SectionTitle title={t('visit.next', 'Next visit')} />
          <div className="flex flex-wrap gap-2 mb-3">
            {[['', t('visit.noFollowup', 'As per schedule')], ['2', t('visit.in2', 'In 2 days')], ['7', t('visit.in7', 'In 1 week')], ['14', t('visit.in14', 'In 2 weeks')]].map(([days, label]) => {
              const date = days ? new Date(Date.parse(`${f.visit_date}T00:00:00`) + Number(days) * 86_400_000).toISOString().slice(0, 10) : '';
              return <ChipToggle key={days} selected={f.followup === date} onClick={() => set({ followup: date })}>{label}</ChipToggle>;
            })}
          </div>
          <TextInput type="date" value={f.followup} min={f.visit_date} onChange={(e) => set({ followup: e.target.value })} className="max-w-[220px]" />
          {risk !== 'LOW' && !f.followup && <p className="text-xs text-content-muted mt-2">{t('visit.autoFollowup', 'A follow-up will be set automatically because of the risk found.')}</p>}
        </Panel>

        <Field label={t('visit.notes', 'Notes')}>
          <TextArea value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder={t('visit.notesPh', 'Anything else you noticed or advised')} />
        </Field>

        <div className="sticky bottom-20 lg:bottom-4 z-20 flex gap-3 rounded-2xl bg-surface-bg/90 backdrop-blur py-2">
          <Btn tone="secondary" size="lg" onClick={() => { clearDraft(draftKey); setF(blank); }}>{t('clear', 'Clear')}</Btn>
          <Btn size="lg" block loading={saving} onClick={save} tone={f.refer && f.referral.urgency === 'EMERGENCY' ? 'danger' : 'primary'}>
            {f.refer ? t('visit.saveAndRefer', 'Save visit & referral') : t('visit.save', 'Save visit')}
          </Btn>
        </div>
      </div>
    </div>
  );
};

const URGENCY_DEFAULT = { ROUTINE: 'Routine', URGENT: 'Within 24h', EMERGENCY: 'Emergency' } as const;

const YesNo: React.FC<{ label: string; value: boolean | undefined; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => {
  const { t } = useTranslation('asha');
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-surface-border last:border-0">
      <span className="text-sm text-content-secondary">{label}</span>
      <Segmented value={value === undefined ? '' : value ? 'yes' : 'no'} onChange={(v) => onChange(v === 'yes')}
        options={[{ value: 'yes', label: t('yes', 'Yes') }, { value: 'no', label: t('no', 'No') }]} />
    </div>
  );
};

const VisitResult: React.FC<{
  member: MemberDetail;
  result: { queued: true } | { queued: false; visit: Visit; risk: { level: RiskLevel; reasons: RiskReason[] }; referral: Referral | null };
}> = ({ member, result }) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const vaccineDue = member.tasks.some((x) => x.kind === 'IMMUNIZATION' || x.kind === 'PW_TD');

  return (
    <div className="max-w-xl mx-auto text-center pt-6">
      {result.queued ? (
        <>
          <span className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 flex items-center justify-center"><CloudOff className="w-8 h-8" /></span>
          <h1 className="text-2xl font-bold mt-4">{t('result.queuedTitle', 'Saved on this phone')}</h1>
          <p className="text-content-muted mt-2">{t('result.queuedBody', 'No network right now. The visit will upload automatically when you are back online.')}</p>
        </>
      ) : (
        <>
          <span className={cn('mx-auto w-16 h-16 rounded-full flex items-center justify-center',
            result.risk.level === 'HIGH' ? 'bg-red-100 text-red-600 dark:bg-red-500/15' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15')}>
            {result.risk.level === 'HIGH' ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </span>
          <h1 className="text-2xl font-bold mt-4">{t('result.saved', 'Visit saved')}</h1>
          <p className="text-content-muted mt-1">{member.name}</p>
          <div className="mt-5 text-left">
            <Panel>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t('result.assessment', 'Assessment')}</span>
                <Pill tone={riskTone[result.risk.level]}>{t(`risk.${result.risk.level}`, result.risk.level)}</Pill>
              </div>
              {result.risk.reasons.length > 0
                ? <RiskReasons reasons={result.risk.reasons} className="mt-3" />
                : <p className="text-sm text-content-muted mt-2">{t('result.noRisk', 'No danger signs found.')}</p>}
              {result.visit.next_followup_date && (
                <p className="text-sm text-content-secondary mt-3">{t('result.followup', 'Next follow-up')}: <b>{shortDate(result.visit.next_followup_date, i18n.language)}</b></p>
              )}
            </Panel>
            {result.referral && (
              <Panel className="mt-3">
                <p className="font-semibold flex items-center gap-2"><Ticket className="w-4 h-4 text-brand-600" />{t('result.referral', 'Referral recorded')}</p>
                <p className="text-sm text-content-secondary mt-1">
                  {result.referral.facility_name || t(`facility.${result.referral.facility_type}`, ref?.facility_types[result.referral.facility_type ?? ''] ?? '')}
                  {' · '}{t(`urgency.${result.referral.urgency}`, URGENCY_DEFAULT[result.referral.urgency])}
                </p>
                {result.referral.opd_token && (
                  <p className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                    {t('result.token', 'Hospital token')}: <b className="font-mono">{result.referral.opd_token}</b> — {t('result.tokenHint', 'share this with the hospital. Call 108 for the ambulance.')}
                  </p>
                )}
              </Panel>
            )}
          </div>
        </>
      )}
      <div className="mt-6 grid gap-2.5">
        {vaccineDue && (
          <Link to={`/asha/members/${member.id}?action=vaccinate`}><Btn block size="lg" tone="secondary" icon={<Syringe className="w-4 h-4" />}>{t('result.vaccines', 'Record vaccines too')}</Btn></Link>
        )}
        <Link to={`/asha/members/${member.id}`}><Btn block size="lg" tone="secondary">{t('result.openRecord', 'Open health record')}</Btn></Link>
        <Link to="/asha"><Btn block size="lg">{t('result.backToday', 'Back to today’s list')}</Btn></Link>
      </div>
    </div>
  );
};
