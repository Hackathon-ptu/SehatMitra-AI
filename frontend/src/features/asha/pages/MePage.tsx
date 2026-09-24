import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, IndianRupee, LogOut, Megaphone, Phone, Plus, ShieldCheck, Users } from 'lucide-react';
import { ashaHttp, clearSession, errorMessage, readOutbox } from '../api';
import {
  Btn, EmptyState, Field, PageHeader, Panel, SectionTitle, SelectInput, Sheet, Skeleton, TextArea, TextInput, toast,
} from '../components/ui';
import { shortDate, todayIso } from '../format';
import { useAshaQuery, useReference } from '../hooks';
import type { Activity, AshaProfile, MonthlyReport } from '../types';

const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const MePage: React.FC = () => {
  const { t, i18n } = useTranslation('asha');
  const navigate = useNavigate();
  const ref = useReference();
  const thisMonth = todayIso().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const profile = useAshaQuery<AshaProfile>('/me');
  const report = useAshaQuery<MonthlyReport>('/reports/monthly', { month });
  const activities = useAshaQuery<{ activities: Activity[] }>('/activities');
  const [logging, setLogging] = useState(false);

  const logout = () => {
    const pending = readOutbox().length;
    if (pending && !window.confirm(t('me.logoutPending', { count: pending, defaultValue: '{{count}} records are not synced yet and stay on this phone. Log out anyway?' }))) return;
    clearSession();
    navigate('/asha-login', { replace: true });
  };

  const p = profile.data;
  const r = report.data;
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' });
  const maxType = r ? Math.max(1, ...Object.values(r.visits_by_type)) : 1;

  return (
    <div>
      <PageHeader title={t('me.title', 'My work')} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <Panel>
            <div className="flex items-center justify-between gap-3 mb-4">
              <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-xl hover:bg-surface-elevated" aria-label={t('me.prevMonth', 'Previous month')}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-content-muted font-semibold">{t('me.report', 'Monthly report')}</p>
                <p className="font-bold text-lg">{monthLabel}</p>
              </div>
              <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth}
                className="p-2 rounded-xl hover:bg-surface-elevated disabled:opacity-30" aria-label={t('me.nextMonth', 'Next month')}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {!r ? <Skeleton className="h-40" /> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <ReportStat label={t('me.visits', 'Home visits')} value={r.visits_total} />
                  <ReportStat label={t('me.familiesVisited', 'Families visited')} value={r.households_visited} />
                  <ReportStat label={t('me.vaccineDoses', 'Vaccine doses')} value={r.vaccine_doses} />
                  <ReportStat label={t('me.highRisk', 'High-risk found')} value={r.high_risk_identified} />
                  <ReportStat label={t('me.pregReg', 'Pregnancies registered')} value={r.pregnancies_registered} />
                  <ReportStat label={t('me.deliveries', 'Deliveries')} value={r.deliveries} note={r.deliveries ? t('me.institutional', { count: r.institutional_deliveries, defaultValue: '{{count}} in hospital' }) : undefined} />
                  <ReportStat label={t('me.fullyImmunized', 'Fully immunized')} value={r.children_fully_immunized} />
                  <ReportStat label={t('me.referrals', 'Referrals')} value={r.referrals_made} note={r.referrals_made ? t('me.reached', { count: r.referrals_completed, defaultValue: '{{count}} reached' }) : undefined} />
                </div>

                {Object.keys(r.visits_by_type).length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-content-muted mb-2">{t('me.byType', 'Visits by type')}</p>
                    <div className="space-y-2">
                      {Object.entries(r.visits_by_type).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
                        <div key={type} className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-sm">
                          <span className="text-content-secondary truncate">{t(`visitTypeShort.${type}`, type === 'GENERAL' ? 'General' : type === 'FOLLOW_UP' ? 'Follow-up' : type)}</span>
                          <span className="h-2.5 rounded-full bg-surface-elevated overflow-hidden">
                            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(n / maxType) * 100}%` }} />
                          </span>
                          <span className="text-right font-semibold tabular-nums">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={t('me.incentives', 'Estimated incentives')} action={r && (
              <span className="inline-flex items-center text-lg font-bold text-brand-700 dark:text-brand-400"><IndianRupee className="w-4 h-4" />{r.incentive_total.toLocaleString('en-IN')}</span>
            )} />
            {!r ? <Skeleton className="h-32" /> : (
              <>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-surface-border">
                    {r.incentives.map((i) => (
                      <tr key={i.code} className={i.count ? '' : 'text-content-muted'}>
                        <td className="py-2 pr-2">{t(`incentive.${i.code}`, i.label)}</td>
                        <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{i.count} × ₹{i.rate}</td>
                        <td className="py-2 pl-2 text-right font-semibold tabular-nums">₹{i.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-content-muted mt-3">
                  {t('me.incentiveNote', 'Indicative, based on central NHM activity rates. Your fixed monthly honorarium and state top-ups are not included; final amounts are verified by your ANM.')}
                </p>
              </>
            )}
          </Panel>

          <div>
            <SectionTitle
              title={t('me.activities', 'Community activities')}
              action={<Btn size="sm" tone="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setLogging(true)}>{t('me.logActivity', 'Log')}</Btn>}
            />
            {activities.data?.activities.length ? (
              <div className="space-y-2">
                {activities.data.activities.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface-card border border-surface-border px-4 py-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{t(`activity.${a.activity_type}`, ref?.activity_types[a.activity_type] ?? a.activity_type)}</p>
                      <p className="text-xs text-content-muted truncate">{[a.topic, shortDate(a.activity_date, i18n.language)].filter(Boolean).join(' · ')}</p>
                    </div>
                    {a.participants != null && <span className="text-xs text-content-muted inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{a.participants}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <Panel><EmptyState icon={<Megaphone className="w-6 h-6" />} title={t('me.noActivities', 'No activities logged')} body={t('me.noActivitiesBody', 'Log VHSND days, mothers’ meetings and awareness sessions here.')} /></Panel>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Panel>
            {!p ? <Skeleton className="h-40" /> : (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-14 h-14 rounded-2xl bg-brand-600 text-white text-xl font-bold flex items-center justify-center">{p.name[0]}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-lg truncate">{p.name}</p>
                    <p className="text-sm text-content-muted font-mono">{p.worker_id}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    [t('me.village', 'Village'), p.village],
                    [t('me.subCenter', 'Sub-centre'), p.sub_center],
                    [t('me.phc', 'PHC'), p.phc],
                    [t('me.district', 'District'), [p.block, p.district, p.state].filter(Boolean).join(', ')],
                    [t('me.population', 'Population'), p.population_covered?.toLocaleString('en-IN')],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3"><dt className="text-content-muted">{k}</dt><dd className="text-right">{v}</dd></div>
                  ))}
                </dl>
                {p.supervisor_name && (
                  <a href={p.supervisor_phone ? `tel:${p.supervisor_phone}` : undefined}
                    className="mt-4 flex items-center gap-3 rounded-xl bg-surface-elevated/60 px-3 py-2.5 hover:bg-surface-elevated">
                    <Phone className="w-4 h-4 text-brand-600" />
                    <span className="text-sm"><span className="text-content-muted">{t('me.supervisor', 'Supervisor')}:</span> {p.supervisor_name}</span>
                  </a>
                )}
              </>
            )}
          </Panel>

          <Panel className="text-sm text-content-secondary">
            <p className="flex items-center gap-2 font-semibold text-content-primary mb-1.5"><ShieldCheck className="w-4 h-4 text-brand-600" />{t('me.privacyTitle', 'Privacy')}</p>
            {t('me.privacy', 'You can see only the families assigned to you. Each record you open or change is logged. Log out when sharing this phone — saved data is removed from the device.')}
          </Panel>

          <Btn block size="lg" tone="secondary" icon={<LogOut className="w-4 h-4" />} onClick={logout} className="text-red-600 dark:text-red-400">
            {t('me.logout', 'Log out')}
          </Btn>
        </aside>
      </div>

      <ActivitySheet open={logging} onClose={() => setLogging(false)} onSaved={() => { setLogging(false); activities.reload(); report.reload(); }} />
    </div>
  );
};

const ReportStat: React.FC<{ label: string; value: number; note?: string }> = ({ label, value, note }) => (
  <div className="rounded-xl bg-surface-elevated/60 dark:bg-surface-elevated/40 p-3">
    <p className="text-2xl font-bold tabular-nums">{value}</p>
    <p className="text-xs text-content-muted leading-snug">{label}</p>
    {note && <p className="text-[11px] text-brand-700 dark:text-brand-400 font-medium mt-0.5">{note}</p>}
  </div>
);

const ActivitySheet: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
  const { t } = useTranslation('asha');
  const ref = useReference();
  const [form, setForm] = useState({ activity_type: 'VHSND', activity_date: todayIso(), topic: '', participants: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await ashaHttp.post('/activities', {
        ...form, topic: form.topic || null, notes: form.notes || null,
        participants: form.participants ? Number(form.participants) : null,
      });
      toast(t('me.activitySaved', 'Activity logged'));
      setForm({ activity_type: 'VHSND', activity_date: todayIso(), topic: '', participants: '', notes: '' });
      onSaved();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('me.logActivityTitle', 'Log a community activity')}
      footer={<Btn block size="lg" loading={saving} onClick={save}>{t('save', 'Save')}</Btn>}>
      <div className="space-y-4">
        <Field label={t('me.activityType', 'Activity')}>
          <SelectInput value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
            {Object.entries(ref?.activity_types ?? {}).map(([k, label]) => <option key={k} value={k}>{t(`activity.${k}`, label)}</option>)}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('me.date', 'Date')}>
            <TextInput type="date" max={todayIso()} value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} />
          </Field>
          <Field label={t('me.participants', 'People attended')}>
            <TextInput type="number" inputMode="numeric" min={0} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
          </Field>
        </div>
        <Field label={t('me.topic', 'Topic')}>
          <TextInput value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder={t('me.topicPh', 'e.g. Dengue prevention')} />
        </Field>
        <Field label={t('visit.notes', 'Notes')}>
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </Sheet>
  );
};
