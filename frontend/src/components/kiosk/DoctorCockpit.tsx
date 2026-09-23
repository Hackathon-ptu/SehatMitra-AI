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
  Printer,
  Heart,
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

  const printOpdSlip = () => {
    if (!record) return;
    const v = record.vitals;
    const bpStr  = (v.bp_systolic && v.bp_diastolic) ? `${v.bp_systolic}/${v.bp_diastolic} mmHg` : 'Not recorded';
    const spo2Str = v.spo2 ? `${v.spo2}%`  : 'N/A';
    const pulseStr = v.pulse ? `${v.pulse} bpm` : 'N/A';
    const tempStr  = v.temp  ? `${v.temp}°C`   : 'N/A';
    const ont = record.ontology;
    const rx_allo  = (record as any).rx_allopathic ?? [];
    const rx_ayush = (record as any).rx_ayush ?? [];
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OPD Clinical Slip — ${record.token_id}</title>
  <style>
    * { box-sizing: border-box; margin:0; padding:0; font-family:'Segoe UI',system-ui,sans-serif; }
    body { background:#f0f4f8; padding:20px; }
    .slip { max-width:680px; margin:auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px #0002; overflow:hidden; }
    .header { background:linear-gradient(135deg,#065f46 0%,#047857 100%); color:#fff; padding:20px 24px; }
    .header h1 { font-size:18px; font-weight:900; letter-spacing:.5px; }
    .header p  { font-size:11px; opacity:.8; margin-top:2px; }
    .subheader { background:#064e3b; color:#6ee7b7; padding:8px 24px; font-size:11px; font-weight:700; letter-spacing:1px; display:flex; align-items:center; justify-content:space-between; }
    .token { font-size:28px; font-weight:900; font-family:monospace; color:#10b981; }
    .body { padding:20px 24px; }
    .section-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:8px; margin-top:16px; border-bottom:1px solid #e5e7eb; padding-bottom:4px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .info-box { background:#f9fafb; border-radius:8px; padding:10px 14px; border:1px solid #e5e7eb; }
    .info-label { font-size:9px; text-transform:uppercase; color:#9ca3af; font-weight:700; margin-bottom:2px; }
    .info-val { font-size:14px; font-weight:800; color:#111827; }
    .vitals-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
    .vital-card { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:8px; text-align:center; }
    .vital-label { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; }
    .vital-val { font-size:16px; font-weight:900; color:#065f46; margin:2px 0; }
    .vital-status { font-size:9px; color:#10b981; font-weight:700; }
    .badge-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .badge { padding:4px 10px; border-radius:20px; font-size:10px; font-weight:800; border:1.5px solid; }
    .badge-icd { background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; }
    .badge-ayush { background:#f5f3ff; border-color:#c4b5fd; color:#7c3aed; }
    .rx-list { list-style:none; }
    .rx-list li { padding:6px 10px; border-radius:6px; margin-bottom:4px; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; }
    .rx-allo { background:#eff6ff; color:#1e40af; }
    .rx-ayush { background:#f0fdf4; color:#065f46; }
    .rx-num { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; flex-shrink:0; }
    .footer { background:#f9fafb; border-top:1px solid #e5e7eb; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; }
    .disclaimer { font-size:9px; color:#9ca3af; max-width:380px; line-height:1.5; }
    .qr-placeholder { width:60px; height:60px; border:2px solid #d1d5db; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:9px; color:#9ca3af; text-align:center; }
    @media print { body{ padding:0; background:#fff; } .slip { box-shadow:none; border-radius:0; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <h1>🏥 Government District Hospital — OPD Clinical Slip</h1>
      <p>AIIA PS-26047 · SehatMitra-AI · ICD-11 + NAMASTE Dual-Ontology</p>
    </div>
    <div class="subheader">
      <span>TOKEN</span>
      <span class="token">${record.token_id}</span>
      <span>${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
    </div>

    <div class="body">
      <!-- Patient -->
      <div class="section-title">Patient Information</div>
      <div class="two-col">
        <div class="info-box">
          <div class="info-label">Full Name</div>
          <div class="info-val">${record.patient_name}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Age · Gender</div>
          <div class="info-val">${record.age ?? '—'} yrs · ${record.gender ?? '—'}</div>
        </div>
      </div>
      <div class="info-box" style="margin-top:8px">
        <div class="info-label">Chief Complaint</div>
        <div class="info-val" style="text-transform:capitalize">${record.chief_complaint_key.replace(/_/g,' ')}</div>
      </div>

      <!-- Vitals -->
      <div class="section-title" style="margin-top:16px">Measured Vitals</div>
      <div class="vitals-grid">
        <div class="vital-card">
          <div class="vital-label">Blood Pressure</div>
          <div class="vital-val" style="font-size:13px">${bpStr}</div>
          <div class="vital-status">${v.bp_systolic ? (v.bp_systolic >= 140 ? '⚠ Elevated' : '✓ Normal') : ''}</div>
        </div>
        <div class="vital-card">
          <div class="vital-label">SpO₂</div>
          <div class="vital-val">${spo2Str}</div>
          <div class="vital-status">${v.spo2 ? (v.spo2 < 94 ? '⚠ Low' : '✓ Normal') : ''}</div>
        </div>
        <div class="vital-card">
          <div class="vital-label">Pulse</div>
          <div class="vital-val">${pulseStr}</div>
          <div class="vital-status">${v.pulse ? (v.pulse > 100 || v.pulse < 60 ? '⚠ Irregular' : '✓ Normal') : ''}</div>
        </div>
        <div class="vital-card">
          <div class="vital-label">Temperature</div>
          <div class="vital-val">${tempStr}</div>
          <div class="vital-status">${v.temp ? (v.temp > 38.5 ? '⚠ Fever' : '✓ Normal') : ''}</div>
        </div>
      </div>

      <!-- Dual Ontology -->
      <div class="section-title" style="margin-top:16px">Dual-Ontology Classification</div>
      <div class="badge-row">
        <div class="badge badge-icd">ICD-11: ${ont.icd11_code} — ${ont.icd11_title}</div>
        <div class="badge badge-ayush">NAMASTE: ${ont.namaste_code} — ${ont.namaste_title}</div>
      </div>

      <!-- Rx -->
      ${rx_allo.length > 0 ? `
      <div class="section-title" style="margin-top:16px">Allopathic Prescription</div>
      <ul class="rx-list">
        ${rx_allo.map((r: string, i: number) => `<li class="rx-allo"><span class="rx-num" style="background:#1d4ed8;color:#fff">${i+1}</span>${r}</li>`).join('')}
      </ul>` : ''}

      ${rx_ayush.length > 0 ? `
      <div class="section-title" style="margin-top:12px">AYUSH Complementary</div>
      <ul class="rx-list">
        ${rx_ayush.map((r: string, i: number) => `<li class="rx-ayush"><span class="rx-num" style="background:#065f46;color:#fff">${i+1}</span>${r}</li>`).join('')}
      </ul>` : ''}
    </div>

    <div class="footer">
      <div class="disclaimer">
        ⚕️ This slip is computer-generated and clinically verified. Medications should be dispensed as per physician's final order.<br>
        Powered by IBM Granite · SehatMitra-AI · AIIA PS-26047
      </div>
      <div class="qr-placeholder">QR<br>Verify</div>
    </div>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=780,height=900');
    if (win) { win.document.write(html); win.document.close(); }
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
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Captured Vitals — Vital Sense Pod
              </p>
              <div className="space-y-2">
                {/* BP */}
                <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${
                  record.vitals.bp_systolic
                    ? ((record.vitals.bp_systolic || 0) >= 180 ? 'bg-red-900/30' : (record.vitals.bp_systolic || 0) >= 140 ? 'bg-amber-900/20' : 'bg-emerald-900/20')
                    : 'bg-slate-700/30'
                }`}>
                  <span className="text-slate-400 text-xs">Blood Pressure</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      record.vitals.bp_systolic
                        ? ((record.vitals.bp_systolic || 0) >= 180 ? 'text-red-400' : (record.vitals.bp_systolic || 0) >= 140 ? 'text-amber-400' : 'text-emerald-400')
                        : 'text-slate-500'
                    }`}>{record.vitals.bp_systolic ? `${record.vitals.bp_systolic}/${record.vitals.bp_diastolic} mmHg` : '—'}</span>
                    {record.vitals.bp_systolic && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (record.vitals.bp_systolic || 0) >= 180 ? 'bg-red-800 text-red-200' :
                        (record.vitals.bp_systolic || 0) >= 140 ? 'bg-amber-800 text-amber-200' :
                        'bg-emerald-800 text-emerald-200'
                      }`}>{(record.vitals.bp_systolic || 0) >= 180 ? 'Crisis' : (record.vitals.bp_systolic || 0) >= 140 ? 'Elevated' : '✓ Normal'}</span>
                    )}
                  </div>
                </div>
                {/* Pulse */}
                <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${record.vitals.pulse ? 'bg-pink-900/20' : 'bg-slate-700/30'}`}>
                  <span className="text-slate-400 text-xs flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" /> Heart Rate</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${record.vitals.pulse ? ((record.vitals.pulse || 0) > 100 || (record.vitals.pulse || 0) < 60 ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                      {record.vitals.pulse ? `${record.vitals.pulse} bpm` : '—'}
                    </span>
                    {record.vitals.pulse && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${(record.vitals.pulse || 0) > 100 || (record.vitals.pulse || 0) < 60 ? 'bg-amber-800 text-amber-200' : 'bg-emerald-800 text-emerald-200'}`}>
                        {(record.vitals.pulse || 0) > 100 || (record.vitals.pulse || 0) < 60 ? '⚠ Irregular' : '✓ Normal'}
                      </span>
                    )}
                  </div>
                </div>
                {/* SpO2 */}
                <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${record.vitals.spo2 ? 'bg-cyan-900/20' : 'bg-slate-700/30'}`}>
                  <span className="text-slate-400 text-xs">SpO₂</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${record.vitals.spo2 ? ((record.vitals.spo2 || 100) < 94 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                      {record.vitals.spo2 ? `${record.vitals.spo2}%` : '—'}
                    </span>
                    {record.vitals.spo2 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${(record.vitals.spo2 || 100) < 90 ? 'bg-red-800 text-red-200' : (record.vitals.spo2 || 100) < 94 ? 'bg-amber-800 text-amber-200' : 'bg-emerald-800 text-emerald-200'}`}>
                        {(record.vitals.spo2 || 100) < 90 ? 'Critical' : (record.vitals.spo2 || 100) < 94 ? '⚠ Low' : '✓ Normal'}
                      </span>
                    )}
                  </div>
                </div>
                {/* Temp */}
                <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${record.vitals.temp ? 'bg-orange-900/20' : 'bg-slate-700/30'}`}>
                  <span className="text-slate-400 text-xs">Temperature</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${record.vitals.temp ? ((record.vitals.temp || 0) > 38.5 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-500'}`}>
                      {record.vitals.temp ? `${record.vitals.temp}°C` : '—'}
                    </span>
                    {record.vitals.temp && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${(record.vitals.temp || 0) > 38.5 ? 'bg-red-800 text-red-200' : 'bg-emerald-800 text-emerald-200'}`}>
                        {(record.vitals.temp || 0) > 38.5 ? '⚠ Fever' : '✓ Normal'}
                      </span>
                    )}
                  </div>
                </div>
                {/* Pain scale */}
                {record.pain_scale !== null && record.pain_scale !== undefined && (
                  <div className="flex justify-between items-center rounded-xl px-3 py-2 bg-slate-700/30">
                    <span className="text-slate-400 text-xs">Pain Scale (VAS)</span>
                    <span className={`text-sm font-bold ${
                      (record.pain_scale || 0) >= 7 ? 'text-red-400' :
                      (record.pain_scale || 0) >= 4 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{record.pain_scale}/10</span>
                  </div>
                )}
                {vitalsStr === 'Not recorded' && !record.pain_scale && (
                  <p className="text-slate-500 text-xs italic text-center py-2">No vitals captured at kiosk — use Vital Sense Pod at intake</p>
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
            <div className="grid grid-cols-3 gap-3">
              <button
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/40 border border-emerald-600"
                onClick={() => alert(`Triage approved for ${record.token_id}. Opening E-Prescription...`)}
              >
                <CheckCircle2 className="w-5 h-5" />
                Approve &amp; E-Prescription
              </button>
              <button
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/40 border border-blue-600"
                onClick={printOpdSlip}
              >
                <Printer className="w-5 h-5" />
                🖨️ Print Clinical Slip
              </button>
              <button
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-900/40 border border-red-600"
                onClick={() => alert(`OPD Priority Escalated for ${record.token_id}`)}
              >
                <ArrowUpCircle className="w-5 h-5" />
                Escalate Priority
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
