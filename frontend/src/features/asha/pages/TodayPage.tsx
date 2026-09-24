import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Baby, CheckCircle2, ChevronDown, HeartPulse, Home, Send, Stethoscope, Syringe, Users } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { TaskCard } from '../components/care';
import { EmptyState, ErrorState, ListSkeleton, Panel, SavedCopyNotice, SectionTitle, Skeleton } from '../components/ui';
import { shortDate } from '../format';
import { useAshaQuery, useAshaSession } from '../hooks';
import type { CareTask, TodayResponse } from '../types';

type Filter = 'all' | 'mothers' | 'children' | 'vaccines' | 'followups' | 'screening';

const FILTER_KINDS: Record<Filter, CareTask['kind'][] | null> = {
  all: null,
  mothers: ['ANC', 'PW_TD', 'BIRTH_PREP', 'DELIVERY'],
  children: ['HBNC', 'HBYC'],
  vaccines: ['IMMUNIZATION', 'PW_TD'],
  followups: ['FOLLOW_UP', 'REFERRAL'],
  screening: ['NCD'],
};

export const TodayPage: React.FC = () => {
  const { t, i18n } = useTranslation('asha');
  const session = useAshaSession();
  const { data, loading, error, fromCache, savedAt, reload } = useAshaQuery<TodayResponse>('/today');
  const [filter, setFilter] = useState<Filter>('all');
  const [showScreening, setShowScreening] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);

  const { main, screening } = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const kinds = FILTER_KINDS[filter];
    const filtered = kinds ? tasks.filter((x) => kinds.includes(x.kind)) : tasks;
    return {
      main: filter === 'screening' ? filtered : filtered.filter((x) => x.kind !== 'NCD'),
      screening: filter === 'all' ? tasks.filter((x) => x.kind === 'NCD') : [],
    };
  }, [data, filter]);

  const overdue = main.filter((x) => x.status === 'overdue');
  const due = main.filter((x) => x.status === 'due');
  const upcoming = main.filter((x) => x.status === 'upcoming');
  // High-risk people with time-critical work pending
  const urgent = Array.from(new Map((data?.tasks ?? [])
    .filter((x) => x.high_risk && x.status !== 'upcoming' && x.kind !== 'NCD')
    .map((x) => [x.member.id, x.member.name])).values());
  const s = data?.summary;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('greet.morning', 'Good morning') : hour < 17 ? t('greet.afternoon', 'Good afternoon') : t('greet.evening', 'Good evening');

  const filters: { value: Filter; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: t('filter.all', 'All'), icon: CheckCircle2 },
    { value: 'mothers', label: t('filter.mothers', 'Mothers'), icon: HeartPulse },
    { value: 'children', label: t('filter.children', 'Newborn & child'), icon: Baby },
    { value: 'vaccines', label: t('filter.vaccines', 'Vaccines'), icon: Syringe },
    { value: 'followups', label: t('filter.followups', 'Follow-ups'), icon: Send },
    { value: 'screening', label: t('filter.screening', 'Screening'), icon: Stethoscope },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="min-w-0">
        <div className="mb-5">
          <p className="text-sm text-content-muted">{greeting},</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{session?.worker.name ?? 'ASHA'}</h1>
          <p className="text-sm text-content-muted mt-1">
            {data ? new Date(`${data.date}T00:00:00`).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ' '}
          </p>
        </div>

        {fromCache && <SavedCopyNotice savedAt={savedAt} />}

        {/* Headline numbers */}
        {s ? (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
            <StatTile tone="red" value={s.overdue} label={t('stat.overdue', 'Overdue')} />
            <StatTile tone="amber" value={s.due} label={t('stat.due', 'Due now')} />
            <StatTile tone="green" value={s.visited_today} label={t('stat.visited', 'Visited today')} />
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-3 mb-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[84px]" />)}</div>
        ) : null}

        {urgent.length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <p className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              {t('urgent.title', { count: urgent.length, defaultValue: '{{count}} high-risk people need you first' })}
            </p>
            <p className="text-sm text-red-700/80 dark:text-red-200/70 mt-1">
              {urgent.join(', ')}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar mb-4">
          <div className="flex gap-2 min-w-max">
            {filters.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border transition-colors',
                  filter === value
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-surface-card border-surface-border text-content-secondary hover:bg-surface-elevated',
                )}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <ListSkeleton />
        ) : main.length === 0 && screening.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title={t('today.allDone', 'Nothing pending here')}
              body={t('today.allDoneBody', 'Great work! Check other filters or visit a family to record a check-up.')}
            />
          </Panel>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <section>
                <SectionTitle title={t('section.overdue', 'Overdue')} count={overdue.length} />
                <div className="space-y-2.5">{overdue.map((x) => <TaskCard key={x.id} task={x} />)}</div>
              </section>
            )}
            {due.length > 0 && (
              <section>
                <SectionTitle title={t('section.due', 'Due now')} count={due.length} />
                <div className="space-y-2.5">{due.map((x) => <TaskCard key={x.id} task={x} />)}</div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section>
                <SectionTitle
                  title={t('section.upcoming', 'Coming up this week')}
                  count={upcoming.length}
                  action={<CollapseToggle open={showUpcoming} onClick={() => setShowUpcoming((v) => !v)} />}
                />
                {showUpcoming && <div className="space-y-2.5">{upcoming.map((x) => <TaskCard key={x.id} task={x} />)}</div>}
              </section>
            )}
            {screening.length > 0 && (
              <section>
                <SectionTitle
                  title={t('section.screening', 'NCD screening due (30+ years)')}
                  count={screening.length}
                  action={<CollapseToggle open={showScreening} onClick={() => setShowScreening((v) => !v)} />}
                />
                {showScreening ? (
                  <div className="space-y-2.5">{screening.map((x) => <TaskCard key={x.id} task={x} compact />)}</div>
                ) : (
                  <p className="text-sm text-content-muted">
                    {t('today.screeningHint', 'Adults who have not had a CBAC screening in the last year.')}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Area snapshot */}
      <aside className="space-y-4 lg:sticky lg:top-[140px]">
        <Panel>
          <SectionTitle title={t('area.title', 'My area')} />
          {s ? (
            <>
              <p className="text-sm text-content-secondary mb-4">
                {t('area.coverage', { households: s.households, people: s.population, defaultValue: '{{households}} families · {{people}} people' })}
              </p>
              <dl className="grid grid-cols-2 gap-2.5">
                <AreaStat icon={HeartPulse} label={t('area.pregnant', 'Pregnant')} value={s.pregnant} note={s.high_risk_pregnancies ? t('area.highRisk', { count: s.high_risk_pregnancies, defaultValue: '{{count}} high risk' }) : undefined} />
                <AreaStat icon={Baby} label={t('area.newborns', 'Newborns')} value={s.newborns} />
                <AreaStat icon={Users} label={t('area.under5', 'Children < 5')} value={s.children_u5} />
                <AreaStat icon={Syringe} label={t('area.vaccineOverdue', 'Vaccine overdue')} value={s.vaccines_overdue} alert={s.vaccines_overdue > 0} />
                <AreaStat icon={Send} label={t('area.referrals', 'Referrals open')} value={s.referrals_pending} alert={s.referrals_pending > 0} />
                <AreaStat icon={AlertTriangle} label={t('area.highRiskPeople', 'High-risk people')} value={s.high_risk_members} alert={s.high_risk_members > 0} />
              </dl>
            </>
          ) : (
            <Skeleton className="h-48" />
          )}
        </Panel>
        <Link
          to="/asha/households/new"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-surface-border px-4 py-3.5 text-sm font-medium text-content-secondary hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
        >
          <Home className="w-5 h-5" /> {t('area.addFamily', 'Register a new family')}
        </Link>
        {data && <p className="text-xs text-content-muted px-1">{t('area.updated', 'Work list for')} {shortDate(data.date, i18n.language)}</p>}
      </aside>
    </div>
  );
};

const StatTile: React.FC<{ tone: 'red' | 'amber' | 'green'; value: number; label: string }> = ({ tone, value, label }) => (
  <div className={cn(
    'rounded-2xl p-3.5 sm:p-4 border',
    tone === 'red' && 'bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20',
    tone === 'amber' && 'bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20',
    tone === 'green' && 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  )}>
    <p className={cn(
      'text-2xl sm:text-3xl font-bold tabular-nums',
      tone === 'red' && 'text-red-700 dark:text-red-300',
      tone === 'amber' && 'text-amber-700 dark:text-amber-300',
      tone === 'green' && 'text-emerald-700 dark:text-emerald-300',
    )}>{value}</p>
    <p className="text-xs sm:text-sm font-medium text-content-secondary mt-0.5">{label}</p>
  </div>
);

const AreaStat: React.FC<{ icon: React.ElementType; label: string; value: number; note?: string; alert?: boolean }> = ({
  icon: Icon, label, value, note, alert,
}) => (
  <div className="rounded-xl bg-surface-elevated/60 dark:bg-surface-elevated/40 p-3">
    <dt className="flex items-center gap-1.5 text-xs text-content-muted"><Icon className="w-3.5 h-3.5" />{label}</dt>
    <dd className={cn('text-xl font-bold tabular-nums mt-0.5', alert ? 'text-red-600 dark:text-red-400' : 'text-content-primary')}>{value}</dd>
    {note && <dd className="text-[11px] font-medium text-red-600 dark:text-red-400">{note}</dd>}
  </div>
);

const CollapseToggle: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => {
  const { t } = useTranslation('asha');
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
      {open ? t('hide', 'Hide') : t('show', 'Show')}
      <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
    </button>
  );
};
