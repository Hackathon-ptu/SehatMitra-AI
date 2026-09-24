import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mic } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { dangerSignName, relativeDay } from '../format';
import { useReference } from '../hooks';
import type { Visit } from '../types';
import { RiskReasons } from './care';
import { Pill, riskTone } from './ui';

const VITAL_FORMAT: [string, string, (v: Visit['vitals']) => string | null][] = [
  ['bp', 'BP', (v) => (v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null)],
  ['weight', 'Weight', (v) => (v.weight_kg ? `${v.weight_kg} kg` : null)],
  ['hb', 'Hb', (v) => (v.hb ? `${v.hb} g/dL` : null)],
  ['temp', 'Temp', (v) => (v.temperature_c ? `${v.temperature_c}°C` : null)],
  ['sugar', 'Sugar', (v) => (v.blood_sugar ? `${v.blood_sugar} mg/dL` : null)],
  ['spo2', 'SpO₂', (v) => (v.spo2 ? `${v.spo2}%` : null)],
  ['pulse', 'Pulse', (v) => (v.pulse ? `${v.pulse}/min` : null)],
  ['muac', 'MUAC', (v) => (v.muac_cm ? `${v.muac_cm} cm` : null)],
];

const SCHEDULE_DEFAULT = (key: string) => {
  if (key.startsWith('ANC_')) return `ANC ${key.slice(4)}`;
  if (key.startsWith('HBNC_D')) return `Day ${key.slice(6)}`;
  if (key.startsWith('HBYC_M')) return `${key.slice(6)} months`;
  if (key === 'BIRTH_PREP') return 'Birth preparedness';
  return key;
};

export const VisitList: React.FC<{ visits: Visit[]; showMember?: boolean }> = ({ visits, showMember }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="relative space-y-2.5">
      {visits.map((v) => (
        <VisitRow key={v.id} visit={v} showMember={showMember} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />
      ))}
    </ol>
  );
};

const VisitRow: React.FC<{ visit: Visit; showMember?: boolean; open: boolean; onToggle: () => void }> = ({
  visit: v, showMember, open, onToggle,
}) => {
  const { t, i18n } = useTranslation('asha');
  const ref = useReference();
  const vitals = VITAL_FORMAT.map(([k, label, fmt]) => [k, label, fmt(v.vitals)] as const).filter(([, , val]) => val);
  const hasMore = v.danger_signs.length || v.counselling.length || v.notes || v.risk_reasons.length || vitals.length > 3;

  return (
    <li className="rounded-2xl bg-surface-card border border-surface-border">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start gap-3" aria-expanded={open}>
        <span className={cn('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0',
          v.risk_level === 'HIGH' ? 'bg-red-500' : v.risk_level === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500')} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-content-primary">
              {t(`visitType.${v.visit_type}`, ref?.visit_types[v.visit_type] ?? v.visit_type)}
            </span>
            {v.schedule_key && <Pill tone="teal">{t(`schedule.${v.schedule_key}`, SCHEDULE_DEFAULT(v.schedule_key))}</Pill>}
            {v.risk_level !== 'LOW' && <Pill tone={riskTone[v.risk_level]}>{t(`risk.${v.risk_level}`, v.risk_level)}</Pill>}
            {v.input_mode === 'VOICE' && <Mic className="w-3.5 h-3.5 text-content-muted" />}
          </span>
          <span className="block text-xs text-content-muted mt-0.5">
            {relativeDay(v.visit_date, t, i18n.language)}
            {showMember && v.member_name && ` · ${v.member_name}`}
            {vitals.length > 0 && ` · ${vitals.slice(0, 3).map(([, label, val]) => `${t(`vital.${label}`, label)} ${val}`).join(' · ')}`}
          </span>
        </span>
        {hasMore ? <ChevronDown className={cn('w-4 h-4 mt-1 text-content-muted transition-transform', open && 'rotate-180')} /> : null}
      </button>
      {open && hasMore ? (
        <div className="px-4 pb-4 pl-[42px] space-y-3 text-sm">
          {vitals.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {vitals.map(([k, label, val]) => (
                <span key={k} className="text-content-secondary"><span className="text-content-muted">{t(`vital.${label}`, label)}:</span> {val}</span>
              ))}
            </div>
          )}
          {v.risk_reasons.length > 0 && <RiskReasons reasons={v.risk_reasons} />}
          {v.danger_signs.length > 0 && v.risk_reasons.length === 0 && (
            <p className="text-content-secondary">{v.danger_signs.map((c) => dangerSignName(c, ref, t)).join(', ')}</p>
          )}
          {v.counselling.length > 0 && (
            <p className="text-content-muted">
              <span className="font-medium text-content-secondary">{t('visit.counselled', 'Counselled')}:</span>{' '}
              {v.counselling.map((c) => t(`topic.${c}`, ref?.counselling_topics[c] ?? c)).join(', ')}
            </p>
          )}
          {v.findings?.cbac_score !== undefined && (
            <p className="text-content-secondary">{t('visit.cbacScore', 'CBAC score')}: <b>{v.findings.cbac_score}</b></p>
          )}
          {v.notes && <p className="text-content-secondary whitespace-pre-line">{v.notes}</p>}
        </div>
      ) : null}
    </li>
  );
};
