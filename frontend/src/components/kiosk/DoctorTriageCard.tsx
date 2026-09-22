/**
 * DoctorTriageCard.tsx
 * Charak-Kiosk: Physician OPD Triage Terminal (AIIA PS-26047)
 * One-page real-time evaluation dashboard with Prakriti/Vikriti Radar
 * Built with IBM Bob IDE (Granite-Code-Instruct)
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Activity,
  Pill,
  ClipboardList,
  Loader2,
  User,
  Calendar,
  Hash,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PrakritiVector {
  vata: number;
  pitta: number;
  kapha: number;
}

interface HerbDrugAlert {
  herb: string;
  drug: string;
  risk: string;
  severity: string;
}

interface DashavidhaRow {
  parameter: string;
  sanskrit: string;
  value: string;
}

interface DoctorCard {
  opd_token: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  abha_id: string | null;
  chief_complaint: string;
  language: string;
  agni: string | null;
  koshtha: string | null;
  vitals: { bp?: string; pulse?: number; spo2?: number } | null;
  past_medications: string[];
  icd11_code: string;
  icd11_label: string;
  namaste_code: string;
  namaste_label: string;
  prakriti: PrakritiVector;
  vikriti: PrakritiVector;
  herb_drug_alerts: HerbDrugAlert[];
  red_flags: string[];
  dashavidha: DashavidhaRow[];
  soap_note: string;
  doctor_room: number;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Prakriti/Vikriti Radar SVG ─────────────────────────────────────────────

interface RadarProps {
  prakriti: PrakritiVector;
  vikriti: PrakritiVector;
}

const VPKRadar: React.FC<RadarProps> = ({ prakriti, vikriti }) => {
  const cx = 120, cy = 120, R = 90;
  // 3-axis radar: Vata (top), Pitta (bottom-right), Kapha (bottom-left)
  const angles = [-90, 30, 150]; // degrees for Vata, Pitta, Kapha
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const point = (val: number, angleIdx: number) => {
    const angle = toRad(angles[angleIdx]);
    const r = (val / 100) * R;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const axes: Array<keyof PrakritiVector> = ['vata', 'pitta', 'kapha'];
  const axisLabels = ['Vata', 'Pitta', 'Kapha'];
  const axisColors = ['#6366f1', '#ef4444', '#22c55e'];

  const prakritiPts = axes.map((k, i) => point(prakriti[k], i));
  const vikritiPts = axes.map((k, i) => point(vikriti[k], i));
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  const aggravatedDoshas = axes.filter((k) => vikriti[k] > prakriti[k] + 10);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 240 240" className="w-56 h-56">
        {/* Grid rings */}
        {[25, 50, 75, 100].map((pct) => {
          const pts = axes.map((_, i) => point(pct, i));
          return (
            <polygon
              key={pct}
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const p = point(100, i);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d1d5db" strokeWidth="1" />;
        })}
        {/* Prakriti (baseline) */}
        <path d={toPath(prakritiPts)} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,3" />
        {/* Vikriti (current) */}
        <path d={toPath(vikritiPts)} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="2.5" />
        {/* Axis labels */}
        {axes.map((_, i) => {
          const p = point(115, i);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill={axisColors[i]}
            >
              {axisLabels[i]}
            </text>
          );
        })}
        {/* Data point dots — Vikriti */}
        {vikritiPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={axisColors[i]} />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 border-t-2 border-dashed border-indigo-500" />
          <span className="text-content-muted">Prakriti (Baseline)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-red-500 rounded" />
          <span className="text-content-muted">Vikriti (Current)</span>
        </div>
      </div>

      {/* VPK percentage table */}
      <div className="w-full grid grid-cols-3 gap-2">
        {axes.map((k, i) => {
          const isAggravated = vikriti[k] > prakriti[k] + 10;
          return (
            <div
              key={k}
              className={cn(
                'rounded-xl p-3 text-center border',
                isAggravated
                  ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                  : 'border-surface-border bg-surface-elevated'
              )}
            >
              <p className="text-xs font-semibold text-content-muted">{axisLabels[i]}</p>
              <p className="text-lg font-black" style={{ color: axisColors[i] }}>
                {vikriti[k]}%
              </p>
              <p className="text-[10px] text-content-muted">Base: {prakriti[k]}%</p>
              {isAggravated && (
                <p className="text-[10px] font-bold text-red-600 mt-0.5">
                  कुपित ↑
                </p>
              )}
            </div>
          );
        })}
      </div>

      {aggravatedDoshas.length > 0 && (
        <p className="text-xs text-red-700 dark:text-red-400 font-semibold text-center">
          Vikriti: {aggravatedDoshas.map((d) => `${d.charAt(0).toUpperCase() + d.slice(1)} aggravated (कुपित)`).join(', ')}
        </p>
      )}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const DoctorTriageCard: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [card, setCard] = useState<DoctorCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [soapExpanded, setSoapExpanded] = useState(false);

  const fetchCard = async (token: string) => {
    if (!token.trim()) {
      setError('Please enter an OPD token number (e.g. OPD-AYU-101)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/doctor-card/${encodeURIComponent(token.trim())}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || 'Token not found');
      }
      const data: DoctorCard = await res.json();
      setCard(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch doctor card');
      setCard(null);
    } finally {
      setLoading(false);
    }
  };

  const severityBadge = (severity: string) => {
    const map: Record<string, string> = {
      HIGH: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-300',
      MODERATE: 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300',
      LOW: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300 border-yellow-300',
    };
    return map[severity] || map.LOW;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🩺</div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">Doctor OPD Triage Terminal</h1>
          <p className="text-xs text-slate-300">Charak-Kiosk · AIIA PS-26047 · Dual-Ontology: ICD-11 + NAMASTE</p>
        </div>
      </div>

      {/* Token Search Bar */}
      <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
        <label className="text-xs font-bold text-content-muted uppercase tracking-wider block mb-2">
          Enter OPD Token Number
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && fetchCard(tokenInput)}
            placeholder="OPD-AYU-101"
            className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-elevated text-content-primary text-base font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={() => fetchCard(tokenInput)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Load Card
          </button>
          {card && (
            <button
              onClick={() => fetchCard(card.opd_token)}
              className="p-3 rounded-xl border border-surface-border bg-surface-elevated text-content-muted hover:bg-surface-border transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      {/* Doctor Card */}
      {card && (
        <div className="space-y-4">
          {/* ── Red Flag Banner ────────────────────────────────────────── */}
          {card.red_flags.length > 0 && (
            <div className="rounded-2xl bg-red-700 border border-red-500 p-4 shadow-lg shadow-red-900/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-extrabold text-white text-lg tracking-wide">🚨 RED FLAGS — Immediate Attention Required</h2>
              </div>
              <div className="space-y-1.5">
                {card.red_flags.map((flag, i) => (
                  <p key={i} className="text-white font-semibold text-sm bg-white/10 rounded-lg px-3 py-2">
                    {flag}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ── Patient Header + Dual-Ontology ────────────────────────── */}
          <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
                  {card.patient_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-extrabold text-xl text-content-primary">{card.patient_name}</h2>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-content-muted">
                    {card.age && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {card.age} yrs
                      </span>
                    )}
                    {card.gender && <span className="capitalize">{card.gender}</span>}
                    {card.abha_id && (
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <Hash className="w-3 h-3" /> {card.abha_id}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(card.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-slate-700 text-white text-xs font-bold font-mono">
                  {card.opd_token}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300 text-xs font-bold">
                  Room {card.doctor_room}
                </span>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="mb-4 p-3 bg-surface-elevated rounded-xl border border-surface-border">
              <p className="text-xs font-bold text-content-muted uppercase mb-1">Chief Complaint</p>
              <p className="text-base text-content-primary font-medium">{card.chief_complaint}</p>
              <p className="text-xs text-content-muted mt-0.5">
                Language: <span className="font-semibold uppercase">{card.language}</span>
                {card.agni && <> · Agni: <span className="font-semibold capitalize">{card.agni}</span></>}
                {card.koshtha && <> · Koshtha: <span className="font-semibold capitalize">{card.koshtha}</span></>}
              </p>
            </div>

            {/* Dual-Ontology Codes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-300">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">ICD-11 Code</p>
                <p className="text-lg font-black text-blue-800 dark:text-blue-300 font-mono">{card.icd11_code}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">{card.icd11_label}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-300">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">NAMASTE Code</p>
                <p className="text-lg font-black text-purple-800 dark:text-purple-300 font-mono">{card.namaste_code}</p>
                <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">{card.namaste_label}</p>
              </div>
            </div>

            {/* Vitals */}
            {card.vitals && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Blood Pressure', value: card.vitals.bp, unit: 'mmHg', icon: '💗' },
                  { label: 'Pulse Rate', value: card.vitals.pulse, unit: 'bpm', icon: '💓' },
                  { label: 'SpO₂', value: card.vitals.spo2, unit: '%', icon: '🫧' },
                ].map((v) =>
                  v.value ? (
                    <div key={v.label} className="p-3 rounded-xl bg-surface-elevated border border-surface-border text-center">
                      <p className="text-xl">{v.icon}</p>
                      <p className="text-lg font-black text-content-primary">
                        {v.value}
                        <span className="text-xs font-normal text-content-muted"> {v.unit}</span>
                      </p>
                      <p className="text-[10px] text-content-muted">{v.label}</p>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* ── Prakriti vs Vikriti Radar ──────────────────────────────── */}
          <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-content-primary">Prakriti vs Vikriti — Tridosha Radar</h3>
            </div>
            <VPKRadar prakriti={card.prakriti} vikriti={card.vikriti} />
          </div>

          {/* ── Herb-Drug Interaction Alert ────────────────────────────── */}
          {card.herb_drug_alerts.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/10 rounded-2xl border-2 border-amber-400 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                  <Pill className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-amber-900 dark:text-amber-300 text-base">
                  ⚠️ Herb-Drug Interaction Alerts (NFI + API)
                </h3>
              </div>
              <div className="space-y-3">
                {card.herb_drug_alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl p-3 border',
                      severityBadge(alert.severity)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-sm">
                        {alert.herb} <span className="font-normal text-content-muted">+</span> {alert.drug}
                      </p>
                      <span
                        className={cn(
                          'text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0',
                          severityBadge(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs">{alert.risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dashavidha Pariksha Table ──────────────────────────────── */}
          <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-content-primary">Dashavidha Pariksha — दशविध परीक्षा</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-surface-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-elevated border-b border-surface-border">
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-content-muted uppercase">Parameter</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-content-muted uppercase">Sanskrit</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-content-muted uppercase">Value / Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {card.dashavidha.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-surface-border last:border-0 transition-colors',
                        i % 2 === 0 ? 'bg-surface-card' : 'bg-surface-elevated/50'
                      )}
                    >
                      <td className="px-4 py-3 font-semibold text-content-primary">{row.parameter}</td>
                      <td className="px-4 py-3 text-content-muted font-medium">{row.sanskrit}</td>
                      <td className="px-4 py-3 text-content-primary">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Past Medications ───────────────────────────────────────── */}
          {card.past_medications.length > 0 && (
            <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
              <h3 className="font-bold text-content-primary mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand-600" /> Past Medications
              </h3>
              <div className="flex flex-wrap gap-2">
                {card.past_medications.map((med, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-full text-sm font-medium text-content-primary flex items-center gap-1.5"
                  >
                    <Pill className="w-3 h-3 text-brand-600" /> {med}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── SOAP Note ──────────────────────────────────────────────── */}
          <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
            <button
              onClick={() => setSoapExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-bold text-content-primary flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-600" /> SOAP Note
              </h3>
              <span className="text-xs text-content-muted font-medium">
                {soapExpanded ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </button>
            {soapExpanded && (
              <pre className="mt-4 text-sm text-content-primary font-mono whitespace-pre-wrap bg-surface-elevated rounded-xl p-4 border border-surface-border leading-relaxed">
                {card.soap_note}
              </pre>
            )}
          </div>

          {/* Footer disclaimer */}
          <p className="text-center text-xs text-content-muted py-2">
            Charak-Kiosk AI-assisted intake · This triage summary supplements, not replaces, clinical judgment.
            Ayush + Allopathic dual assessment recommended.
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorTriageCard;
