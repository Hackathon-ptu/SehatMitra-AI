import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home, MapPin, Plus, Search, Users, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { TagList } from '../components/care';
import { Avatar, Btn, EmptyState, ErrorState, ListSkeleton, PageHeader, Panel, Pill, SavedCopyNotice } from '../components/ui';
import { relativeDay } from '../format';
import { useAshaQuery } from '../hooks';
import type { HouseholdListItem } from '../types';

type Filter = 'all' | 'due' | 'pregnant' | 'children' | 'high_risk';

export const HouseholdsPage: React.FC = () => {
  const { t, i18n } = useTranslation('asha');
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as Filter) || 'all';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  const { data, loading, error, fromCache, savedAt, reload } = useAshaQuery<{ total: number; households: HouseholdListItem[] }>(
    '/households', { filter, ...(debounced ? { q: debounced } : {}) },
  );

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    if (f === 'all') next.delete('filter');
    else next.set('filter', f);
    setParams(next, { replace: true });
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('filter.all', 'All') },
    { value: 'due', label: t('hhFilter.due', 'Work pending') },
    { value: 'pregnant', label: t('hhFilter.pregnant', 'Pregnant women') },
    { value: 'children', label: t('hhFilter.children', 'Children < 5') },
    { value: 'high_risk', label: t('hhFilter.highRisk', 'High risk') },
  ];

  return (
    <div>
      <PageHeader
        title={t('households.title', 'Families')}
        subtitle={data ? t('households.count', { count: data.total, defaultValue: '{{count}} families' }) : ' '}
        actions={
          <Link to="/asha/households/new">
            <Btn icon={<Plus className="w-4 h-4" />}>
              <span className="hidden sm:inline">{t('households.new', 'New family')}</span>
            </Btn>
          </Link>
        }
      />

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('households.search', 'Search name, house number or phone')}
          className="w-full h-12 rounded-2xl border border-surface-border bg-surface-card pl-10 pr-10 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 placeholder:text-content-disabled"
          type="search"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-content-muted" aria-label={t('clear', 'Clear')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar mb-4">
        <div className="flex gap-2 min-w-max">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-9 px-3.5 rounded-full text-sm font-medium border transition-colors',
                filter === f.value
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-surface-card border-surface-border text-content-secondary hover:bg-surface-elevated',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {fromCache && <SavedCopyNotice savedAt={savedAt} />}

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton rows={6} />
      ) : !data?.households.length ? (
        <Panel>
          <EmptyState
            icon={<Home className="w-6 h-6" />}
            title={debounced ? t('households.noMatch', 'No family matches your search') : t('households.none', 'No families here yet')}
            body={debounced ? undefined : t('households.noneBody', 'Register the families in your area to start tracking their health.')}
            action={!debounced && <Link to="/asha/households/new"><Btn icon={<Plus className="w-4 h-4" />}>{t('households.new', 'New family')}</Btn></Link>}
          />
        </Panel>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {data.households.map((h) => (
            <Link
              key={h.id}
              to={`/asha/households/${h.id}`}
              className="group rounded-2xl bg-surface-card border border-surface-border p-4 hover:border-brand-500/60 hover:shadow-elevated transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-content-primary truncate">{h.head_name}</p>
                  <p className="text-xs text-content-muted flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{h.household_code}</span>
                    {h.hamlet && <><span>·</span><MapPin className="w-3 h-3" />{h.hamlet}</>}
                  </p>
                </div>
                {(h.overdue > 0 || h.due > 0) ? (
                  <div className="flex gap-1">
                    {h.overdue > 0 && <Pill tone="red">{t('hh.overdue', { count: h.overdue, defaultValue: '{{count}} overdue' })}</Pill>}
                    {h.due > 0 && <Pill tone="amber">{t('hh.due', { count: h.due, defaultValue: '{{count}} due' })}</Pill>}
                  </div>
                ) : <ChevronRight className="w-4 h-4 text-content-disabled group-hover:text-brand-600" />}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {h.members.slice(0, 5).map((m) => (
                    <span key={m.id} className="ring-2 ring-surface-card rounded-full"><Avatar name={m.name} gender={m.gender} size="sm" /></span>
                  ))}
                </div>
                <span className="text-xs text-content-muted flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {h.member_count}
                </span>
                <span className="ml-auto text-xs text-content-muted">
                  {t('hh.lastVisit', 'Last visit')}: {relativeDay(h.last_visit_date, t, i18n.language)}
                </span>
              </div>

              {h.tags.length > 0 && <TagList tags={h.tags} max={4} className="mt-3" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
