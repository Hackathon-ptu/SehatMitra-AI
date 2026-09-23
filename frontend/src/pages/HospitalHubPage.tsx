/**
 * HospitalHubPage.tsx — Hospital OPD Portal Gateway + 3-Tab Authenticated Workstation
 * Route: /hospital  and  /staff
 *
 * Auth:  sessionStorage key "hosp_auth" = "true" (cleared on Lock & Logout).
 *        Every fresh browser session starts at the Login Gateway.
 *        Demo credentials: Facility PB-JAL-001 | Passcode 1234
 *
 * Tabs (after login):
 *   1. 🖥️  Patient Desk  → CharakKiosk  (touch intake + token generation)
 *   2. 👩‍⚕️  Nurse Desk   → Triage queue + Vitals modal
 *   3. 👨‍⚕️  Doctor Desk  → OPD queue + 3-Column Bento Cockpit
 *
 * AIIA PS-26047 — SehatMitra-AI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CharakKiosk } from '../components/kiosk/CharakKiosk';
import { DoctorCockpit } from '../components/kiosk/DoctorCockpit';
import { apiClient } from '../services/api';
import {
  Hospital, Sun, Moon, Lock, Eye, EyeOff,
  Activity, Stethoscope, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Users, Zap, Timer, TrendingUp,
  X, Loader2, ShieldAlert, Shield,
  MonitorSmartphone, ArrowLeft, Home,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkTab = 'patient' | 'nurse' | 'doctor';
type StaffRole = 'doctor' | 'nurse' | 'registration';

type QueueStatus =
  | 'TRIAGE_PENDING' | 'EMERGENCY_TRIAGE' | 'READY_FOR_DOCTOR'
  | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';

interface QueueVitals {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  temp?: number | null;
  verified_by_nurse?: boolean;
  nurse_notes?: string;
}

interface QueueEntry {
  token_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  chief_complaint: string;
  pain_scale: number | null;
  red_flag: boolean;
  red_flag_reason?: string | null;
  status: QueueStatus;
  cabin?: string;
  created_at: string;
  vitals?: QueueVitals;
}

const STATUS_META: Record<QueueStatus, { label: string; dot: string }> = {
  TRIAGE_PENDING:   { label: 'Waiting',    dot: 'bg-amber-400'   },
  EMERGENCY_TRIAGE: { label: 'Emergency',  dot: 'bg-red-500'     },
  READY_FOR_DOCTOR: { label: 'Ready',      dot: 'bg-blue-500'    },
  IN_CONSULTATION:  { label: 'Consulting', dot: 'bg-purple-500'  },
  COMPLETED:        { label: 'Completed',  dot: 'bg-emerald-500' },
  CANCELLED:        { label: 'Cancelled',  dot: 'bg-slate-400'   },
};

// ── Nurse Triage Modal ─────────────────────────────────────────────────────────

interface NurseTriageModalProps {
  entry: QueueEntry;
  onClose: () => void;
  onVerified: (updated: QueueEntry) => void;
  dark: boolean;
}

const NurseTriageModal: React.FC<NurseTriageModalProps> = ({ entry, onClose, onVerified, dark }) => {
  const [bpSys,      setBpSys]      = useState(String(entry.vitals?.bp_systolic  ?? ''));
  const [bpDia,      setBpDia]      = useState(String(entry.vitals?.bp_diastolic ?? ''));
  const [pulse,      setPulse]      = useState(String(entry.vitals?.pulse        ?? ''));
  const [spo2,       setSpo2]       = useState(String(entry.vitals?.spo2         ?? ''));
  const [temp,       setTemp]       = useState(String(entry.vitals?.temp         ?? ''));
  const [nurseNotes, setNurseNotes] = useState('');
  const [redFlag,    setRedFlag]    = useState(entry.red_flag);
  const [cabin,      setCabin]      = useState(entry.cabin ?? 'Cabin 1 - Dr. Sharma');
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const CABINS = ['Cabin 1 - Dr. Sharma', 'Cabin 2 - Dr. Verma', 'Cabin 3 - Dr. Patel'];

  const handleSend = async () => {
    setSaving(true); setSaveError('');
    try {
      const res = await apiClient.post(
        `/kiosk/queue/${encodeURIComponent(entry.token_id)}/nurse-verify`,
        {
          bp_systolic:    bpSys  ? Number(bpSys)  : null,
          bp_diastolic:   bpDia  ? Number(bpDia)  : null,
          pulse:          pulse  ? Number(pulse)  : null,
          spo2:           spo2   ? Number(spo2)   : null,
          temp:           temp   ? Number(temp)   : null,
          nurse_notes:    nurseNotes || null,
          assigned_cabin: cabin,
          red_flag:       redFlag,
        }
      );
      onVerified(res.data);
      onClose();
    } catch (e: any) {
      setSaveError(e.response?.data?.detail || e.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const card  = dark ? 'bg-slate-900 border-slate-700'  : 'bg-white border-slate-200';
  const inp   = dark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                     : 'bg-slate-50  border-slate-300 text-slate-900 placeholder-slate-400';
  const lbl   = `text-[10px] font-bold uppercase tracking-wider block mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${card}`}>
        <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
          redFlag ? 'bg-red-950 border-red-800' : dark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${redFlag ? 'bg-red-700' : 'bg-emerald-700'}`}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={`font-extrabold text-sm ${dark || redFlag ? 'text-white' : 'text-slate-900'}`}>Nurse Triage &amp; Vitals Station</p>
              <p className={`text-[10px] font-mono ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{entry.token_id} · {entry.patient_name}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          <div className={`rounded-xl border p-4 space-y-1 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{entry.patient_name}</p>
            <p className={`text-xs capitalize ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {entry.chief_complaint.replace(/_/g, ' ')}{entry.age ? ` · ${entry.age}y` : ''}{entry.gender ? ` · ${entry.gender}` : ''}
            </p>
            {entry.red_flag_reason && (
              <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{entry.red_flag_reason}</p>
            )}
          </div>

          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Activity className="w-3.5 h-3.5 text-emerald-500" />Vitals Verification / Entry
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'BP Systolic (mmHg)', val: bpSys, set: setBpSys, ph: '120' },
                { label: 'BP Diastolic (mmHg)',val: bpDia, set: setBpDia, ph: '80'  },
                { label: 'Pulse (bpm)',         val: pulse, set: setPulse, ph: '72'  },
                { label: 'SpO₂ (%)',            val: spo2,  set: setSpo2,  ph: '98'  },
              ].map(f => (
                <div key={f.label}>
                  <label className={lbl}>{f.label}</label>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${inp}`} />
                </div>
              ))}
              <div className="col-span-2">
                <label className={lbl}>Temperature (°F)</label>
                <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} placeholder="98.6"
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${inp}`} />
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            redFlag ? 'bg-red-900/30 border-red-600' : dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Emergency Escalation</p>
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Toggle if patient condition deteriorates</p>
            </div>
            <button onClick={() => setRedFlag(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${redFlag ? 'bg-red-600' : 'bg-slate-500'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${redFlag ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className={lbl}>Nurse Observations (optional)</label>
            <textarea value={nurseNotes} onChange={e => setNurseNotes(e.target.value)}
              placeholder="Any clinical observations..." rows={2}
              className={`w-full px-3 py-2 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${inp}`} />
          </div>

          <div>
            <label className={lbl}>Cabin Assignment</label>
            <select value={cabin} onChange={e => setCabin(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${inp}`}>
              {CABINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={`px-5 py-4 border-t space-y-2 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          {saveError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" />{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-none px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                dark ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}>Cancel</button>
            <button onClick={handleSend} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Forward to Doctor Cabin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Token Queue Card ───────────────────────────────────────────────────────────

interface TokenCardProps {
  entry: QueueEntry;
  actionLabel: string;
  actionClass: string;
  actionIcon: React.ReactNode;
  onAction: () => void;
  canAct: boolean;
  dark: boolean;
}

const TokenCard: React.FC<TokenCardProps> = ({ entry, actionLabel, actionClass, actionIcon, onAction, canAct, dark }) => {
  const meta = STATUS_META[entry.status] ?? { label: entry.status, dot: 'bg-slate-400' };
  const isEmg = entry.red_flag || entry.status === 'EMERGENCY_TRIAGE';
  const card  = dark
    ? isEmg ? 'border-red-500/70 bg-red-900/20' : 'border-slate-700 bg-slate-800/80'
    : isEmg ? 'border-red-400 bg-red-50'         : 'border-slate-200 bg-white shadow-sm';
  const txt   = dark ? 'text-white'    : 'text-slate-900';
  const muted = dark ? 'text-slate-400': 'text-slate-500';

  return (
    <div className={`rounded-xl border p-4 transition-all ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-mono text-sm font-black ${isEmg ? 'text-red-400' : dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {entry.token_id}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              dark ? `border-current ${meta.dot.replace('bg-', 'text-')}` : `border-current ${meta.dot.replace('bg-', 'text-').replace('400','700').replace('500','700')}`
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
            </span>
            {isEmg && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-700/30 border border-red-500 text-red-400 uppercase tracking-wide animate-pulse">🚨 Emergency</span>}
            {entry.vitals?.verified_by_nurse && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-600/50 text-emerald-400">✓ Nurse Verified</span>}
          </div>
          <p className={`font-semibold text-sm truncate ${txt}`}>{entry.patient_name}</p>
          <p className={`text-xs capitalize truncate mt-0.5 ${muted}`}>
            {entry.chief_complaint.replace(/_/g, ' ')}{entry.age ? ` · ${entry.age}y` : ''}{entry.gender ? ` · ${entry.gender}` : ''}
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {entry.pain_scale != null && <span className={muted}>Pain: <span className={`font-bold ${entry.pain_scale >= 7 ? 'text-red-400' : entry.pain_scale >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>{entry.pain_scale}/10</span></span>}
            {entry.vitals?.bp_systolic && <span className={muted}>BP: <span className={`font-bold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{entry.vitals.bp_systolic}/{entry.vitals.bp_diastolic}</span></span>}
            {entry.vitals?.spo2 && <span className={muted}>SpO₂: <span className={`font-bold ${entry.vitals.spo2 < 94 ? 'text-red-400' : 'text-emerald-400'}`}>{entry.vitals.spo2}%</span></span>}
            {entry.cabin && <span className={muted}>📍 {entry.cabin}</span>}
          </div>
        </div>
        {canAct && (
          <button onClick={onAction} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${actionClass}`}>
            {actionIcon}{actionLabel}
          </button>
        )}
      </div>
      {isEmg && entry.red_flag_reason && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400 font-semibold">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />{entry.red_flag_reason}
        </div>
      )}
    </div>
  );
};

// ── Role credentials & Hospital Login Gateway ─────────────────────────────────

interface RoleConfig {
  id: StaffRole;
  title: string;
  pin: string[];         // accepted PINs
  landingTab: WorkTab;   // where they land after login
  badge: string;         // header badge text
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'doctor',
    title: 'Chief Medical Officer / Doctor',
    pin: ['1234'],
    landingTab: 'doctor',
    badge: '👨‍⚕️ Dr. Sharma (CMO) • Cabin 1',
  },
  {
    id: 'nurse',
    title: 'OPD Triage Nurse',
    pin: ['5678'],
    landingTab: 'nurse',
    badge: '👩‍⚕️ Nurse Sunita (Triage) • Desk A',
  },
  {
    id: 'registration',
    title: 'OPD Registration Desk',
    pin: ['0000', '1234'],
    landingTab: 'patient',
    badge: '🖥️ OPD Registration Desk',
  },
];

const PIN_FOR_ROLE: Record<StaffRole, string[]> = {
  doctor:       ['1234'],
  nurse:        ['5678'],
  registration: ['0000', '1234'],
};

// ── LoginGateway ───────────────────────────────────────────────────────────────

interface LoginGatewayProps {
  onAuthenticate: (facilityId: string, facilityName: string, role: StaffRole) => void;
}

const LoginGateway: React.FC<LoginGatewayProps> = ({ onAuthenticate }) => {
  const [facilityId,  setFacilityId]  = useState('PB-JAL-001');
  const [roleId,      setRoleId]      = useState<StaffRole>('doctor');
  const [pin,         setPin]         = useState('');
  const [showPin,     setShowPin]     = useState(false);
  const [error,       setError]       = useState('');
  const [shake,       setShake]       = useState(false);
  const [dark,        setDark]        = useState(false);
  const [loading,     setLoading]     = useState(false);

  const FACILITY_NAMES: Record<string, string> = {
    'PB-JAL-001': 'Civil Hospital, Jalandhar',
    'AIIMS-DEL':  'AIIMS New Delhi',
    'PB-LDH-002': 'Civil Hospital, Ludhiana',
  };

  const roleCfg = ROLE_CONFIGS.find(r => r.id === roleId)!;

  const handleLogin = () => {
    if (!facilityId.trim()) { setError('Please enter a Facility ID.'); return; }
    if (!pin.trim()) { setError('Please enter a Passcode / PIN.'); return; }
    if (!PIN_FOR_ROLE[roleId].includes(pin)) {
      setError(`Incorrect PIN for ${roleCfg.title}. Try: ${PIN_FOR_ROLE[roleId][0]}`);
      setShake(true); setTimeout(() => setShake(false), 600);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const name = FACILITY_NAMES[facilityId.trim().toUpperCase()] ?? `Hospital ${facilityId}`;
      onAuthenticate(facilityId.trim().toUpperCase(), name, roleId);
      setLoading(false);
    }, 600);
  };

  const bg   = dark ? 'bg-slate-950'   : 'bg-gradient-to-br from-emerald-50 via-white to-blue-50';
  const card = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-2xl';
  const txt  = dark ? 'text-white'     : 'text-slate-900';
  const muted= dark ? 'text-slate-400' : 'text-slate-500';
  const inp  = dark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:ring-emerald-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500';
  const lbl  = `text-xs font-bold uppercase tracking-wider block mb-1.5 ${muted}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 relative ${bg}`}>
      {/* Top-left: back to Citizen AI */}
      <Link to="/"
        className={`absolute top-4 left-4 inline-flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-600'} hover:underline`}>
        <ArrowLeft className="w-4 h-4" /> Back to SehatMitra Citizen AI
      </Link>
      {/* Theme toggle */}
      <button onClick={() => setDark(v => !v)}
        className={`absolute top-4 right-4 p-2.5 rounded-xl border text-xs font-bold transition-all ${
          dark ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
        }`}>
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className={`w-full max-w-md space-y-6 transition-transform ${shake ? 'animate-[wiggle_0.1s_ease-in-out_5]' : ''}`}>

        {/* Header branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-900/30">
              <Hospital className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Ayushman Bharat Digital Mission
            </p>
            <h1 className={`font-extrabold text-2xl leading-tight ${txt}`}>Hospital OPD Portal</h1>
            <p className={`text-sm font-semibold mt-1 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>Gateway — Staff Workstation Access</p>
            <p className={`text-[10px] mt-1 font-mono ${muted}`}>AIIA PS-26047 · SehatMitra-AI · NHA Compliant</p>
          </div>
        </div>

        {/* Login form card */}
        <div className={`rounded-2xl border p-6 space-y-5 transition-colors ${card}`}>

          {/* Facility ID */}
          <div>
            <label className={lbl}>Hospital / Facility ID</label>
            <input
              type="text"
              value={facilityId}
              onChange={e => { setFacilityId(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="e.g. PB-JAL-001 or AIIMS-DEL"
              className={`w-full px-4 py-3 rounded-xl border font-mono text-sm focus:outline-none focus:ring-2 transition-colors uppercase tracking-wide ${inp}`}
            />
            {facilityId && FACILITY_NAMES[facilityId.trim().toUpperCase()] && (
              <p className={`text-xs mt-1 font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                ✓ {FACILITY_NAMES[facilityId.trim().toUpperCase()]}
              </p>
            )}
          </div>

          {/* Staff Role */}
          <div>
            <label className={lbl}>Staff ID / Role</label>
            <select
              value={roleId}
              onChange={e => { setRoleId(e.target.value as StaffRole); setPin(''); setError(''); }}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${inp}`}
            >
              {ROLE_CONFIGS.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>

          {/* Password / PIN */}
          <div>
            <label className={lbl}><Lock className="inline w-3 h-3 mr-1" />Access Password / PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={8}
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter passcode"
                autoFocus
                className={`w-full px-4 py-3 pr-11 rounded-xl border text-lg font-mono text-center tracking-[0.4em] focus:outline-none focus:ring-2 transition-colors ${inp}`}
              />
              <button type="button" onClick={() => setShowPin(v => !v)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3 h-3 shrink-0" />{error}
              </p>
            )}
          </div>

          {/* Demo credentials badge */}
          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs ${
            dark ? 'bg-slate-700/50 border-slate-600 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <span className="text-base shrink-0 mt-0.5">🔑</span>
            <div className="space-y-0.5">
              <div><span className="font-bold">Demo Facility:</span> PB-JAL-001</div>
              <div><span className="font-bold">Doctor PIN:</span> 1234 &nbsp;|&nbsp; <span className="font-bold">Nurse PIN:</span> 5678 &nbsp;|&nbsp; <span className="font-bold">Reg PIN:</span> 0000</div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={!pin || !facilityId || loading}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
              : '🏥 Authenticate & Open Hospital Workstation'
            }
          </button>

          {/* Bottom of card: back to Citizen AI */}
          <div className="pt-1 flex justify-center">
            <Link to="/"
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-600'} hover:underline`}>
              <ArrowLeft className="w-4 h-4" /> Back to SehatMitra Citizen AI
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-[11px] ${muted}`}>
          Authorized hospital personnel only. Session expires on logout.
        </p>
      </div>
    </div>
  );
};

// ── Main HospitalHubPage ───────────────────────────────────────────────────────

export const HospitalHubPage: React.FC = () => {
  // Auth: sessionStorage-backed so a fresh browser session always shows login
  const [isHospitalLoggedIn, setIsHospitalLoggedIn] = useState<boolean>(
    () => sessionStorage.getItem('hosp_auth') === 'true'
  );
  const [hospitalId,   setHospitalId]   = useState('PB-JAL-001');
  const [hospitalName, setHospitalName] = useState('Civil Hospital, Jalandhar');
  const [activeRole,   setActiveRole]   = useState<StaffRole>(
    () => (sessionStorage.getItem('hosp_role') as StaffRole | null) ?? 'registration'
  );
  const [activeTab,    setActiveTab]    = useState<WorkTab>('patient');

  // Tab passcode gate state
  const [gateModal, setGateModal] = useState<{
    targetTab: WorkTab;
    requiredRole: StaffRole;
    title: string;
  } | null>(null);
  const [gatePin,    setGatePin]    = useState('');
  const [gateError,  setGateError]  = useState('');
  const [gateShowPin,setGateShowPin]= useState(false);

  // Workstation shared state
  const [dark,          setDark]          = useState(false);
  const [queue,         setQueue]         = useState<QueueEntry[]>([]);
  const [queueLoading,  setQueueLoading]  = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [autoRefresh,   setAutoRefresh]   = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [nurseEntry,    setNurseEntry]    = useState<QueueEntry | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleAuthenticate = (id: string, name: string, role: StaffRole) => {
    const cfg = ROLE_CONFIGS.find(r => r.id === role)!;
    setHospitalId(id);
    setHospitalName(name);
    setActiveRole(role);
    setActiveTab(cfg.landingTab);
    sessionStorage.setItem('hosp_auth', 'true');
    sessionStorage.setItem('hosp_role', role);
    setIsHospitalLoggedIn(true);
  };

  const handleLock = () => {
    sessionStorage.removeItem('hosp_auth');
    sessionStorage.removeItem('hosp_role');
    setIsHospitalLoggedIn(false);
    setActiveRole('registration');
    setActiveTab('patient');
    setSelectedToken(null);
    setNurseEntry(null);
    setGateModal(null);
    setGatePin('');
    setQueue([]);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // ── Tab access control — strict mutual isolation ───────────────────────────
  // Each tab is owned by exactly one role; any other role must re-authenticate.
  const TAB_OWNER: Record<WorkTab, StaffRole> = {
    patient: 'registration',
    nurse:   'nurse',
    doctor:  'doctor',
  };

  const GATE_META: Record<WorkTab, { title: string; description: string }> = {
    patient: {
      title:       '🔒 Registration Operator PIN Required',
      description: 'Enter Registration Desk PIN to access Patient Intake Kiosk',
    },
    nurse: {
      title:       '🔒 Nurse Authorization Required',
      description: 'Enter Nurse PIN (5678) to access Vitals & Triage Station',
    },
    doctor: {
      title:       '🔒 Doctor Authorization Required',
      description: 'Enter Doctor PIN (1234) to access Clinical Cockpit & Prescriptions',
    },
  };

  const handleTabClick = (tab: WorkTab) => {
    setSelectedToken(null);
    // Same role — free access
    if (TAB_OWNER[tab] === activeRole) {
      setActiveTab(tab);
      return;
    }
    // Different role — always gate
    setGateModal({
      targetTab:    tab,
      requiredRole: TAB_OWNER[tab],
      title:        GATE_META[tab].title,
    });
    setGatePin('');
    setGateError('');
    setGateShowPin(false);
  };

  const handleGateSubmit = () => {
    if (!gateModal) return;
    const allowed = PIN_FOR_ROLE[gateModal.requiredRole];
    if (!allowed.includes(gatePin)) {
      setGateError('Invalid Passcode for this role. Please try again.');
      return;
    }
    // Grant access: update both role and tab
    setActiveRole(gateModal.requiredRole);
    sessionStorage.setItem('hosp_role', gateModal.requiredRole);
    setActiveTab(gateModal.targetTab);
    setGateModal(null);
    setGatePin('');
    setGateError('');
  };

  // ── Queue polling ──────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await apiClient.get('/kiosk/queue');
      setQueue(res.data.queue || []);
      setLastUpdated(new Date());
    } catch { /* network error — keep stale */ }
    finally { setQueueLoading(false); }
  }, []);

  useEffect(() => {
    if (!isHospitalLoggedIn || activeTab === 'patient') return;
    fetchQueue();
  }, [isHospitalLoggedIn, activeTab, fetchQueue]);

  useEffect(() => {
    const needsPoll = isHospitalLoggedIn && autoRefresh && activeTab !== 'patient';
    if (!needsPoll) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchQueue, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isHospitalLoggedIn, autoRefresh, activeTab, fetchQueue]);

  const handleNurseVerified = (updated: QueueEntry) =>
    setQueue(prev => prev.map(e => e.token_id === updated.token_id ? updated : e));

  // ── Step 1: Login Gateway ──────────────────────────────────────────────────
  if (!isHospitalLoggedIn) {
    return <LoginGateway onAuthenticate={handleAuthenticate} />;
  }

  // ── Step 2: Doctor Cockpit fullscreen (when "Attend Patient" clicked) ──────
  if (activeTab === 'doctor' && selectedToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3">
          <button onClick={() => setSelectedToken(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors">
            ← Back to Doctor Desk
          </button>
          <span className="text-slate-400 text-xs">
            Doctor Cockpit — <span className="text-emerald-400 font-mono font-bold">{selectedToken}</span>
          </span>
          <button onClick={handleLock}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-700/50 bg-red-900/30 text-red-400 text-xs font-bold hover:bg-red-900/50 transition-colors">
            <Lock className="w-3.5 h-3.5" />🔒 Lock &amp; Logout
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DoctorCockpit tokenId={selectedToken} />
        </div>
      </div>
    );
  }

  // ── Step 3: Authenticated 3-Tab Workstation ────────────────────────────────

  const emergencyQueue = queue.filter(e => e.status === 'EMERGENCY_TRIAGE');
  const triagePending  = queue.filter(e => e.status === 'TRIAGE_PENDING');
  const readyForDoctor = queue.filter(e => e.status === 'READY_FOR_DOCTOR');
  const inConsult      = queue.filter(e => e.status === 'IN_CONSULTATION');
  const completedCount = queue.filter(e => e.status === 'COMPLETED').length;
  const triagedToday   = completedCount + queue.length;
  const hoursSaved     = ((triagedToday * 3.2) / 60).toFixed(1);

  const th = {
    screen:  dark ? 'bg-slate-950 text-white'         : 'bg-slate-50 text-slate-900',
    header:  dark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200',
    tabBar:  dark ? 'bg-slate-900 border-slate-800'    : 'bg-white border-slate-200',
    tabBody: dark ? 'bg-slate-950'                     : 'bg-slate-50',
    txt:     dark ? 'text-white'    : 'text-slate-900',
    muted:   dark ? 'text-slate-400': 'text-slate-500',
    subtext: dark ? 'text-slate-500': 'text-slate-400',
    emptyBg: dark ? 'bg-slate-800'  : 'bg-slate-100',
  };

  const TABS: { id: WorkTab; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
    {
      id: 'patient',
      label: 'Patient Desk (Kiosk)',
      icon: <MonitorSmartphone className="w-4 h-4" />,
      active:   dark ? 'border-emerald-400 text-emerald-300 bg-emerald-900/30' : 'border-emerald-600 text-emerald-700 bg-emerald-50',
      inactive: dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800',
    },
    {
      id: 'nurse',
      label: 'Nurse Desk (Triage)',
      icon: <Activity className="w-4 h-4" />,
      active:   dark ? 'border-teal-400 text-teal-300 bg-teal-900/30'   : 'border-teal-600 text-teal-700 bg-teal-50',
      inactive: dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800',
    },
    {
      id: 'doctor',
      label: 'Doctor Desk (Cockpit)',
      icon: <Stethoscope className="w-4 h-4" />,
      active:   dark ? 'border-blue-400 text-blue-300 bg-blue-900/30'   : 'border-blue-600 text-blue-700 bg-blue-50',
      inactive: dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800',
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${th.screen}`}>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className={`shrink-0 border-b px-5 py-3 flex items-center justify-between gap-4 ${th.header}`}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Green pulse dot + hospital name */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center">
              <Hospital className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className={`font-extrabold text-sm truncate ${th.txt}`}>
              {hospitalName} <span className={`font-mono text-xs font-medium ${th.muted}`}>(ID: {hospitalId})</span> • General OPD
            </div>
            <div className={`text-[10px] font-mono ${th.muted}`}>
              <span className="text-emerald-500">● Active Session</span> · AIIA PS-26047 · SehatMitra-AI
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Role badge */}
          <div className={`hidden sm:flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold ${
            activeRole === 'doctor'
              ? dark ? 'border-blue-600/60 bg-blue-900/30 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'
              : activeRole === 'nurse'
              ? dark ? 'border-teal-600/60 bg-teal-900/30 text-teal-300' : 'border-teal-200 bg-teal-50 text-teal-700'
              : dark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}>
            {ROLE_CONFIGS.find(r => r.id === activeRole)?.badge ?? ''}
          </div>
          {/* Citizen AI Home */}
          <Link to="/"
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all ${
              dark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}>
            <Home className="w-3.5 h-3.5 text-emerald-600" /> Citizen AI Home
          </Link>
          {/* Theme toggle */}
          <button onClick={() => setDark(v => !v)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              dark ? 'border-slate-600 bg-slate-800 text-amber-400 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* Lock & Logout */}
          <button onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 hover:border-red-400 transition-colors dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
            <Lock className="w-3.5 h-3.5" />🔒 Lock &amp; Logout
          </button>
        </div>
      </header>

      {/* ── 3-Tab Switcher Bar ─────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b px-4 ${th.tabBar}`}>
        <nav className="flex gap-0">
          {TABS.map(tab => {
            // Show lock on any tab not owned by the current authenticated role
            const isOwned = TAB_OWNER[tab.id] === activeRole;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={!isOwned ? GATE_META[tab.id].title : undefined}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-bold transition-all ${
                  activeTab === tab.id ? tab.active : tab.inactive
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label.split(' (')[0]}</span>
                <span className={`hidden md:inline text-xs font-medium ${activeTab === tab.id ? '' : th.subtext}`}>
                  ({tab.label.split(' (')[1]?.replace(')', '') ?? ''})
                </span>
                {!isOwned && <Lock className="w-3.5 h-3.5 ml-0.5 opacity-50" />}
              </button>
            );
          })}

          {/* Live stats — nurse/doctor only */}
          {activeTab !== 'patient' && (
            <div className="ml-auto flex items-center gap-3 pr-1">
              <button onClick={() => setAutoRefresh(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  autoRefresh ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : dark ? 'border-slate-600 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                }`}>
                <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Paused'}</span>
              </button>
              <button onClick={fetchQueue} disabled={queueLoading}
                className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${dark ? 'border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── TAB 1: Patient Desk (CharakKiosk) ─────────────────────────── */}
        {activeTab === 'patient' && (
          <CharakKiosk />
        )}

        {/* ── TAB 2 & 3: Nurse / Doctor Desks ──────────────────────────── */}
        {(activeTab === 'nurse' || activeTab === 'doctor') && (
          <div className="p-5">

            {/* Telemetry strip */}
            <div className={`flex items-stretch divide-x rounded-xl border mb-5 overflow-x-auto ${dark ? 'border-slate-700 divide-slate-700 bg-slate-900' : 'border-slate-200 divide-slate-200 bg-white shadow-sm'}`}>
              {[
                { icon: <Users className="w-3.5 h-3.5 text-emerald-500" />, label: 'Triaged',     val: triagedToday,           valCls: th.txt      },
                { icon: <span className="w-2 h-2 rounded-full bg-amber-400" />, label: 'Waiting', val: triagePending.length + emergencyQueue.length, valCls: 'text-amber-400' },
                { icon: <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />, label: 'Consulting', val: inConsult.length, valCls: 'text-emerald-400' },
                { icon: <Zap className="w-3.5 h-3.5 text-red-500" />,          label: 'Emergency', val: emergencyQueue.length,  valCls: 'text-red-400'  },
                { icon: <Timer className="w-3.5 h-3.5 text-blue-400" />,       label: 'Avg Intake',val: '1m 45s',               valCls: dark ? 'text-blue-300' : 'text-blue-700' },
                { icon: <TrendingUp className="w-3.5 h-3.5 text-purple-400" />,label: 'Saved',    val: `${hoursSaved} hrs`,    valCls: dark ? 'text-purple-300' : 'text-purple-700' },
                ...(lastUpdated ? [{ icon: <Clock className="w-3 h-3 text-slate-400" />, label: 'Updated', val: lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), valCls: th.subtext }] : []),
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center justify-center px-4 py-2.5 min-w-[90px]">
                  <div className="flex items-center gap-1.5 mb-0.5">{s.icon}<span className={`text-[10px] font-bold uppercase tracking-wide ${th.muted}`}>{s.label}</span></div>
                  <span className={`text-base font-black tabular-nums ${s.valCls}`}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Emergency banner */}
            {emergencyQueue.length > 0 && (
              <div className="p-4 rounded-xl bg-red-600/20 border-2 border-red-500 flex items-center gap-3 animate-pulse mb-5">
                <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-red-500 font-extrabold text-sm">
                    {emergencyQueue.length} EMERGENCY TOKEN{emergencyQueue.length > 1 ? 'S' : ''} — Immediate Attention Required
                  </p>
                  <p className="text-red-400 text-xs mt-0.5">{emergencyQueue.map(e => e.token_id).join(' · ')}</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {queue.filter(e => e.status !== 'COMPLETED' && e.status !== 'CANCELLED').length === 0 && !queueLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${th.emptyBg}`}>
                  <Activity className={`w-8 h-8 ${th.subtext}`} />
                </div>
                <p className={`font-semibold ${th.muted}`}>No active patients in queue</p>
                <p className={`text-sm ${th.subtext}`}>Queue auto-refreshes every 3 seconds · Use Patient Desk tab to register new patients</p>
              </div>
            )}

            <div className="max-w-3xl mx-auto w-full space-y-6">

              {/* ─── NURSE DESK ─────────────────────────────────────────── */}
              {activeTab === 'nurse' && (
                <>
                  {(emergencyQueue.length > 0 || triagePending.length > 0) && (
                    <div>
                      <h2 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />Pending Nurse Triage ({emergencyQueue.length + triagePending.length})
                      </h2>
                      <div className="space-y-2">
                        {[...emergencyQueue, ...triagePending].map(entry => (
                          <TokenCard key={entry.token_id} entry={entry} dark={dark}
                            actionLabel="Verify Vitals & Triage" actionClass="bg-teal-700 hover:bg-teal-600 text-white"
                            actionIcon={<Activity className="w-3.5 h-3.5" />}
                            canAct={true} onAction={() => setNurseEntry(entry)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(readyForDoctor.length > 0 || inConsult.length > 0) && (
                    <div>
                      <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${th.muted}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Forwarded to Doctor ({readyForDoctor.length + inConsult.length})
                      </h2>
                      <div className="space-y-2">
                        {[...readyForDoctor, ...inConsult].map(entry => (
                          <TokenCard key={entry.token_id} entry={entry} dark={dark}
                            actionLabel="" actionClass="" actionIcon={null} canAct={false} onAction={() => {}} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── DOCTOR DESK ────────────────────────────────────────── */}
              {activeTab === 'doctor' && (
                <>
                  {readyForDoctor.length > 0 && (
                    <div>
                      <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />Ready for Consultation ({readyForDoctor.length})
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-900/40 border border-emerald-700/50 font-bold normal-case text-emerald-400">Vitals Verified</span>
                      </h2>
                      <div className="space-y-2">
                        {readyForDoctor.map(entry => (
                          <TokenCard key={entry.token_id} entry={entry} dark={dark}
                            actionLabel="Attend Patient" actionClass="bg-blue-700 hover:bg-blue-600 text-white"
                            actionIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            canAct={true} onAction={() => setSelectedToken(entry.token_id)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {inConsult.length > 0 && (
                    <div>
                      <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Stethoscope className="w-3.5 h-3.5" />In Consultation ({inConsult.length})
                      </h2>
                      <div className="space-y-2">
                        {inConsult.map(entry => (
                          <TokenCard key={entry.token_id} entry={entry} dark={dark}
                            actionLabel="Attend Patient" actionClass="bg-blue-700 hover:bg-blue-600 text-white"
                            actionIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            canAct={true} onAction={() => setSelectedToken(entry.token_id)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {(emergencyQueue.length > 0 || triagePending.length > 0) && (
                    <div>
                      <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${th.muted}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />At Nurse Triage Desk ({emergencyQueue.length + triagePending.length})
                      </h2>
                      <div className="space-y-2">
                        {[...emergencyQueue, ...triagePending].map(entry => (
                          <TokenCard key={entry.token_id} entry={entry} dark={dark}
                            actionLabel="Attend Patient" actionClass="bg-blue-700 hover:bg-blue-600 text-white"
                            actionIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            canAct={true} onAction={() => setSelectedToken(entry.token_id)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🔊 Call Patient panel */}
                  {readyForDoctor.length > 0 && (
                    <div className={`rounded-xl border p-4 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-slate-400' : 'text-blue-700'}`}>
                        🔊 Call Patient to Cabin
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {readyForDoctor.map(entry => (
                          <button key={entry.token_id}
                            onClick={() => alert(`📢 Calling ${entry.token_id} — ${entry.patient_name} to Cabin 1 (Dr. Sharma)`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                            🔊 Call {entry.token_id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Nurse Triage Modal ─────────────────────────────────────────────── */}
      {nurseEntry && activeTab === 'nurse' && (
        <NurseTriageModal
          entry={nurseEntry}
          onClose={() => setNurseEntry(null)}
          onVerified={handleNurseVerified}
          dark={dark}
        />
      )}

      {/* ── Tab Passcode Gate Modal ────────────────────────────────────────── */}
      {gateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setGateModal(null); setGatePin(''); setGateError(''); } }}>
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Modal header */}
            <div className={`px-5 py-4 flex items-center justify-between border-b ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className={`font-extrabold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{gateModal.title}</p>
                  <p className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {GATE_META[gateModal.targetTab].description}
                  </p>
                </div>
              </div>
              <button onClick={() => { setGateModal(null); setGatePin(''); setGateError(''); }}
                className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PIN input */}
            <div className="p-5 space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Lock className="inline w-3 h-3 mr-1" />
                  {gateModal.requiredRole === 'doctor' ? 'Doctor' : 'Nurse'} Authorization PIN
                </label>
                <div className="relative">
                  <input
                    type={gateShowPin ? 'text' : 'password'}
                    maxLength={8}
                    value={gatePin}
                    onChange={e => { setGatePin(e.target.value); setGateError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleGateSubmit()}
                    placeholder="Enter PIN"
                    autoFocus
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-lg font-mono text-center tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      dark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button type="button" onClick={() => setGateShowPin(v => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                    {gateShowPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {gateError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3 h-3 shrink-0" />{gateError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setGateModal(null); setGatePin(''); setGateError(''); }}
                  className={`flex-none px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    dark ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}>Cancel</button>
                <button onClick={handleGateSubmit} disabled={!gatePin}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors">
                  <Shield className="w-4 h-4" />Authorize Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalHubPage;
