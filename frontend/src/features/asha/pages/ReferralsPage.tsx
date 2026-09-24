import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Send, Ticket, XCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { ashaHttp, errorMessage } from '../api';
import {
  Btn, EmptyState, ErrorState, Field, ListSkeleton, PageHeader, Panel, Pill, SavedCopyNotice, Segmented, Sheet, TextArea,
  TextInput, Tone, toast,
} from '../components/ui';
import { ageLabel, relativeDay, shortDate, todayIso } from '../format';
import { useAshaQuery, useReference } from '../hooks';
import type { Referral, ReferralStatus } from '../types';

const STATUS_TONE: Record<ReferralStatus, Tone> = { PENDING: 'amber', VISITED: 'green', NOT_VISITED: 'red', CLOSED: 'slate' };
const STATUS_DEFAULT: Record<ReferralStatus, string> = {
  PENDING: 'Awaiting confirmation', VISITED: 'Reached facility', NOT_VISITED: 'Did not go', CLOSED: 'Closed',
};
const URGENCY_TONE = { ROUTINE: 'slate', URGENT: 'amber', EMERGENCY: 'red' } as const;

export const ReferralsPage: React.FC = () => {
  const { t } = useTranslation('asha');
  const [tab, setTab] = useState<'PENDING' | 'DONE' | 'ALL'>('PENDING');
  const { data, loading, error, fromCache, savedAt, reload } = useAshaQuery<{ referrals: Referral[] }>('/referrals');

  const all = data?.referrals ?? [];
  const list = tab === 'ALL' ? all : tab === 'PENDING' ? all.filter((r) => r.status === 'PENDING') : all.filter((r) => r.status !== 'PENDING');
  const reached = all.filter((r) => r.status === 'VISITED').length;
  const closedTotal = all.filter((r) => r.status !== 'PENDING').length;

  return (
    <div>
      <PageHeader
        title={t('referrals.title', 'Referrals')}
        subtitle={t('referrals.subtitle', 'Track whether referred people actually reached the facility')}
      />

      {data && all.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <MiniStat label={t('referrals.open', 'Awaiting')} value={all.length - closedTotal} tone="amber" />
          <MiniStat label={t('referrals.reached', 'Reached')} value={reached} tone="green" />
          <MiniStat
            label={t('referrals.completion', 'Completion')}
            value={closedTotal ? `${Math.round((reached / closedTotal) * 100)}%` : '—'}
            tone="teal"
          />
        </div>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: 'PENDING', label: t('referrals.tabPending', 'To confirm') },
          { value: 'DONE', label: t('referrals.tabDone', 'Completed') },
          { value: 'ALL', label: t('filter.all', 'All') },
        ]}
      />

      {fromCache && <SavedCopyNotice savedAt={savedAt} />}

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton rows={4} />
      ) : list.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Send className="w-6 h-6" />}
            title={tab === 'PENDING' ? t('referrals.nonePending', 'No referrals waiting for confirmation') : t('referrals.none', 'No referrals yet')}
            body={t('referrals.noneBody', 'Refer someone from their health record or while recording a visit.')}
          />
        </Panel>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {list.map((r) => <ReferralCard key={r.id} referral={r} onChanged={reload} />)}
        </div>
      )}
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: React.ReactNode; tone: 'amber' | 'green' | 'teal' }> = ({ label, value, tone }) => (
  <div className="rounded-2xl bg-surface-card border border-surface-border p-3.5">
    <p className={cn('text-2xl font-bold tabular-nums',
      tone === 'amber' && 'text-amber-600 dark:text-amber-400',
      tone === 'green' && 'text-emerald-600 dark:text-emerald-400',
      tone === 'teal' && 'text-brand-700 dark:text-brand-400')}>{value}</p>
    <p className="text-xs text-content-muted mt-0.5">{label}</p>
  </div>
);

