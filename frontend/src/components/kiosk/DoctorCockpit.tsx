/**
 * DoctorCockpit.tsx — Sprint 4
 * Doctor Cockpit: 15-second physician triage view with Human-in-the-Loop CDSS (AIIA PS-26047)
 * Fetches GET /api/v1/kiosk/doctor-cockpit/{token_id} via configured apiClient.
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
  Plus,
  X,
  Pill,
  Leaf,
  Siren,
} from 'lucide-react';
import { apiClient } from '../../services/api';

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

interface AiRxItem {
  name: string;
  dosage: string;
  type: 'allopathic' | 'ayush';
}

interface CockpitRecord {
  token_id: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  chief_complaint_key: string;
  chief_complaint?: string;
  raw_symptoms: string[];
  pain_scale: number | null;
  vitals: VitalsDict;
  ontology: OntologyResult;
  interaction_warnings: InteractionWarning[];
  fhir_bundle: object;
  granite_triage_summary: GraniteSoap | string;
  // AI-generated Rx pre-seeded from Groq
  ai_allopathic_rx?: AiRxItem[];
  ai_ayush_rx?: AiRxItem[];
  // AI-generated SOAP plan (for doctorAdvice seed)
  diagnosis?: {
    granite_soap?: GraniteSoap;
    [key: string]: unknown;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Medication type ───────────────────────────────────────────────────────────
interface Medication {
  id: string;
  name: string;
  dosage: string;
  type: 'allopathic' | 'ayush';
}

interface DoctorCockpitProps {
  tokenId: string;
  onBack?: () => void;
}

export const DoctorCockpit: React.FC<DoctorCockpitProps> = ({ tokenId, onBack }) => {
  const [record, setRecord]   = useState<CockpitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'cockpit' | 'fhir'>('cockpit');
  const [soapOpen, setSoapOpen] = useState(true);
  const [copied, setCopied]   = useState(false);

  // ── Human-in-the-Loop CDSS prescription state ────────────────────────────
  // Start empty — seeded from backend AI Rx once data loads (see useEffect below)
  const [medications, setMedications] = useState<Medication[]>([]);
  const [customMedName, setCustomMedName]   = useState('');
  const [customMedDosage, setCustomMedDosage] = useState('');
  const [customMedType, setCustomMedType]   = useState<'allopathic' | 'ayush'>('allopathic');
  const [doctorAdvice, setDoctorAdvice]     = useState('');

  // ── Action-button UI state ────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toast, setToast]                   = useState<{ msg: string; color: string; tone: 'success' | 'warning' | 'error' } | null>(null);
  const [actionLoading, setActionLoading]   = useState<'approve' | 'escalate' | null>(null);

  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    setError('');
    apiClient.get(`/kiosk/doctor-cockpit/${encodeURIComponent(tokenId)}`)
      .then((r) => r.data)
      .then((data: CockpitRecord) => {
        setRecord(data);

        // ── Seed prescription pad from Groq AI suggestions ──────────────────
        const seedMeds: Medication[] = [];
        (data.ai_allopathic_rx || []).forEach((rx, i) => {
          seedMeds.push({
            id: `ai-allo-${i}`,
            name: rx.name,
            dosage: rx.dosage,
            type: 'allopathic',
          });
        });
        (data.ai_ayush_rx || []).forEach((rx, i) => {
          seedMeds.push({
            id: `ai-ayush-${i}`,
            name: rx.name,
            dosage: rx.dosage,
            type: 'ayush',
          });
        });
        if (seedMeds.length > 0) setMedications(seedMeds);

        // ── Seed doctor-advice textarea from SOAP plan ───────────────────────
        const soapPlan =
          data.diagnosis?.granite_soap?.plan ||
          (typeof data.granite_triage_summary === 'object'
            ? (data.granite_triage_summary as GraniteSoap).plan
            : undefined);
        if (soapPlan) setDoctorAdvice(soapPlan);

        setLoading(false);
      })
      .catch((e: any) => {
        const msg = e?.response?.data?.detail || e?.message || 'Failed to fetch cockpit data';
        setError(msg);
        setLoading(false);
      });
  }, [tokenId]);

  const copyFhir = () => {
    if (!record) return;
    navigator.clipboard?.writeText(JSON.stringify(record.fhir_bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Prescription pad helpers ─────────────────────────────────────────────
  const showToast = (msg: string, color: string, tone: 'success' | 'warning' | 'error' = 'error') => {
    setToast({ msg, color, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const addMedication = () => {
    if (!customMedName.trim()) return;
    const newMed: Medication = {
      id: Date.now().toString(),
      name: customMedName.trim(),
      dosage: customMedDosage.trim() || 'As directed',
      type: customMedType,
    };
    setMedications((prev) => [...prev, newMed]);
    setCustomMedName('');
    setCustomMedDosage('');
  };

  const removeMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!record) return;
    setActionLoading('approve');
    try {
      // maxRedirects:0 prevents axios from following a 307 redirect and
      // downgrading POST → GET, which would produce a spurious 405.
      await apiClient.post(
        `/kiosk/queue/${record.token_id}/complete`,
        { final_medications: medications, doctor_advice: doctorAdvice, status: 'COMPLETED' },
        { maxRedirects: 0 },
      );
      showToast('Prescription Finalized & Pushed to ABDM', '#065f46', 'success');
      setTimeout(() => { if (onBack) onBack(); }, 1500);
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.detail || e?.message || 'Failed to finalize'}`, '#7f1d1d');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    if (!record) return;
    setActionLoading('escalate');
    try {
      // maxRedirects:0 — same guard as handleApprove above.
      await apiClient.post(
        `/kiosk/queue/${record.token_id}/escalate`,
        { red_flag: true },
        { maxRedirects: 0 },
      );
      showToast('Patient Escalated to Emergency Red-Flag Priority', '#7c2d12', 'warning');
      setTimeout(() => { if (onBack) onBack(); }, 1500);
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.detail || e?.message || 'Failed to escalate'}`, '#7f1d1d');
    } finally {
      setActionLoading(null);
    }
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

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-white font-bold text-sm border border-white/10 backdrop-blur flex items-center gap-2 max-w-[calc(100vw-2rem)]"
          style={{ background: toast.color }}
        >
          {toast.tone === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── ABDM OPD Prescription Slip Modal ── */}
      {showPrintModal && record && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-emerald-700 text-white px-4 sm:px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black tracking-wide">GOVERNMENT CIVIL HOSPITAL, JALANDHAR</h2>
                  <p className="text-emerald-200 text-xs mt-0.5 font-semibold">OPD SLIP · AIIA PS-26047 · SehatMitra-AI · ICD-11 + NAMASTE Dual-Ontology</p>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-emerald-200 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Token banner */}
            <div className="bg-emerald-900 text-emerald-200 px-4 sm:px-6 py-2 flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-xs font-bold">
              <span>TOKEN</span>
              <span className="text-2xl font-black font-mono text-emerald-300">{record.token_id}</span>
              <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="p-4 sm:p-6 space-y-4 print:p-4">
              {/* Patient Info */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">Patient Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Full Name</p>
                    <p className="text-gray-900 font-extrabold text-sm mt-0.5">{record.patient_name}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Age · Gender · Token</p>
                    <p className="text-gray-900 font-extrabold text-sm mt-0.5">
                      {record.age ?? '—'}y · {record.gender ?? '—'} · <span className="font-mono">{record.token_id}</span>
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Chief Complaint</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5 capitalize">{record.chief_complaint_key.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Vitals */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">Measured Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'BP', value: record.vitals.bp_systolic ? `${record.vitals.bp_systolic}/${record.vitals.bp_diastolic} mmHg` : '—' },
                    { label: 'Pulse', value: record.vitals.pulse ? `${record.vitals.pulse} bpm` : '—' },
                    { label: 'SpO₂', value: record.vitals.spo2 ? `${record.vitals.spo2}%` : '—' },
                    { label: 'Temp', value: record.vitals.temp ? `${record.vitals.temp}°C` : '—' },
                  ].map((v) => (
                    <div key={v.label} className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-gray-500 font-bold uppercase">{v.label}</p>
                      <p className="text-emerald-800 font-extrabold text-xs mt-0.5">{v.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">Dual-Ontology Diagnosis</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-300 text-blue-800 text-xs font-bold rounded-full">
                    ICD-11: {record.ontology.icd11_code} — {record.ontology.icd11_title}
                  </span>
                  <span className="px-3 py-1 bg-purple-50 border border-purple-300 text-purple-800 text-xs font-bold rounded-full">
                    NAMASTE: {record.ontology.namaste_code} — {record.ontology.namaste_title}
                  </span>
                </div>
              </div>

              {/* Rx Section */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">℞ Prescription</p>
                <div className="space-y-2">
                  {medications.map((med, i) => (
                    <div key={med.id} className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm font-semibold ${
                      med.type === 'allopathic'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-green-50 border-green-200 text-green-900'
                    }`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${
                        med.type === 'allopathic' ? 'bg-blue-600' : 'bg-green-700'
                      }`}>{i + 1}</span>
                      <span className="font-bold">{med.name}</span>
                      <span className="ml-auto text-xs opacity-70">{med.dosage}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        med.type === 'allopathic' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-700'
                      }`}>{med.type === 'allopathic' ? 'Allo' : 'AYUSH'}</span>
                    </div>
                  ))}
                  {medications.length === 0 && (
                    <p className="text-gray-400 text-xs italic">No medications prescribed.</p>
                  )}
                </div>
              </div>

              {/* Doctor Advice */}
              {doctorAdvice && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-2">Clinical Advice</p>
                  <p className="text-gray-700 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">{doctorAdvice}</p>
                </div>
              )}

              {/* Doctor Signature Block */}
              <div className="flex items-end justify-between border-t border-gray-200 pt-4 mt-2">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Physician Signature</p>
                  <div className="w-40 border-b border-gray-400 mt-6 mb-1" />
                  <p className="text-[9px] text-gray-500">MBBS / BAMS · Reg. No. ___________</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center text-[9px] text-gray-400 font-bold">
                    QR<br />Verify
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">ABDM Verified</p>
                </div>
              </div>

              {/* Print Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className={`sticky top-0 z-20 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 border-b ${
        isRed ? 'bg-red-950/80 border-red-700' : 'bg-slate-800/90 border-slate-700'
      } backdrop-blur`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black ${
            isRed ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'
          }`}>
            {isRed ? <Siren className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-xl max-w-full">
          <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-300 text-xs font-mono break-words min-w-0">{vitalsStr}</span>
        </div>

        {/* Red-flag intercept strip */}
        {isRed && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-800 rounded-xl border border-red-600 sm:ml-auto max-w-full">
            <ShieldAlert className="w-4 h-4 text-red-300 animate-pulse shrink-0" />
            <span className="text-red-200 text-xs font-bold">EMERGENCY INTERCEPT — {ont.red_flag_reason || 'Red-flag triggered'}</span>
          </div>
        )}
      </div>

      {/* ── Tab toggle ── */}
      <div className="flex gap-2 p-3 sm:p-4 pb-0 sm:pb-0">
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
        <div className="p-3 sm:p-4 grid grid-cols-12 gap-3 sm:gap-4">

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
                      }`}>{(record.vitals.bp_systolic || 0) >= 180 ? 'Crisis' : (record.vitals.bp_systolic || 0) >= 140 ? 'Elevated' : 'Normal'}</span>
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
                        {(record.vitals.pulse || 0) > 100 || (record.vitals.pulse || 0) < 60 ? 'Irregular' : 'Normal'}
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
                        {(record.vitals.spo2 || 100) < 90 ? 'Critical' : (record.vitals.spo2 || 100) < 94 ? 'Low' : 'Normal'}
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
                        {(record.vitals.temp || 0) > 38.5 ? 'Fever' : 'Normal'}
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

            {/* ── Active Doctor Prescription Workspace (Human-in-the-Loop CDSS) ── */}
            <div className="bg-slate-800 rounded-2xl border border-emerald-700/60">
              <div className="flex items-center gap-2 p-4 border-b border-slate-700">
                <ClipboardList className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-white font-bold text-sm">Active Doctor Prescription Workspace</p>
                  <p className="text-slate-400 text-xs">AI suggestions pre-loaded — edit, remove, or add medications before approving</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Current medication badges */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">℞ Current Medications</p>
                  {medications.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-2">No medications added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {medications.map((med) => (
                        <div
                          key={med.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                            med.type === 'allopathic'
                              ? 'bg-blue-900/30 border-blue-700/50 text-blue-200'
                              : 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200'
                          }`}
                        >
                          {med.type === 'allopathic'
                            ? <Pill className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            : <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <span className="font-bold">{med.name}</span>
                          <span className="text-xs opacity-70">— {med.dosage}</span>
                          <span className={`ml-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            med.type === 'allopathic' ? 'bg-blue-800 text-blue-300' : 'bg-emerald-800 text-emerald-300'
                          }`}>{med.type === 'allopathic' ? 'Allo' : 'AYUSH'}</span>
                          <button
                            onClick={() => removeMedication(med.id)}
                            className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-0.5 rounded"
                            title="Remove medication"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add medication row */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Add Medication</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="text"
                      value={customMedName}
                      onChange={(e) => setCustomMedName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                      placeholder="Medicine Name"
                      className="flex-1 min-w-[180px] bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={customMedDosage}
                      onChange={(e) => setCustomMedDosage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                      placeholder="Dosage (e.g. BD × 3 days)"
                      className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={customMedType}
                      onChange={(e) => setCustomMedType(e.target.value as 'allopathic' | 'ayush')}
                      className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="allopathic">Allopathic</option>
                      <option value="ayush">AYUSH</option>
                    </select>
                    <button
                      onClick={addMedication}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors border border-emerald-600"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Doctor Clinical Advice */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Doctor Clinical Advice / Instructions</p>
                  <textarea
                    value={doctorAdvice}
                    onChange={(e) => setDoctorAdvice(e.target.value)}
                    rows={3}
                    placeholder="Add clinical instructions, lifestyle advice, follow-up notes…"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Triage action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <button
                disabled={actionLoading === 'approve'}
                className="flex items-center justify-center gap-2 py-3.5 sm:py-4 px-2 text-center rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/40 border border-emerald-600"
                onClick={handleApprove}
              >
                {actionLoading === 'approve'
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <CheckCircle2 className="w-5 h-5" />}
                Approve &amp; E-Prescription
              </button>
              <button
                className="flex items-center justify-center gap-2 py-3.5 sm:py-4 px-2 text-center rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/40 border border-blue-600"
                onClick={() => setShowPrintModal(true)}
              >
                <Printer className="w-5 h-5" />
                Print Clinical Slip
              </button>
              <button
                disabled={actionLoading === 'escalate'}
                className="flex items-center justify-center gap-2 py-3.5 sm:py-4 px-2 text-center rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-red-900/40 border border-red-600"
                onClick={handleEscalate}
              >
                {actionLoading === 'escalate'
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <ArrowUpCircle className="w-5 h-5" />}
                Escalate Priority
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FHIR Tab ── */}
      {tab === 'fhir' && (
        <div className="p-3 sm:p-4 max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
