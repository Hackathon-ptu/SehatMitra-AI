import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Baby, BadgeIndianRupee, Check, ClipboardList, HeartPulse, Home, Pencil, Phone, Plus, Send, Syringe,
} from 'lucide-react';
import { ashaHttp, errorMessage } from '../api';
import { RiskReasons, TagList, TaskCard, VaccineCard } from '../components/care';
import { useRelationLabel } from '../components/MemberForm';
import { DeliverySheet, EditMemberSheet, NewReferralSheet, PregnancySheet, VaccinateSheet } from '../components/sheets';
import {
  Avatar, Btn, ErrorState, ListSkeleton, PageHeader, Panel, Pill, SavedCopyNotice, SectionTitle, toast,
} from '../components/ui';
import { VisitList } from '../components/VisitList';
import { ageLabel, reasonLabel, shortDate, vaccineName } from '../format';
import { useAshaQuery, useReference } from '../hooks';
import type { MemberDetail, PregnancySummary } from '../types';
import { ReferralCard, ReferralUpdateSheet } from './ReferralsPage';

type SheetName = 'vaccinate' | 'delivery' | 'pregnancy' | 'referral' | 'newReferral' | 'edit' | null;

export const MemberPage: React.FC = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const relationLabel = useRelationLabel();
  const { data: m, loading, error, fromCache, savedAt, reload } = useAshaQuery<MemberDetail>(`/members/${id}`);
  const [sheet, setSheet] = useState<SheetName>(null);

  // Deep links from the work list: ?action=vaccinate | delivery | referral&id=
  const action = params.get('action') as SheetName;
  useEffect(() => {
    if (m && action) setSheet(action);
  }, [m, action]);

  const close = () => {
    setSheet(null);
    if (params.get('action')) {
      params.delete('action');
      params.delete('id');
      setParams(params, { replace: true });
    }
  };
  const saved = () => {
    close();
    reload();
  };

  if (error && !m) return <><PageHeader title=" " back /><ErrorState message={error} onRetry={reload} /></>;
  if (loading && !m) return <><PageHeader title=" " back /><ListSkeleton rows={4} /></>;
  if (!m) return null;

  const ageYears = m.age_days / 365.25;
  const canRegisterPregnancy = m.gender === 'F' && !m.pregnancy && ageYears >= 15 && ageYears < 50 && m.status === 'ACTIVE';
  const isChild = m.vaccine_card !== null;
  const referralToUpdate = sheet === 'referral' ? m.referrals.find((r) => String(r.id) === params.get('id')) ?? m.referrals.find((r) => r.status === 'PENDING') : undefined;

  const toggleScheme = async (code: string, enrolled: boolean) => {
    const next = enrolled ? m.enrolled_schemes.filter((c) => c !== code) : [...m.enrolled_schemes, code];
    try {
      await ashaHttp.patch(`/members/${m.id}`, { enrolled_schemes: next });
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const clearRisk = async () => {
    try {
      await ashaHttp.patch(`/members/${m.id}`, { risk_level: 'LOW' });
      toast(t('member.riskCleared', 'Risk flag cleared'));
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const visitHref = `/asha/visit?member=${m.id}`;

  return (
    <div>
      <PageHeader
        back
        title={m.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {[relationLabel(m.relation, m.gender), `${ageLabel(m.dob, t)}${m.dob_estimated ? ' (≈)' : ''}`, t(`gender.${m.gender}`, m.gender)].filter(Boolean).join(' · ')}
          </span>
        }
        actions={
          <>
            <Btn tone="ghost" size="md" icon={<Pencil className="w-4 h-4" />} onClick={() => setSheet('edit')} aria-label={t('member.edit', 'Edit details')} />
            <Link to={visitHref} className="hidden sm:block"><Btn icon={<Plus className="w-4 h-4" />}>{t('member.recordVisit', 'Record visit')}</Btn></Link>
          </>
        }
      />

      {fromCache && <SavedCopyNotice savedAt={savedAt} />}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link to={`/asha/households/${m.household.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-400 hover:underline">
          <Home className="w-4 h-4" />{t('household.of', { name: m.household.head_name, defaultValue: '{{name}} family' })}
        </Link>
        {m.phone && (
          <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 text-sm text-content-secondary"><Phone className="w-4 h-4" />{m.phone}</a>
        )}
        {m.tags.length > 0 && <TagList tags={m.tags} />}
      </div>

      {m.risk_level !== 'LOW' && (
        <div className={`mb-5 rounded-2xl border p-4 ${m.risk_level === 'HIGH'
          ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-content-primary">
              <AlertTriangle className={m.risk_level === 'HIGH' ? 'w-5 h-5 text-red-600' : 'w-5 h-5 text-amber-600'} />
              {m.risk_level === 'HIGH' ? t('member.highRisk', 'High risk — needs close follow-up') : t('member.moderateRisk', 'Needs attention')}
            </p>
            <button onClick={clearRisk} className="text-xs font-semibold text-content-muted hover:text-content-primary whitespace-nowrap">{t('member.clearRisk', 'Mark resolved')}</button>
          </div>
          <RiskReasons reasons={m.risk_reasons} className="mt-2" />
          {!m.referrals.some((r) => r.status === 'PENDING') && (
            <Btn size="sm" tone="secondary" className="mt-3" icon={<Send className="w-4 h-4" />} onClick={() => setSheet('newReferral')}>{t('member.refer', 'Refer')}</Btn>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {m.tasks.length > 0 && (
            <section>
              <SectionTitle title={t('member.pending', 'To do')} count={m.tasks.length} />
              <div className="space-y-2.5">{m.tasks.map((task) => <TaskCard key={task.id} task={task} showHousehold={false} />)}</div>
            </section>
          )}

          {m.pregnancy && (
            <PregnancyPanel
              p={m.pregnancy}
              tdDoses={m.pregnancy_vaccines.filter((v) => v.given_on >= m.pregnancy!.lmp_date)}
              onVisit={() => navigate(`${visitHref}&type=ANC`)}
              onDelivery={() => setSheet('delivery')}
              onTd={() => setSheet('vaccinate')}
            />
          )}

          {canRegisterPregnancy && (
            <button
              onClick={() => setSheet('pregnancy')}
              className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-pink-300 dark:border-pink-500/40 bg-pink-50/50 dark:bg-pink-500/5 px-4 py-3.5 text-left hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors"
            >
              <HeartPulse className="w-5 h-5 text-pink-600" />
              <span className="font-medium text-content-primary">{t('member.registerPregnancy', 'Register a pregnancy')}</span>
            </button>
          )}

          {isChild && m.vaccine_card && (
            <Panel>
              <SectionTitle
                title={t('member.vaccines', 'Vaccination card')}
                action={<Btn size="sm" icon={<Syringe className="w-4 h-4" />} onClick={() => setSheet('vaccinate')}>{t('member.recordVaccines', 'Record')}</Btn>}
              />
              <VaccineCard items={m.vaccine_card} ageDays={m.age_days} />
            </Panel>
          )}

          <section>
            <SectionTitle title={t('member.visits', 'Visit history')} count={m.visits.length} />
            {m.visits.length ? <VisitList visits={m.visits} /> : (
              <Panel className="text-sm text-content-muted flex items-center gap-2"><ClipboardList className="w-4 h-4" />{t('household.noVisits', 'No visits recorded yet.')}</Panel>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Panel>
            <div className="flex items-center gap-3">
              <Avatar name={m.name} gender={m.gender} size="lg" highRisk={m.risk_level === 'HIGH'} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{m.name}</p>
                <p className="text-xs text-content-muted">{t('member.born', 'Born')} {shortDate(m.dob, i18n.language)}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {m.birth_weight_kg && <Row label={t('member.birthWeight', 'Birth weight')} value={`${m.birth_weight_kg} kg`} />}
              {m.birth_place && <Row label={t('member.birthPlace', 'Born at')} value={t(`place.${m.birth_place}`, m.birth_place)} />}
              {m.mother && <Row label={t('member.mother', 'Mother')} value={<Link className="text-brand-700 dark:text-brand-400 font-medium" to={`/asha/members/${m.mother.id}`}>{m.mother.name}</Link>} />}
              {m.children.length > 0 && (
                <Row label={t('member.children', 'Children')} value={
                  <span className="flex flex-col items-end">
                    {m.children.map((c) => <Link key={c.id} className="text-brand-700 dark:text-brand-400 font-medium" to={`/asha/members/${c.id}`}>{c.name}</Link>)}
                  </span>
                } />
              )}
              {m.marital_status && <Row label={t('member.marital', 'Marital status')} value={t(`marital.${m.marital_status}`, m.marital_status.toLowerCase())} />}
              <Row label={t('member.abha', 'ABHA number')} value={m.abha_number || '—'} />
              {m.chronic_conditions.length > 0 && (
                <Row label={t('member.conditions', 'Long-term illness')} value={m.chronic_conditions.map((c) => t(`condition.${c}`, ref?.chronic_conditions[c] ?? c)).join(', ')} />
              )}
            </dl>
            {m.notes && <p className="mt-3 text-sm text-content-secondary border-t border-surface-border pt-3">{m.notes}</p>}
          </Panel>

          {m.schemes.length > 0 && (
            <Panel>
              <SectionTitle title={t('schemes.title', 'Government schemes')} />
              <div className="space-y-3">
                {m.schemes.map((s) => (
                  <div key={s.code} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <BadgeIndianRupee className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{t(`scheme.${s.code}`, ref?.schemes[s.code]?.label ?? s.code)}</p>
                      <p className="text-xs text-content-muted">{t(`schemeInfo.${s.code}`, ref?.schemes[s.code]?.summary ?? '')}</p>
                    </div>
                    <button
                      onClick={() => toggleScheme(s.code, s.enrolled)}
                      className={`shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors ${s.enrolled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                        : 'border-surface-border text-content-secondary hover:bg-surface-elevated'}`}
                    >
                      {s.enrolled ? <><Check className="w-3.5 h-3.5" />{t('schemes.enrolled', 'Enrolled')}</> : t('schemes.markEnrolled', 'Mark enrolled')}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <div>
            <SectionTitle
              title={t('household.referrals', 'Referrals')}
              count={m.referrals.length}
              action={<Btn size="sm" tone="secondary" icon={<Send className="w-4 h-4" />} onClick={() => setSheet('newReferral')}>{t('member.refer', 'Refer')}</Btn>}
            />
            <div className="space-y-2.5">
              {m.referrals.map((r) => <ReferralCard key={r.id} referral={r} onChanged={reload} hideFamily />)}
              {!m.referrals.length && <p className="text-sm text-content-muted">{t('member.noReferrals', 'No referrals.')}</p>}
            </div>
          </div>

          {m.past_pregnancies.length > 0 && (
            <Panel>
              <SectionTitle title={t('member.pastPregnancies', 'Past pregnancies')} />
              <ul className="space-y-2 text-sm">
                {m.past_pregnancies.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{t(`outcome.${p.outcome}`, p.outcome ?? '')}{p.delivery_place ? ` · ${t(`place.${p.delivery_place}`, p.delivery_place)}` : ''}</span>
                    <span className="text-content-muted">{shortDate(p.outcome_date, i18n.language)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      {/* Mobile primary action */}
      <Link to={visitHref} className="sm:hidden fixed right-4 bottom-24 z-30">
        <Btn size="lg" className="rounded-2xl shadow-lg shadow-brand-600/30" icon={<Plus className="w-5 h-5" />}>{t('member.recordVisit', 'Record visit')}</Btn>
      </Link>

      <VaccinateSheet open={sheet === 'vaccinate'} member={m} onClose={close} onSaved={saved} />
      <PregnancySheet open={sheet === 'pregnancy'} member={m} onClose={close} onSaved={saved} />
      <DeliverySheet open={sheet === 'delivery'} member={m} onClose={close} onSaved={(babies) => {
        close();
        if (babies[0]) navigate(`/asha/members/${babies[0]}`);
        else reload();
      }} />
      <NewReferralSheet open={sheet === 'newReferral'} memberId={m.id} onClose={close} onSaved={saved} />
      <EditMemberSheet open={sheet === 'edit'} member={m} onClose={close} onSaved={saved} />
      {referralToUpdate && <ReferralUpdateSheet open referral={referralToUpdate} onClose={close} onSaved={saved} />}
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="text-content-muted">{label}</dt>
    <dd className="text-right text-content-primary">{value}</dd>
  </div>
);

const PregnancyPanel: React.FC<{
  p: PregnancySummary; tdDoses: { code: string; given_on: string }[];
  onVisit: () => void; onDelivery: () => void; onTd: () => void;
}> = ({ p, tdDoses, onVisit, onDelivery, onTd }) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const weeks = p.gestation_weeks ?? 0;
  const pct = Math.min(100, (weeks / 40) * 100);

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4" /> {t('preg.current', 'Pregnancy')}
          </p>
          <p className="text-2xl font-bold mt-1">
            {t('preg.weeks', { weeks, days: p.gestation_days, defaultValue: '{{weeks}} weeks {{days}} days' })}
          </p>
          <p className="text-sm text-content-muted">
            {t('preg.trimester', { n: p.trimester, defaultValue: 'Trimester {{n}}' })} · {t('preg.edd', 'EDD')} {shortDate(p.edd, i18n.language)}
            {p.days_to_edd !== null && p.days_to_edd >= 0 && ` (${t('preg.daysLeft', { count: p.days_to_edd, defaultValue: '{{count}} days left' })})`}
          </p>
        </div>
        {p.high_risk && <Pill tone="red" icon={<AlertTriangle className="w-3 h-3" />}>{t('tag.HIGH_RISK_PREGNANCY', 'High-risk pregnancy')}</Pill>}
      </div>

      <div className="mt-4 h-2 rounded-full bg-surface-elevated overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-content-muted mt-1"><span>0</span><span>13</span><span>28</span><span>40 {t('preg.wk', 'wk')}</span></div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {p.anc.map((a) => {
          const current = !a.done && weeks >= a.from_week && weeks <= a.to_week;
          return (
            <div key={a.number} className={`rounded-xl border p-2.5 text-center ${a.done
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : current ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-surface-border'}`}>
              <p className="text-xs font-bold">ANC {a.number}</p>
              <p className="text-[11px] text-content-muted">{a.from_week}–{a.to_week} {t('preg.wk', 'wk')}</p>
              <p className="mt-1 text-[11px] font-semibold">
                {a.done ? <span className="text-emerald-700 dark:text-emerald-300">{t('done', 'Done')}</span>
                  : current ? <span className="text-amber-700 dark:text-amber-300">{t('dueNow', 'Due')}</span>
                    : <span className="text-content-muted">—</span>}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-content-muted">{t('preg.td', 'Td vaccine')}:</span>
        {tdDoses.length ? tdDoses.map((d) => <Pill key={d.code} tone="green">{vaccineName(d.code, ref, t)} · {shortDate(d.given_on, i18n.language)}</Pill>)
          : <Pill tone="amber">{t('preg.tdPending', 'Not given yet')}</Pill>}
      </div>

      {p.risk_factors.length > 0 && (
        <p className="mt-3 text-sm text-content-secondary">
          <span className="text-content-muted">{t('preg.riskFactors', 'Risk factors')}:</span> {p.risk_factors.map((c) => reasonLabel(c, ref, t)).join(', ')}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Btn icon={<Plus className="w-4 h-4" />} onClick={onVisit}>{t('preg.recordAnc', 'Record ANC visit')}</Btn>
        <Btn tone="secondary" icon={<Syringe className="w-4 h-4" />} onClick={onTd}>{t('preg.recordTd', 'Td vaccine')}</Btn>
        {weeks >= 28 && <Btn tone="secondary" icon={<Baby className="w-4 h-4" />} onClick={onDelivery}>{t('preg.recordDelivery', 'Record delivery')}</Btn>}
      </div>
    </Panel>
  );
};