export const ReferralCard: React.FC<{ referral: Referral; onChanged: () => void; hideFamily?: boolean }> = ({
  referral: r, onChanged, hideFamily,
}) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('rounded-2xl bg-surface-card border p-4',
      r.urgency === 'EMERGENCY' && r.status === 'PENDING' ? 'border-red-300 dark:border-red-500/40' : 'border-surface-border')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!hideFamily && r.member && (
            <Link to={`/asha/members/${r.member.id}`} className="font-semibold text-content-primary hover:underline">
              {r.member.name}
              <span className="font-normal text-content-muted text-sm"> · {ageLabel(r.member.dob, t)}</span>
            </Link>
          )}
          <p className={cn('text-sm text-content-secondary', !hideFamily && 'mt-0.5')}>{r.reason}</p>
        </div>
        <Pill tone={URGENCY_TONE[r.urgency]}>{t(`urgency.${r.urgency}`, { ROUTINE: 'Routine', URGENT: 'Within 24h', EMERGENCY: 'Emergency' }[r.urgency])}</Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-content-muted">
        {(r.facility_name || r.facility_type) && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {r.facility_name || t(`facility.${r.facility_type}`, ref?.facility_types[r.facility_type ?? ''] ?? r.facility_type ?? '')}
          </span>
        )}
        <span>{t('referrals.referred', 'Referred')} {relativeDay(r.referred_on, t, i18n.language)}</span>
        {r.opd_token && (
          <span className="inline-flex items-center gap-1 font-mono text-content-secondary"><Ticket className="w-3.5 h-3.5" />{r.opd_token}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Pill tone={STATUS_TONE[r.status]}>
          {t(`refStatus.${r.status}`, STATUS_DEFAULT[r.status])}
          {r.visited_on ? ` · ${shortDate(r.visited_on, i18n.language)}` : ''}
        </Pill>
        {r.status === 'PENDING' ? (
          <Btn size="sm" onClick={() => setOpen(true)}>{t('referrals.update', 'Update')}</Btn>
        ) : (
          <button onClick={() => setOpen(true)} className="text-xs font-semibold text-content-muted hover:text-content-primary">{t('edit', 'Edit')}</button>
        )}
      </div>
      {r.outcome_notes && <p className="mt-2 text-xs text-content-secondary border-t border-surface-border pt-2">{r.outcome_notes}</p>}

      <ReferralUpdateSheet open={open} referral={r} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onChanged(); }} />
    </div>
  );
};

export const ReferralUpdateSheet: React.FC<{ open: boolean; referral: Referral; onClose: () => void; onSaved: () => void }> = ({
  open, referral: r, onClose, onSaved,
}) => {
  const { t } = useTranslation('asha');
  const [status, setStatus] = useState<ReferralStatus>(r.status === 'PENDING' ? 'VISITED' : r.status);
  const [date, setDate] = useState(r.visited_on ?? todayIso());
  const [notes, setNotes] = useState(r.outcome_notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await ashaHttp.patch(`/referrals/${r.id}`, { status, visited_on: status === 'VISITED' ? date : null, outcome_notes: notes || null });
      toast(t('saved', 'Saved'));
      onSaved();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const choices: { value: ReferralStatus; icon: React.ElementType; label: string; tone: string }[] = [
    { value: 'VISITED', icon: CheckCircle2, label: t('referrals.yesReached', 'Yes, reached the facility'), tone: 'text-emerald-600' },
    { value: 'NOT_VISITED', icon: XCircle, label: t('referrals.notReached', 'No, did not go'), tone: 'text-red-600' },
    { value: 'PENDING', icon: Send, label: t('referrals.stillPending', 'Not yet — check again later'), tone: 'text-amber-600' },
  ];

  return (
    <Sheet open={open} onClose={onClose}
      title={t('referrals.question', { name: r.member?.name ?? '', defaultValue: 'Did {{name}} reach the facility?' })}
      footer={<Btn block size="lg" loading={saving} onClick={save}>{t('save', 'Save')}</Btn>}>
      <p className="text-sm text-content-muted mb-4">{r.reason}</p>
      <div className="space-y-2 mb-4">
        {choices.map(({ value, icon: Icon, label, tone }) => (
          <button key={value} type="button" onClick={() => setStatus(value)}
            className={cn('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
              status === value ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'border-surface-border hover:bg-surface-elevated')}>
            <Icon className={cn('w-5 h-5', tone)} />{label}
          </button>
        ))}
      </div>
      {status === 'VISITED' && (
        <Field label={t('referrals.visitedOn', 'Date of visit')} className="mb-4">
          <TextInput type="date" value={date} max={todayIso()} min={r.referred_on} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}
      <Field label={status === 'NOT_VISITED' ? t('referrals.whyNot', 'Why not?') : t('referrals.outcome', 'What did the doctor say?')}>
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>
    </Sheet>
  );
};
