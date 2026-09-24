import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeIndianRupee, ChevronRight, ClipboardList, Droplets, MapPin, Phone, Plus, ShieldCheck, TriangleAlert, UserPlus } from 'lucide-react';
import { ashaHttp, errorMessage } from '../api';
import { TagList, TaskCard } from '../components/care';
import { MemberDraft, MemberForm, emptyMember, toMemberPayload, useRelationLabel, validateMember } from '../components/MemberForm';
import { VisitList } from '../components/VisitList';
import {
  Avatar, Btn, ErrorState, ListSkeleton, PageHeader, Panel, Pill, SavedCopyNotice, SectionTitle, Sheet, riskTone, toast,
} from '../components/ui';
import { ageLabel, shortDate } from '../format';
import { useAshaQuery, useReference } from '../hooks';
import type { HouseholdDetail } from '../types';
import { ReferralCard } from './ReferralsPage';

export const HouseholdPage: React.FC = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const relationLabel = useRelationLabel();
  const { data: hh, loading, error, fromCache, savedAt, reload } = useAshaQuery<HouseholdDetail>(`/households/${id}`);
  const [adding, setAdding] = useState(false);

  if (error && !hh) return <><PageHeader title={t('familyTitle', 'Family')} back="/asha/households" /><ErrorState message={error} onRetry={reload} /></>;
  if (loading && !hh) return <><PageHeader title=" " back="/asha/households" /><ListSkeleton rows={4} /></>;
  if (!hh) return null;

  const active = hh.members.filter((m) => m.status === 'ACTIVE');
  const inactive = hh.members.filter((m) => m.status !== 'ACTIVE');
  const pendingSchemes = hh.schemes.filter((s) => !s.enrolled);
  const enrolledSchemes = hh.schemes.filter((s) => s.enrolled);

  return (
    <div>
      <PageHeader
        back="/asha/households"
        title={t('household.of', { name: hh.head_name, defaultValue: '{{name}} family' })}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono">{hh.household_code}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[hh.hamlet, hh.village].filter(Boolean).join(', ')}</span>
          </span>
        }
        actions={hh.phone && (
          <a href={`tel:${hh.phone}`} className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-surface-border bg-surface-card text-sm font-semibold hover:bg-surface-elevated">
            <Phone className="w-4 h-4 text-brand-600" /><span className="hidden sm:inline">{hh.phone}</span>
          </a>
        )}
      />

      {fromCache && <SavedCopyNotice savedAt={savedAt} />}

      <div className="flex flex-wrap gap-2 mb-5">
        {hh.is_bpl && <Pill tone="violet">{t('hh.bpl', 'BPL')}</Pill>}
        {hh.social_category && <Pill>{hh.social_category}</Pill>}
        {hh.drinking_water && <Pill icon={<Droplets className="w-3 h-3" />}>{t(`water.${hh.drinking_water}`, hh.drinking_water[0] + hh.drinking_water.slice(1).toLowerCase())}</Pill>}
        {hh.has_toilet === false && <Pill tone="amber" icon={<TriangleAlert className="w-3 h-3" />}>{t('hh.noToilet', 'No toilet')}</Pill>}
        {hh.consent_given && (
          <Pill tone="green" icon={<ShieldCheck className="w-3 h-3" />}>{t('hh.consent', 'Consent recorded')} {hh.consent_at ? shortDate(hh.consent_at, i18n.language) : ''}</Pill>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {hh.tasks.length > 0 && (
            <section>
              <SectionTitle title={t('household.pending', 'Pending for this family')} count={hh.tasks.length} />
              <div className="space-y-2.5">{hh.tasks.map((task) => <TaskCard key={task.id} task={task} showHousehold={false} />)}</div>
            </section>
          )}

          <section>
            <SectionTitle
              title={t('household.members', 'Family members')}
              count={active.length}
              action={<Btn size="sm" tone="secondary" icon={<UserPlus className="w-4 h-4" />} onClick={() => setAdding(true)}>{t('household.addMember', 'Add')}</Btn>}
            />
            <div className="grid sm:grid-cols-2 gap-2.5">
              {active.map((m) => (
                <Link
                  key={m.id}
                  to={`/asha/members/${m.id}`}
                  className="group flex items-start gap-3 rounded-2xl bg-surface-card border border-surface-border p-3.5 hover:border-brand-500/60 hover:shadow-elevated transition-all"
                >
                  <Avatar name={m.name} gender={m.gender} highRisk={m.risk_level === 'HIGH'} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-content-primary truncate">{m.name}</p>
                    <p className="text-xs text-content-muted">
                      {[relationLabel(m.relation, m.gender), ageLabel(m.dob, t), t(`gender.${m.gender}`, m.gender)].filter(Boolean).join(' · ')}
                    </p>
                    {m.tags.length > 0 && <TagList tags={m.tags} max={3} className="mt-2" />}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {m.task_counts.overdue > 0 && <Pill tone="red">{m.task_counts.overdue}</Pill>}
                    <ChevronRight className="w-4 h-4 text-content-disabled group-hover:text-brand-600" />
                  </div>
                </Link>
              ))}
            </div>
            {inactive.length > 0 && (
              <p className="text-xs text-content-muted mt-3">
                {t('household.inactive', 'Not living here')}: {inactive.map((m) => `${m.name} (${t(`tag.${m.status}`, m.status.toLowerCase())})`).join(', ')}
              </p>
            )}
          </section>

          <section>
            <SectionTitle title={t('household.visits', 'Recent visits')} count={hh.visits.length} />
            {hh.visits.length ? <VisitList visits={hh.visits} showMember /> : (
              <Panel className="text-sm text-content-muted flex items-center gap-2"><ClipboardList className="w-4 h-4" />{t('household.noVisits', 'No visits recorded yet.')}</Panel>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Panel>
            <SectionTitle title={t('schemes.title', 'Government schemes')} />
            {hh.schemes.length === 0 ? (
              <p className="text-sm text-content-muted">{t('schemes.none', 'No scheme suggestions for this family right now.')}</p>
            ) : (
              <div className="space-y-3">
                {pendingSchemes.length > 0 && (
                  <p className="text-xs text-content-muted">{t('schemes.hint', 'Check eligibility and help the family enrol:')}</p>
                )}
                {[...pendingSchemes, ...enrolledSchemes].map((s, i) => (
                  <div key={`${s.code}-${s.member_id}-${i}`} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <BadgeIndianRupee className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-content-primary leading-snug">{t(`scheme.${s.code}`, ref?.schemes[s.code]?.label ?? s.code)}</p>
                      <p className="text-xs text-content-muted">{s.member_name}</p>
                    </div>
                    {s.enrolled && <Pill tone="green">{t('schemes.enrolled', 'Enrolled')}</Pill>}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {hh.referrals.length > 0 && (
            <div>
              <SectionTitle title={t('household.referrals', 'Referrals')} count={hh.referrals.length} />
              <div className="space-y-2.5">{hh.referrals.map((r) => <ReferralCard key={r.id} referral={r} onChanged={reload} hideFamily />)}</div>
            </div>
          )}

          {active.some((m) => m.risk_level !== 'LOW') && (
            <Panel>
              <SectionTitle title={t('household.risk', 'Risk in this family')} />
              <div className="space-y-2">
                {active.filter((m) => m.risk_level !== 'LOW').map((m) => (
                  <Link key={m.id} to={`/asha/members/${m.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-content-primary">{m.name}</span>
                    <Pill tone={riskTone[m.risk_level]}>{t(`risk.${m.risk_level}`, m.risk_level)}</Pill>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      <AddMemberSheet open={adding} householdId={hh.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />
    </div>
  );
};

const AddMemberSheet: React.FC<{ open: boolean; householdId: number; onClose: () => void; onSaved: () => void }> = ({
  open, householdId, onClose, onSaved,
}) => {
  const { t } = useTranslation('asha');
  const [draft, setDraft] = useState<MemberDraft>(emptyMember());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const problem = validateMember(draft, t);
    if (problem) return setError(problem);
    setSaving(true);
    setError('');
    try {
      await ashaHttp.post(`/households/${householdId}/members`, toMemberPayload(draft));
      toast(t('member.added', 'Member added'));
      setDraft(emptyMember());
      onSaved();
    } catch (e) {
      setError(errorMessage(e, t('saveFailed', 'Could not save. Try again.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('household.addMemberTitle', 'Add family member')}
      footer={<Btn block size="lg" loading={saving} onClick={save} icon={<Plus className="w-4 h-4" />}>{t('household.addMember', 'Add')}</Btn>}
    >
      <MemberForm value={draft} onChange={setDraft} />
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Sheet>
  );
};
