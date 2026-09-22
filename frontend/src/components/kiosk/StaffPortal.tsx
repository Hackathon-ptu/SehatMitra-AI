/**
 * StaffPortal.tsx — Sprint 5
 * Protected Hospital Staff Workstation
 * Route: /staff
 *
 * Features:
 *  • PIN / Role gate (Doctor | Triage Nurse)
 *  • Live OPD Queue with 4-second auto-refresh
 *  • Pulsing RED banner for emergency tokens
 *  • Doctor Cockpit drawer with SOAP, Herb-Drug, ICD-11, FHIR R4, status update
 *
 * AIIA PS-26047 — SehatMitra-AI
 */

import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
import {
  ShieldAlert,
  Stethoscope,
  Activity,
  RefreshCw,
  X,
  Copy,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Hospital,
  AlertTriangle,
  FileText,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────

type StaffRole = 'doctor' | 'nurse';

interface QueueEntry {
  token_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  chief_complaint: string;
  pain_scale: number | null;
  red_flag: boolean;
  red_flag_reason?: string | null;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
  cabin?: string;
  created_at: string;
  vitals?: {
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
    pulse?: number | null;
    spo2?: number | null;
    temp?: number | null;
  };
}

interface CockpitRecord {
  token_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  chief_complaint_key: string;
  raw_symptoms: string[];
  pain_scale: number | null;
  vitals: {
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
    pulse?: number | null;
    spo2?: number | null;
    temp?: number | null;
  };
  ontology: {
    icd11_code?: string;
    icd11_title?: string;
    namaste_code?: string;
    namaste_title?: string;
    tridosha_imbalance?: string;
    agni_type?: string;
    koshtha_type?: string;
    vikriti_vector?: { vata: number; pitta: number; kapha: number };
    red_flag_alert?: boolean;
    red_flag_reason?: string;
  };
  interaction_warnings: Array<{ drug: string; herb: string; severity: string; note: string }>;
  fhir_bundle: any;
  granite_triage_summary: string | null;
  // ── CDSS bento fields ────────────────────────────────────────────────────────
  differentials?: string[];
  rx_allopathic?: string[];
  rx_ayush?: string[];
  // ── Interlingua / bilingual bridge ──────────────────────────────────────────
  intake_language?: string;
  vernacular_text?: string;
}

// ── Fallback defaults for safe rendering ─────────────────────────────────────
const DEFAULT_ONTOLOGY: CockpitRecord['ontology'] = {
  icd11_code: 'MD90',
  icd11_title: 'Clinical Evaluation Pending',
  namaste_code: 'AYU-GEN-01',
  namaste_title: 'Samanya Roga',
  agni_type: 'Samagni',
  koshtha_type: 'Madhyama',
  red_flag_alert: false,
};

// ── Cockpit Error Boundary ────────────────────────────────────────────────────

interface EBState { hasError: boolean; message: string }
interface EBProps  { children: ReactNode; tokenId: string }

class CockpitErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[CockpitErrorBoundary]', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 space-y-3">
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-600 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-bold text-sm">Cockpit render error</p>
              <p className="text-red-400 text-xs mt-1 font-mono">{this.state.message}</p>
              <p className="text-slate-400 text-xs mt-2">Token: {this.props.tokenId}</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Hindi translation map (Clinical English → Hindi) ──────────────────────────
// Used for the EN↔HI cockpit toggle — covers SOAP section labels only.
const EN_TO_HI: Record<string, string> = {
  'SUBJECTIVE': 'व्यक्तिपरक',
  'OBJECTIVE': 'वस्तुपरक',
  'ASSESSMENT': 'मूल्यांकन',
  'PLAN': 'योजना',
  'Patient': 'रोगी',
  'Name': 'नाम',
  'Age': 'आयु',
  'Gender': 'लिंग',
  'Chief Complaint': 'मुख्य शिकायत',
  'IBM Granite-3.0 SOAP Summary': 'IBM Granite-3.0 SOAP सारांश',
  'Herb-Drug Cross-Reaction Warnings': 'जड़ी-बूटी-दवा क्रॉस-रिएक्शन चेतावनी',
  'Dual-Ontology Classification': 'द्विभाषी ओन्टोलॉजी वर्गीकरण',
  'View ABDM FHIR R4 Bundle': 'ABDM FHIR R4 बंडल देखें',
  'In Consultation': 'परामर्श में',
  'Mark Complete': 'पूर्ण करें',
  'Patient Original Transcript': 'रोगी का मूल विवरण',
  'Loading clinical record for': 'के लिए नैदानिक रिकॉर्ड लोड हो रहा है',
  'Doctor Cockpit': 'डॉक्टर कॉकपिट',
  'Vital Telemetry & Pain Index': 'महत्वपूर्ण टेलीमेट्री और दर्द सूचकांक',
};

function t(key: string, isHindi: boolean): string {
  return isHindi ? (EN_TO_HI[key] ?? key) : key;
}

// ── PIN Gate ───────────────────────────────────────────────────────────────

const VALID_PINS: Record<StaffRole, string> = {
  doctor: '1234',
  nurse:  '5678',
};

interface PinGateProps {
  onUnlock: (role: StaffRole) => void;
}

const PinGate: React.FC<PinGateProps> = ({ onUnlock }) => {
  const [role, setRole] = useState<StaffRole>('doctor');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const tryUnlock = () => {
    if (pin === VALID_PINS[role]) {
      onUnlock(role);
    } else {
      setError('Incorrect PIN. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className={`w-full max-w-sm space-y-6 transition-transform ${shake ? 'animate-wiggle' : ''}`}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800 flex items-center justify-center shadow-xl shadow-emerald-900/60">
            <Hospital className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-extrabold text-xl">Staff Workstation</h1>
            <p className="text-slate-400 text-xs mt-0.5">Hospital OPD Queue & Doctor Cockpit</p>
            <p className="text-slate-600 text-[10px] mt-1 font-mono">AIIA PS-26047 · SehatMitra-AI</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
          {/* Role selector */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role</p>
            <div className="flex gap-2">
              {(['doctor', 'nurse'] as StaffRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setPin(''); setError(''); }}
                  className={`flex-1 py-2.5 rounded-xl border font-bold text-sm capitalize transition-all ${
                    role === r
                      ? 'border-emerald-500 bg-emerald-900/40 text-emerald-300'
                      : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {r === 'doctor' ? '🩺' : '🩹'} {r}
                </button>
              ))}
            </div>
          </div>

          {/* PIN input */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              <Lock className="inline w-3 h-3 mr-1" />PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
              placeholder="Enter PIN"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-xl font-mono text-center tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {error}
              </p>
            )}
            <p className="text-slate-600 text-[10px] mt-1">Demo PINs — Doctor: 1234 · Nurse: 5678</p>
          </div>

          <button
            onClick={tryUnlock}
            disabled={!pin}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            Unlock Workstation
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Doctor Cockpit — Fullscreen 3-Column Bento CDSS Grid ──────────────────
// Replaces the narrow scrollable drawer with a glanceable 1080p layout.

interface CockpitDrawerProps {
  tokenId: string;
  role: StaffRole;
  onClose: () => void;
  onStatusUpdate: (tokenId: string, status: 'IN_CONSULTATION' | 'COMPLETED') => void;
}

const CockpitDrawer: React.FC<CockpitDrawerProps> = ({ tokenId, onClose, onStatusUpdate }) => {
  const [record, setRecord]               = useState<CockpitRecord | null>(null);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState('');
  const [fhirExpanded, setFhirExpanded]   = useState(false);
  const [copied, setCopied]               = useState(false);
  const [rxCopied, setRxCopied]           = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [hindi, setHindi]                 = useState(false);

  // ── Fetch cockpit record ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setFetchError('');
    setRecord(null);
    fetch(`${API_BASE}/api/v1/kiosk/doctor-cockpit/${encodeURIComponent(tokenId)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Record not found (HTTP ${r.status})`);
        return r.json();
      })
      .then((data: Record<string, any>) => {
        const safeRecord: CockpitRecord = {
          token_id:              String(data.token_id ?? tokenId),
          patient_name:          String(data.patient_name ?? 'Unknown Patient'),
          age:                   typeof data.age === 'number' ? data.age : null,
          gender:                typeof data.gender === 'string' ? data.gender : null,
          chief_complaint_key:   String(data.chief_complaint_key ?? ''),
          raw_symptoms:          Array.isArray(data.raw_symptoms) ? data.raw_symptoms : [],
          pain_scale:            typeof data.pain_scale === 'number' ? data.pain_scale : null,
          vitals: {
            bp_systolic:  data.vitals?.bp_systolic  ?? null,
            bp_diastolic: data.vitals?.bp_diastolic ?? null,
            pulse:        data.vitals?.pulse        ?? null,
            spo2:         data.vitals?.spo2         ?? null,
            temp:         data.vitals?.temp         ?? null,
          },
          ontology: {
            icd11_code:         data.ontology?.icd11_code         ?? DEFAULT_ONTOLOGY.icd11_code,
            icd11_title:        data.ontology?.icd11_title        ?? DEFAULT_ONTOLOGY.icd11_title,
            namaste_code:       data.ontology?.namaste_code       ?? DEFAULT_ONTOLOGY.namaste_code,
            namaste_title:      data.ontology?.namaste_title      ?? DEFAULT_ONTOLOGY.namaste_title,
            tridosha_imbalance: data.ontology?.tridosha_imbalance ?? undefined,
            agni_type:          data.ontology?.agni_type          ?? DEFAULT_ONTOLOGY.agni_type,
            koshtha_type:       data.ontology?.koshtha_type       ?? DEFAULT_ONTOLOGY.koshtha_type,
            vikriti_vector:     data.ontology?.vikriti_vector     ?? undefined,
            red_flag_alert:     Boolean(data.ontology?.red_flag_alert),
            red_flag_reason:    data.ontology?.red_flag_reason    ?? undefined,
          },
          interaction_warnings: Array.isArray(data.interaction_warnings) ? data.interaction_warnings : [],
          fhir_bundle:          data.fhir_bundle ?? null,
          granite_triage_summary: typeof data.granite_triage_summary === 'string'
                                    ? data.granite_triage_summary
                                    : 'Clinical summary awaiting physician review.',
          differentials: Array.isArray(data.differentials) ? data.differentials : [],
          rx_allopathic: Array.isArray(data.rx_allopathic) ? data.rx_allopathic : [],
          rx_ayush:      Array.isArray(data.rx_ayush)      ? data.rx_ayush      : [],
          intake_language: typeof data.intake_language === 'string' ? data.intake_language : 'en-IN',
          vernacular_text: typeof data.vernacular_text  === 'string' ? data.vernacular_text : '',
        };
        setRecord(safeRecord);
      })
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [tokenId]);

  const handleCopyFhir = () => {
    if (!record?.fhir_bundle) return;
    navigator.clipboard.writeText(JSON.stringify(record.fhir_bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkComplete = async () => {
    setUpdatingStatus(true);
    try {
      await fetch(`${API_BASE}/api/v1/kiosk/queue/${encodeURIComponent(tokenId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      onStatusUpdate(tokenId, 'COMPLETED');
      onClose();
    } catch { /* ignore network errors */ } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkInConsultation = async () => {
    setUpdatingStatus(true);
    try {
      await fetch(`${API_BASE}/api/v1/kiosk/queue/${encodeURIComponent(tokenId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_CONSULTATION' }),
      });
      onStatusUpdate(tokenId, 'IN_CONSULTATION');
    } catch { /* ignore network errors */ } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Copy Rx pad text ────────────────────────────────────────────────────────
  const handleCopyRx = () => {
    if (!record) return;
    const lines = [
      `Patient: ${record.patient_name} | Token: ${record.token_id}`,
      `Chief Complaint: ${record.chief_complaint_key.replace(/_/g, ' ')}`,
      '',
      'CONVENTIONAL:',
      ...(record.rx_allopathic ?? []).map(r => `  • ${r}`),
      '',
      'AYUSH COMPLEMENTARY:',
      ...(record.rx_ayush ?? []).map(r => `  • ${r}`),
    ].join('\n');
    navigator.clipboard.writeText(lines);
    setRxCopied(true);
    setTimeout(() => setRxCopied(false), 2500);
  };

  // ── Vikriti progress bar helper ──────────────────────────────────────────────
  const Dosha: React.FC<{ label: string; val: number; color: string }> = ({ label, val, color }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(val * 100)}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">{Math.round(val * 100)}%</span>
    </div>
  );

  // ── Section label helper ─────────────────────────────────────────────────────
  const SectionLabel: React.FC<{ icon: React.ReactNode; label: string; color?: string }> = ({ icon, label, color = 'text-slate-400' }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2 ${color}`}>
      {icon}{label}
    </div>
  );

  // ── Fullscreen bento loading skeleton ────────────────────────────────────────
  const BentoSkeleton = () => (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-pulse">
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4">
        <div className="h-4 w-48 bg-slate-700 rounded" />
        <div className="ml-auto h-4 w-32 bg-slate-700 rounded" />
      </div>
      <div className="flex-1 grid grid-cols-[1fr_1.4fr_1.6fr] gap-px bg-slate-800 p-4 gap-4">
        {[0,1,2].map(i => <div key={i} className="bg-slate-900 rounded-2xl" />)}
      </div>
    </div>
  );

  if (loading) return <BentoSkeleton />;

  // ── Fetch error fullscreen ───────────────────────────────────────────────────
  if (fetchError) return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
      <div className="max-w-sm w-full p-6 rounded-2xl bg-slate-900 border border-red-700 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 font-bold">Failed to load cockpit</p>
        </div>
        <p className="text-red-400 text-sm font-mono">{fetchError}</p>
        <p className="text-slate-500 text-xs">Token: {tokenId}</p>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          Close
        </button>
      </div>
    </div>
  );

  if (!record) return null;

  // ── Derived display values ───────────────────────────────────────────────────
  const isRed   = record.ontology.red_flag_alert;
  const vv      = record.ontology.vikriti_vector;
  const painPct = record.pain_scale != null ? (record.pain_scale / 10) * 100 : null;
  const painSev = record.pain_scale == null ? null
    : record.pain_scale <= 3 ? 'Mild'
    : record.pain_scale <= 6 ? 'Moderate' : 'Severe';
  const painColor = record.pain_scale == null ? 'bg-slate-600'
    : record.pain_scale <= 3 ? 'bg-emerald-500'
    : record.pain_scale <= 6 ? 'bg-amber-500' : 'bg-red-500';

  const bpStatus = (() => {
    const sys = record.vitals.bp_systolic;
    if (!sys) return null;
    if (sys >= 180) return { label: 'Crisis', cls: 'text-red-400 bg-red-900/30 border-red-600' };
    if (sys >= 140) return { label: 'Elevated', cls: 'text-amber-400 bg-amber-900/20 border-amber-600' };
    return { label: 'Normal', cls: 'text-emerald-400 bg-emerald-900/20 border-emerald-700' };
  })();

  const spo2Status = (() => {
    const s = record.vitals.spo2;
    if (!s) return null;
    if (s < 90) return { label: 'Critical', cls: 'text-red-400 bg-red-900/30 border-red-600' };
    if (s < 94) return { label: 'Low', cls: 'text-amber-400 bg-amber-900/20 border-amber-600' };
    return { label: 'Normal', cls: 'text-emerald-400 bg-emerald-900/20 border-emerald-700' };
  })();

  const langLabel = record.intake_language && record.intake_language !== 'en-IN'
    ? record.intake_language.replace('-IN','').replace('-PK','')
    : null;

  return (
    <CockpitErrorBoundary tokenId={tokenId}>
    {/* ── Fullscreen CDSS overlay ───────────────────────────────────────── */}
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">

      {/* ══ TOP HEADER BAR ══════════════════════════════════════════════════ */}
      <div className={`shrink-0 border-b px-5 py-2.5 flex items-center gap-4 ${
        isRed ? 'bg-red-950 border-red-800' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Left — patient identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isRed ? 'bg-red-700' : 'bg-emerald-800'
          }`}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-extrabold text-sm truncate">{record.patient_name}</span>
              <span className="text-slate-400 text-xs">{record.age ?? '?'}y · {record.gender ?? '?'}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">
                {record.token_id}
              </span>
              {/* Bilingual origin badge */}
              {langLabel && record.vernacular_text && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-900/40 border border-indigo-600/50 text-indigo-300 text-[10px] font-medium max-w-xs truncate"
                  title={record.vernacular_text}>
                  🗣️ Translated from {langLabel}: "{record.vernacular_text}"
                </span>
              )}
            </div>
            <div className="text-slate-500 text-[10px] font-mono mt-0.5">
              {record.chief_complaint_key.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Right — triage status + controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Triage status badge */}
          {isRed ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-700 text-white text-xs font-extrabold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" /> EMERGENCY INTERCEPT
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-xs font-bold">
              <Activity className="w-3.5 h-3.5" /> Stable Hemodynamics
            </span>
          )}
          {/* EN↔HI toggle */}
          <button
            onClick={() => setHindi(v => !v)}
            title={hindi ? 'Switch to English' : 'हिंदी में देखें'}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              hindi ? 'border-orange-500 bg-orange-900/30 text-orange-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-orange-500'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            {hindi ? 'EN' : 'हि'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ══ 3-COLUMN BENTO BODY ════════════════════════════════════════════ */}
      {/* Uses fixed height = screen minus header (56px) minus FHIR drawer (auto) */}
      <div className="flex-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.6fr)] divide-x divide-slate-800 overflow-hidden">

        {/* ── COL 1: Vitals + Dashavidha ─────────────────────────────────── */}
        <div className="overflow-y-auto p-4 space-y-3 bg-slate-950">

          <SectionLabel icon={<Activity className="w-3 h-3" />} label="Instant Vitals" color="text-cyan-400" />

          {/* BP */}
          {(record.vitals.bp_systolic || record.vitals.bp_diastolic) ? (
            <div className={`rounded-xl border p-3 ${bpStatus?.cls ?? 'border-slate-700 bg-slate-900'}`}>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Blood Pressure</p>
              <p className={`text-2xl font-black tabular-nums mt-0.5 ${bpStatus ? bpStatus.cls.split(' ')[0] : 'text-blue-400'}`}>
                {record.vitals.bp_systolic ?? '—'}/{record.vitals.bp_diastolic ?? '—'}
                <span className="text-xs font-normal ml-1 text-slate-500">mmHg</span>
              </p>
              {bpStatus && <span className={`text-[10px] font-bold ${bpStatus.cls.split(' ')[0]}`}>{bpStatus.label}</span>}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-slate-600 text-xs text-center">BP not recorded</div>
          )}

          {/* Pulse / SpO2 / Temp row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Pulse', val: record.vitals.pulse ? `${record.vitals.pulse}` : '—', unit: 'bpm', color: 'text-pink-400' },
              { label: 'SpO₂', val: record.vitals.spo2 ? `${record.vitals.spo2}%` : '—', unit: '', color: spo2Status?.cls.split(' ')[0] ?? 'text-cyan-400' },
              { label: 'Temp', val: record.vitals.temp ? `${record.vitals.temp}°C` : '—', unit: '', color: 'text-orange-400' },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</p>
                <p className={`text-base font-black tabular-nums ${color}`}>{val}<span className="text-[9px] text-slate-600 ml-0.5">{unit}</span></p>
              </div>
            ))}
          </div>

          {/* SpO2 status badge */}
          {spo2Status && (
            <div className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${spo2Status.cls}`}>
              SpO₂ {spo2Status.label}
            </div>
          )}

          {/* Pain VAS bar */}
          {record.pain_scale != null && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Pain Index (VAS)</p>
                <span className={`text-xs font-black tabular-nums ${
                  record.pain_scale >= 7 ? 'text-red-400' : record.pain_scale >= 4 ? 'text-amber-400' : 'text-emerald-400'
                }`}>{record.pain_scale}/10</span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${painColor}`} style={{ width: `${painPct}%` }} />
              </div>
              <p className={`text-[10px] font-bold mt-1 ${
                record.pain_scale >= 7 ? 'text-red-400' : record.pain_scale >= 4 ? 'text-amber-400' : 'text-emerald-400'
              }`}>{painSev}</p>
            </div>
          )}

          {/* Dashavidha / Dosha card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Dashavidha Pariksha</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-slate-800 rounded-lg px-2 py-1.5">
                <p className="text-slate-600">Agni</p>
                <p className="text-orange-300 font-bold">{record.ontology.agni_type ?? '—'}</p>
              </div>
              <div className="bg-slate-800 rounded-lg px-2 py-1.5">
                <p className="text-slate-600">Koshtha</p>
                <p className="text-cyan-300 font-bold">{record.ontology.koshtha_type ?? '—'}</p>
              </div>
            </div>
            {/* Tridosha bars */}
            {vv && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Vikriti Dosha</p>
                <Dosha label="Vata" val={vv.vata} color="bg-violet-500" />
                <Dosha label="Pitta" val={vv.pitta} color="bg-red-500" />
                <Dosha label="Kaph" val={vv.kapha} color="bg-sky-500" />
              </div>
            )}
            {record.ontology.tridosha_imbalance && (
              <div className="px-2 py-1 rounded-lg bg-purple-900/30 border border-purple-700/40 text-purple-300 text-[10px] font-bold">
                ☯ {record.ontology.tridosha_imbalance}
              </div>
            )}
          </div>
        </div>

        {/* ── COL 2: Diagnosis + Differentials + SOAP ─────────────────────── */}
        <div className="overflow-y-auto p-4 space-y-3 bg-slate-950">

          <SectionLabel icon={<FileText className="w-3 h-3" />} label="Dual Diagnosis" color="text-blue-400" />

          {/* ICD-11 card */}
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] text-blue-500 uppercase tracking-wider font-bold">WHO ICD-11</p>
                <p className="text-blue-300 font-black text-lg font-mono leading-tight">{record.ontology.icd11_code ?? '—'}</p>
                <p className="text-blue-200 text-xs mt-0.5 leading-tight">{record.ontology.icd11_title ?? '—'}</p>
              </div>
              <a
                href={`https://icd.who.int/browse/2024-01/mms/en#${record.ontology.icd11_code ?? ''}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:text-blue-300 border border-blue-800 rounded-lg px-2 py-1 shrink-0 transition-colors"
              >↗ ICD Ref</a>
            </div>
          </div>

          {/* NAMASTE AYUSH card */}
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3">
            <p className="text-[9px] text-emerald-500 uppercase tracking-wider font-bold">NAMASTE AYUSH</p>
            <p className="text-emerald-300 font-black text-base font-mono leading-tight">{record.ontology.namaste_code ?? '—'}</p>
            <p className="text-emerald-200 text-xs mt-0.5 leading-tight">{record.ontology.namaste_title ?? '—'}</p>
          </div>

          {/* Differentials */}
          {(record.differentials ?? []).length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <SectionLabel icon={<Activity className="w-3 h-3" />} label="Top Differentials" color="text-purple-400" />
              <ol className="space-y-1.5">
                {(record.differentials ?? []).map((d, i) => (
                  <li key={i} className={`text-xs flex items-start gap-2 ${i === 0 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                      i === 0 ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{i + 1}</span>
                    {d.replace(/^\d+\.\s*/, '')}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* SOAP Note */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <SectionLabel icon={<Activity className="w-3 h-3" />} label={t('IBM Granite-3.0 SOAP Summary', hindi)} color="text-emerald-400" />
            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line font-mono">
              {record.granite_triage_summary}
            </p>
          </div>
        </div>

        {/* ── COL 3: Treatment Pad + Safety + Actions ──────────────────────── */}
        <div className="overflow-y-auto p-4 space-y-3 bg-slate-950">

          <SectionLabel icon={<Copy className="w-3 h-3" />} label="Treatment Pad" color="text-amber-400" />

          {/* Herb-Drug safety strip */}
          {record.interaction_warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-600 bg-amber-900/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-amber-400 text-xs font-extrabold uppercase tracking-wide">
                  {record.interaction_warnings.length} Herb-Drug Interaction{record.interaction_warnings.length > 1 ? 's' : ''}
                </p>
              </div>
              <ul className="space-y-1">
                {record.interaction_warnings.map((w, i) => (
                  <li key={i} className="text-amber-200 text-[10px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    <span><strong>{w.drug ?? '?'}</strong> + {w.herb ?? '?'}: {w.note ?? ''} <span className="text-amber-500">[{w.severity ?? '?'}]</span></span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-xs font-bold">No Herb-Drug Interactions Detected</p>
            </div>
          )}

          {/* Allopathic Rx */}
          {(record.rx_allopathic ?? []).length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                Conventional First-Line
              </p>
              <ul className="space-y-1.5">
                {(record.rx_allopathic ?? []).map((rx, i) => (
                  <li key={i} className="text-slate-200 text-[11px] flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded bg-blue-800 text-blue-200 flex items-center justify-center text-[9px] font-black mt-0.5">{i+1}</span>
                    {rx}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AYUSH Rx */}
          {(record.rx_ayush ?? []).length > 0 && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
              <p className="text-[9px] text-emerald-600 uppercase tracking-wider font-bold mb-2">
                AYUSH Complementary
              </p>
              <ul className="space-y-1.5">
                {(record.rx_ayush ?? []).map((rx, i) => (
                  <li key={i} className="text-emerald-200 text-[11px] flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded bg-emerald-800 text-emerald-200 flex items-center justify-center text-[9px] font-black mt-0.5">{i+1}</span>
                    {rx}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {/* Copy Rx Pad */}
            <button
              onClick={handleCopyRx}
              className="w-full py-2.5 rounded-xl border border-blue-600 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {rxCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {rxCopied ? 'Copied to Rx Pad!' : 'Copy / Push to Rx Pad'}
            </button>

            {/* In Consultation */}
            <button
              onClick={handleMarkInConsultation}
              disabled={updatingStatus}
              className="w-full py-2.5 rounded-xl border border-emerald-600 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              <Stethoscope className="w-4 h-4" /> {t('In Consultation', hindi)}
            </button>

            {/* Mark Complete */}
            <button
              onClick={handleMarkComplete}
              disabled={updatingStatus}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t('Mark Complete', hindi)}
            </button>
          </div>
        </div>
      </div>

      {/* ══ FHIR EXPANDABLE DRAWER (bottom, non-scrolling) ════════════════ */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900">
        <button
          onClick={() => setFhirExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {t('View ABDM FHIR R4 Bundle', hindi)}
            <span className="text-slate-600 font-normal ml-1">· Technical data on demand</span>
          </span>
          {fhirExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        {fhirExpanded && (
          <div className="border-t border-slate-800 max-h-48 overflow-y-auto">
            <div className="flex justify-end px-4 pt-2 pb-1">
              <button
                onClick={handleCopyFhir}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="text-[10px] text-slate-500 font-mono px-5 pb-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {record.fhir_bundle ? JSON.stringify(record.fhir_bundle, null, 2) : '— FHIR bundle not available —'}
            </pre>
          </div>
        )}
      </div>

    </div>
    </CockpitErrorBoundary>
  );
};

// ── Queue Token Card ───────────────────────────────────────────────────────

interface TokenCardProps {
  entry: QueueEntry;
  onClick: () => void;
  dark?: boolean;
}

const TokenCard: React.FC<TokenCardProps> = ({ entry, onClick, dark = true }) => {
  const isRed = entry.red_flag;
  const statusColor = {
    WAITING: 'text-amber-400',
    IN_CONSULTATION: 'text-emerald-400',
    COMPLETED: 'text-slate-500',
  }[entry.status];

  const statusDot = {
    WAITING: 'bg-amber-400',
    IN_CONSULTATION: 'bg-emerald-400 animate-pulse',
    COMPLETED: 'bg-slate-600',
  }[entry.status];

  const createdAt = new Date(entry.created_at);
  const timeStr = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Wait time in minutes
  const waitMins = Math.floor((Date.now() - createdAt.getTime()) / 60_000);
  const waitStr = waitMins < 1 ? 'Just now' : `${waitMins}m wait`;

  // Pain color
  const painColor =
    (entry.pain_scale ?? 0) >= 7 ? 'text-red-400' :
    (entry.pain_scale ?? 0) >= 4 ? 'text-amber-400' : 'text-emerald-400';

  const cardCls = isRed
    ? (dark ? 'border-red-500 bg-red-900/20 hover:bg-red-900/30' : 'border-red-400 bg-red-50 hover:bg-red-100')
    : (dark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700/80' : 'border-slate-200 bg-white shadow-sm hover:border-emerald-400');

  const nameCls = dark ? 'text-white' : 'text-slate-900';
  const metaCls = dark ? 'text-slate-400' : 'text-slate-500';
  const cabinCls = dark ? 'text-slate-500' : 'text-slate-400';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.01] active:scale-100 ${cardCls}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-mono font-black text-sm ${isRed ? 'text-red-300' : 'text-emerald-300'}`}>
              {entry.token_id}
            </span>
            {isRed && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">
                🚨 EMERGENCY
              </span>
            )}
            {entry.pain_scale != null && (
              <span className={`text-[10px] font-bold tabular-nums ${painColor}`}>
                Pain {entry.pain_scale}/10
              </span>
            )}
          </div>
          <p className={`font-semibold text-sm truncate ${nameCls}`}>{entry.patient_name}</p>
          <p className={`text-xs mt-0.5 capitalize ${metaCls}`}>
            {entry.chief_complaint.replace(/_/g, ' ')}
            {entry.age ? ` · ${entry.age}y` : ''}
            {entry.gender ? ` · ${entry.gender}` : ''}
          </p>
          {entry.cabin && (
            <p className={`text-[10px] mt-0.5 ${cabinCls}`}>🏥 {entry.cabin}</p>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className={`text-xs font-semibold ${statusColor}`}>{entry.status.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
            <Clock className="w-3 h-3" />
            {timeStr}
          </div>
          <span className="text-[10px] text-slate-500">{waitStr}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRed ? 'bg-red-700 text-white' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'}`}>
            Attend Patient →
          </span>
        </div>
      </div>
    </button>
  );
};

// ── Main Staff Portal ──────────────────────────────────────────────────────

export const StaffPortal: React.FC = () => {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dark, setDark] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Theme helpers
  const th = {
    screen:  dark ? 'bg-slate-950 text-white'          : 'bg-slate-50 text-slate-900',
    header:  dark ? 'bg-slate-900 border-slate-700/60'  : 'bg-white border-slate-200',
    statsBar:dark ? 'bg-slate-900 border-slate-700/40'  : 'bg-white border-slate-200',
    card:    dark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700/80'
                  : 'border-slate-200 bg-white shadow-sm hover:border-emerald-400',
    redCard: dark ? 'border-red-500 bg-red-900/20 hover:bg-red-900/30'
                  : 'border-red-400 bg-red-50 hover:bg-red-100',
    text:    dark ? 'text-white'    : 'text-slate-900',
    muted:   dark ? 'text-slate-400': 'text-slate-500',
    subtext: dark ? 'text-slate-500': 'text-slate-400',
    emptyBg: dark ? 'bg-slate-800'  : 'bg-slate-100',
  };

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/queue`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        setLastUpdated(new Date());
      }
    } catch { /* network error */ } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!role) return;
    fetchQueue();
  }, [role, fetchQueue]);

  useEffect(() => {
    if (!role || !autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchQueue, 3500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [role, autoRefresh, fetchQueue]);

  const handleStatusUpdate = (tokenId: string, status: 'IN_CONSULTATION' | 'COMPLETED') => {
    setQueue(prev => prev.map(e => e.token_id === tokenId ? { ...e, status } : e));
  };

  if (!role) {
    return <PinGate onUnlock={setRole} />;
  }

  const redQueue = queue.filter(e => e.red_flag && e.status !== 'COMPLETED');
  const normalQueue = queue.filter(e => !e.red_flag && e.status !== 'COMPLETED');

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${th.screen}`}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className={`border-b px-5 py-3 flex items-center justify-between gap-4 ${th.header}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className={`font-extrabold text-sm ${th.text}`}>OPD Staff Workstation</div>
            <div className={`text-[10px] font-mono ${th.muted}`}>
              Role: <span className="text-emerald-500 capitalize">{role}</span> · AIIA PS-26047
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Light / Dark toggle */}
          <button
            onClick={() => setDark(v => !v)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              dark
                ? 'border-slate-600 bg-slate-800 text-amber-400 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={dark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              autoRefresh
                ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400'
                : dark ? 'border-slate-600 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}
            title={autoRefresh ? 'Auto-refresh ON (3.5s)' : 'Auto-refresh OFF'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Paused'}</span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchQueue}
            disabled={queueLoading}
            className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${
              dark ? 'border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${queueLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout */}
          <button
            onClick={() => setRole(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors hover:text-red-500 hover:border-red-500 ${
              dark ? 'border-slate-600 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Lock
          </button>
        </div>
      </header>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className={`border-b px-5 py-2 flex items-center gap-6 ${th.statsBar}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className={`text-xs ${th.muted}`}>Waiting: <span className={`font-bold ${th.text}`}>{queue.filter(e => e.status === 'WAITING').length}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`text-xs ${th.muted}`}>In Consultation: <span className={`font-bold ${th.text}`}>{queue.filter(e => e.status === 'IN_CONSULTATION').length}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className={`text-xs ${th.muted}`}>Emergency: <span className="text-red-500 font-bold">{redQueue.length}</span></span>
        </div>
        {lastUpdated && (
          <div className={`ml-auto flex items-center gap-1 text-[10px] font-mono ${th.subtext}`}>
            <Clock className="w-3 h-3" />
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-5 space-y-6 max-w-3xl mx-auto w-full">

        {/* Emergency banner */}
        {redQueue.length > 0 && (
          <div className="p-4 rounded-xl bg-red-600/20 border-2 border-red-500 flex items-center gap-3 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <p className="text-red-500 font-extrabold text-sm">
                🚨 {redQueue.length} EMERGENCY TOKEN{redQueue.length > 1 ? 'S' : ''} — Immediate Attention Required
              </p>
              <p className="text-red-400 text-xs mt-0.5">
                {redQueue.map(e => e.token_id).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {queue.length === 0 && !queueLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${th.emptyBg}`}>
              <Activity className={`w-8 h-8 ${th.subtext}`} />
            </div>
            <p className={`font-semibold ${th.muted}`}>No active patients in queue</p>
            <p className={`text-sm ${th.subtext}`}>Queue auto-refreshes every 3.5 seconds</p>
          </div>
        )}

        {/* Emergency tokens */}
        {redQueue.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Emergency / Red-Flag ({redQueue.length})
            </h2>
            <div className="space-y-2">
              {redQueue.map(entry => (
                <TokenCard key={entry.token_id} entry={entry} onClick={() => setSelectedToken(entry.token_id)} dark={dark} />
              ))}
            </div>
          </div>
        )}

        {/* Normal queue */}
        {normalQueue.length > 0 && (
          <div>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${th.muted}`}>
              <Activity className="w-3.5 h-3.5" /> Standard Queue ({normalQueue.length})
            </h2>
            <div className="space-y-2">
              {normalQueue.map(entry => (
                <TokenCard key={entry.token_id} entry={entry} onClick={() => setSelectedToken(entry.token_id)} dark={dark} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Doctor Cockpit Drawer ─────────────────────────────────────────── */}
      {selectedToken && (
        <CockpitDrawer
          tokenId={selectedToken}
          role={role}
          onClose={() => setSelectedToken(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default StaffPortal;
