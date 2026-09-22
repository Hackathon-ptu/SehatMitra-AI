/**
 * DoctorCockpit.tsx — Sprint 3
 * Doctor Cockpit: 15-second physician triage view (AIIA PS-26047)
 * Fetches GET http://localhost:8000/api/v1/kiosk/doctor-cockpit/{token_id}
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Loader2,
  Copy,
  ClipboardList,
  Stethoscope,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VitalsDict {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  temp?: number | null;
}

interface OntologyResult {
  icd11_code: string;
  icd11_title: string;
  namaste_code: string;
  namaste_title: string;
  tridosha_vector: { vata: number; pitta: number; kapha: number };
  agni_type: string;
  koshtha_type: string;
  vikriti_description: string;
  red_flag_alert: boolean;
  red_flag_reason: string | null;
}

interface InteractionWarning {
  herb?: string;
  drug?: string;
  severity?: string;
  description?: string;
  [key: string]: unknown;
}

interface GraniteSoap {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  raw?: string;
}

interface CockpitRecord {
  token_id: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  chief_complaint_key: string;
  raw_symptoms: string[];
  pain_scale: number | null;
  vitals: VitalsDict;
  ontology: OntologyResult;
  interaction_warnings: InteractionWarning[];
  fhir_bundle: object;
  granite_triage_summary: GraniteSoap | string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function parseSoap(summary: GraniteSoap | string): GraniteSoap {
  if (typeof summary === 'object' && summary !== null) return summary;
  if (typeof summary !== 'string') return { raw: String(summary) };
  // Try to parse sections from text
  const s: GraniteSoap = {};
  const sections: Array<{ key: keyof GraniteSoap; patterns: string[] }> = [
    { key: 'subjective',  patterns: ['subjective:', 's:'] },
    { key: 'objective',   patterns: ['objective:',  'o:'] },
    { key: 'assessment',  patterns: ['assessment:', 'a:'] },
    { key: 'plan',        patterns: ['plan:',       'p:'] },
  ];
  const lower = summary.toLowerCase();
  const positions: Array<{ key: keyof GraniteSoap; pos: number }> = [];
  sections.forEach(({ key, patterns }) => {
    patterns.forEach((pat) => {
      const idx = lower.indexOf(pat);
      if (idx !== -1) positions.push({ key, pos: idx });
    });
  });
  positions.sort((a, b) => a.pos - b.pos);
  if (positions.length === 0) return { raw: summary };
  positions.forEach((item, i) => {
    const start = item.pos + lower.indexOf(':', item.pos) + 1;
    const end = i + 1 < positions.length ? positions[i + 1].pos : summary.length;
    s[item.key] = summary.slice(start, end).trim();
  });
  if (!s.subjective && !s.objective && !s.assessment && !s.plan) s.raw = summary;
  return s;
}

function formatVitals(v: VitalsDict): string {
  const parts: string[] = [];
  if (v.bp_systolic && v.bp_diastolic) parts.push(`BP ${v.bp_systolic}/${v.bp_diastolic}`);
  if (v.pulse) parts.push(`HR ${v.pulse}bpm`);
  if (v.spo2) parts.push(`SpO₂ ${v.spo2}%`);
  if (v.temp) parts.push(`T ${v.temp}°C`);
  return parts.join(' · ') || 'Not recorded';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const VPKBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400 w-12 shrink-0">{label}</span>
    <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value * 10, 100)}%` }} />
    </div>
    <span className="text-xs font-bold text-white w-6 text-right">{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface DoctorCockpitProps {
  tokenId: string;
}

export const DoctorCockpit: React.FC<DoctorCockpitProps> = ({ tokenId }) => {
  const [record, setRecord]   = useState<CockpitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'cockpit' | 'fhir'>('cockpit');
  const [soapOpen, setSoapOpen] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/v1/kiosk/doctor-cockpit/${encodeURIComponent(tokenId)}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'Token not found'); });
        return r.json();
      })
      .then((data) => { setRecord(data); setLoading(false); })
      .catch((e: any) => { setError(e.message || 'Failed to fetch cockpit data'); setLoading(false); });
  }, [tokenId]);

  const copyFhir = () => {
    if (!record) return;
    navigator.clipboard?.writeText(JSON.stringify(record.fhir_bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
        <p className="text-slate-300 font-semibold">Loading cockpit for <span className="text-emerald-300 font-mono">{tokenId}</span>…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-2xl bg-red-900/30 border border-red-500/60 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-red-200 font-bold text-lg">Token Not Found</p>
        <p className="text-red-300 text-sm">{error}</p>
        <p className="text-slate-500 text-xs font-mono">Token: {tokenId}</p>
      </div>
    </div>
  );

  if (!record) return null;

  const ont = record.ontology;
  const soap = parseSoap(record.granite_triage_summary);
  const isRed = ont.red_flag_alert;
  const vitalsStr = formatVitals(record.vitals);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Top Bar ── */}
      <div className={`sticky top-0 z-20 px-4 py-3 flex flex-wrap items-center gap-3 border-b ${
        isRed ? 'bg-red-950/80 border-red-700' : 'bg-slate-800/90 border-slate-700'
      } backdrop-blur`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black ${
            isRed ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'
          }`}>
            {isRed ? '🔴' : '🟢'}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">OPD Token</p>
            <p className={`text-lg font-black font-mono tracking-wider ${isRed ? 'text-red-300' : 'text-emerald-300'}`}>{record.token_id}</p>
          </div>
        </div>

        {/* Patient badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-xl">
          <span className="text-slate-300 text-sm font-bold">{record.patient_name}</span>
          {record.age && <span className="text-slate-400 text-xs">{record.age}y</span>}
          {record.gender && <span className="text-slate-400 text-xs capitalize">{record.gender}</span>}
        </div>

        {/* Vitals badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-xl">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 text-xs font-mono">{vitalsStr}</span>
        </div>

        {/* Red-flag intercept strip */}
        {isRed && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-800 rounded-xl border border-red-600 ml-auto">
            <ShieldAlert className="w-4 h-4 text-red-300 animate-pulse" />
            <span className="text-red-200 text-xs font-bold">EMERGENCY INTERCEPT — {ont.red_flag_reason || 'Red-flag triggered'}</span>
          </div>
        )}
      </div>

      {/* ── Tab toggle ── */}
      <div className="flex gap-2 p-4 pb-0">
        {(['cockpit', 'fhir'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
              tab === t
                ? 'border-emerald-400 bg-emerald-900/40 text-emerald-300'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
            }`}
          >
            {t === 'cockpit' ? <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Cockpit</span>
              : <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> FHIR R4 JSON</span>}
          </button>
        ))}
      </div>

      {/* ── Cockpit Tab ── */}
      {tab === 'cockpit' && (
        <div className="p-4 grid grid-cols-12 gap-4">

          {/* LEFT COL — 4 wide */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Real-time vitals card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Vitals
              </p>
              <div className="space-y-2">
                {record.vitals.bp_systolic && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Blood Pressure</span>
                    <span className={`text-sm font-bold ${
                      (record.vitals.bp_systolic || 0) > 140 ? 'text-red-400' : 'text-emerald-400'
                    }`}>{record.vitals.bp_systolic}/{record.vitals.bp_diastolic} mmHg</span>
                  </div>
                )}
                {record.vitals.pulse && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Heart Rate</span>
                    <span className={`text-sm font-bold ${
                      (record.vitals.pulse || 0) > 100 || (record.vitals.pulse || 100) < 60 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{record.vitals.pulse} bpm</span>
                  </div>
                )}
                {record.vitals.spo2 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">SpO₂</span>
                    <span className={`text-sm font-bold ${
                      (record.vitals.spo2 || 100) < 94 ? 'text-red-400' : 'text-emerald-400'
                    }`}>{record.vitals.spo2}%</span>
                  </div>
                )}
                {record.vitals.temp && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Temperature</span>
                    <span className={`text-sm font-bold ${
                      (record.vitals.temp || 37) > 38.5 ? 'text-red-400' : 'text-emerald-400'
                    }`}>{record.vitals.temp}°C</span>
                  </div>
                )}
                {record.pain_scale !== null && record.pain_scale !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Pain Scale (VAS)</span>
                    <span className={`text-sm font-bold ${
                      (record.pain_scale || 0) >= 7 ? 'text-red-400' :
                      (record.pain_scale || 0) >= 4 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{record.pain_scale}/10</span>
                  </div>
                )}
                {vitalsStr === 'Not recorded' && !record.pain_scale && (
                  <p className="text-slate-500 text-xs italic">No vitals recorded at intake</p>
                )}
              </div>
            </div>

            {/* ICD-11 vs NAMASTE comparison card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                WHO ICD-11 vs NAMASTE
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl">
                  <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">ICD-11 (Allopathic)</p>
                  <p className="text-blue-200 font-mono text-sm font-bold">{ont.icd11_code}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{ont.icd11_title}</p>
                </div>
                <div className="p-3 bg-purple-900/30 border border-purple-700/50 rounded-xl">
                  <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">NAMASTE (AYUSH)</p>
                  <p className="text-purple-200 font-mono text-sm font-bold">{ont.namaste_code}</p>
                  <p className="text-purple-300 text-xs mt-0.5">{ont.namaste_title}</p>
                </div>
              </div>
            </div>

            {/* Agni / Koshtha / Vikriti vector display */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Agni · Koshtha · Vikriti
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Agni Type</span>
                  <span className="text-amber-300 font-bold capitalize">{ont.agni_type || 'Not assessed'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Koshtha</span>
                  <span className="text-cyan-300 font-bold capitalize">{ont.koshtha_type || 'Not assessed'}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Tridosha Vector</p>
              <div className="space-y-2">
                <VPKBar label="Vāta"  value={ont.tridosha_vector?.vata  ?? 5} color="bg-blue-400" />
                <VPKBar label="Pitta" value={ont.tridosha_vector?.pitta ?? 5} color="bg-red-400"  />
                <VPKBar label="Kapha" value={ont.tridosha_vector?.kapha ?? 5} color="bg-emerald-400" />
              </div>
              {ont.vikriti_description && (
                <p className="mt-3 text-xs text-slate-400 italic border-t border-slate-700 pt-2">{ont.vikriti_description}</p>
              )}
            </div>
          </div>

          {/* RIGHT COL — 8 wide */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* Herb-Drug Cross-Reaction Warning Banner */}
            {record.interaction_warnings.length > 0 ? (
              <div className="bg-amber-900/30 rounded-2xl border-2 border-amber-500/70 p-4">
                <p className="text-amber-300 font-extrabold text-base mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Herb-Drug Cross-Reaction Warnings — NFI vs API
                  <span className="ml-auto text-xs bg-amber-700 text-amber-100 px-2 py-0.5 rounded-full font-bold">
                    {record.interaction_warnings.length} alert{record.interaction_warnings.length > 1 ? 's' : ''}
                  </span>
                </p>
                <div className="space-y-2">
                  {record.interaction_warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-800/70 rounded-xl border border-amber-700/30">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200 leading-relaxed">
                        {w.herb && w.drug && (
                          <span className="font-bold text-amber-100">{w.herb} + {w.drug}: </span>
                        )}
                        {w.description || w.severity || JSON.stringify(w)}
                        {w.severity && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            w.severity === 'high' ? 'bg-red-900 text-red-300' :
                            w.severity === 'medium' ? 'bg-amber-900 text-amber-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>{w.severity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-900/20 rounded-2xl border border-emerald-700/40 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-bold text-sm">No Herb-Drug Interactions Detected</p>
                  <p className="text-emerald-400/70 text-xs">NFI × API cross-reaction matrix — clear</p>
                </div>
              </div>
            )}

            {/* IBM Granite SOAP Synthesizer */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700">
              <button
                onClick={() => setSoapOpen((v) => !v)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-bold text-sm">IBM Granite-3.0 — 15-Second Clinical SOAP</p>
                    <p className="text-slate-400 text-xs">Automated Subjective · Objective · Assessment · Plan</p>
                  </div>
                </div>
                {soapOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {soapOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                  {soap.raw ? (
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono bg-slate-900/50 rounded-xl p-3 leading-relaxed">{soap.raw}</pre>
                  ) : (
                    <>
                      {soap.subjective && (
                        <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                          <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">S — Subjective</p>
                          <p className="text-blue-100 text-xs leading-relaxed">{soap.subjective}</p>
                        </div>
                      )}
                      {soap.objective && (
                        <div className="p-3 bg-slate-700/40 border border-slate-600/40 rounded-xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">O — Objective</p>
                          <p className="text-slate-200 text-xs leading-relaxed">{soap.objective}</p>
                        </div>
                      )}
                      {soap.assessment && (
                        <div className="p-3 bg-purple-900/20 border border-purple-700/30 rounded-xl">
                          <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">A — Assessment</p>
                          <p className="text-purple-100 text-xs leading-relaxed">{soap.assessment}</p>
                        </div>
                      )}
                      {soap.plan && (
                        <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-xl">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">P — Plan</p>
                          <p className="text-emerald-100 text-xs leading-relaxed">{soap.plan}</p>
                        </div>
                      )}
                    </>
                  )}
                  {!soap.raw && !soap.subjective && !soap.objective && !soap.assessment && !soap.plan && (
                    <p className="text-slate-500 text-xs italic">SOAP summary not yet available — Granite inference pending.</p>
                  )}
                </div>
              )}
            </div>

            {/* Triage action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/40 border border-emerald-600"
                onClick={() => alert(`Triage approved for ${record.token_id}. Opening E-Prescription...`)}
              >
                <CheckCircle2 className="w-5 h-5" />
                Approve Triage &amp; Open E-Prescription
              </button>
              <button
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-900/40 border border-red-600"
                onClick={() => alert(`OPD Priority Escalated for ${record.token_id}`)}
              >
                <ArrowUpCircle className="w-5 h-5" />
                Escalate OPD Priority
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FHIR Tab ── */}
      {tab === 'fhir' && (
        <div className="p-4 max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-bold">ABDM FHIR R4 Bundle</p>
                <p className="text-slate-400 text-xs">DocumentBundle · NRCES PHR Profile · ICD-11 + NAMASTE + Vikriti</p>
              </div>
              <button
                onClick={copyFhir}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs text-slate-300 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-200 bg-slate-900/60 rounded-xl p-4 border border-slate-700 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[70vh] overflow-y-auto">
              {JSON.stringify(record.fhir_bundle, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorCockpit;
