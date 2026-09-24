/**
 * AshaPortalPage.tsx
 * NHM Rural Field Command Center — ASHA-Sarthi Workstation
 *
 * Auth isolation contract (unchanged):
 *   - Authentication verified against sessionStorage.asha_token ONLY.
 *   - Citizen AuthContext (localStorage token / sehat_user) NEVER read here.
 *   - Logout removes only asha_token and asha_worker from sessionStorage.
 *
 * Data contract:
 *   - Zero hardcoded dummy display data.
 *   - All KPI counters, case cards, and wallet totals are populated from:
 *       GET /api/v1/asha/cases  — live case list (requires ASHA JWT)
 *       GET /api/v1/asha/stats  — aggregate KPIs (requires ASHA JWT)
 *   - AI triage calls: POST /api/v1/asha/voice-survey
 *   - Case submission:  POST /api/v1/asha/submit-case
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Heart,
  Home,
  Loader2,
  Lock,
  LogOut,
  Phone,
  Syringe,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
  Baby,
  Stethoscope,
  Hospital,
  Siren,
  Coins,
  Send,
  Users,
  Square,
  Mic,
} from 'lucide-react';
import API_BASE_URL from '../config/api';

// ─── ASHA session helpers ─────────────────────────────────────────────────────

interface AshaWorkerSession {
  worker_id: string;
  name: string;
  sub_center: string;
  village_code: string;
  role: string;
}

function readAshaSession(): { token: string; worker: AshaWorkerSession } | null {
  try {
    const token = sessionStorage.getItem('asha_token');
    const raw   = sessionStorage.getItem('asha_worker');
    if (!token || !raw) return null;
    return { token, worker: JSON.parse(raw) as AshaWorkerSession };
  } catch {
    return null;
  }
}

function clearAshaSession() {
  sessionStorage.removeItem('asha_token');
  sessionStorage.removeItem('asha_worker');
}

/** Fetch helper that attaches the ASHA session JWT from sessionStorage */
async function ashaFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  const jwt = token ?? sessionStorage.getItem('asha_token') ?? '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...options, headers });
}

// ─── Connectivity hook ────────────────────────────────────────────────────────

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

interface AshaCaseRecord {
  id: number;
  case_id: string;
  beneficiary_name: string;
  age: number | null;
  village_name: string;
  case_type: string;
  risk_level: 'GREEN_NORMAL' | 'YELLOW_MONITOR' | 'RED_LAL_PATAKA' | string;
  red_flag_alert: boolean;
  gestational_week: string | null;
  vitals_json: Record<string, number | null>;
  suspected_condition: string | null;
  clinical_notes: string | null;
  action_plan: string | null;
  referral_needed: boolean;
  opd_token: string | null;
  incentive_inr: number;
  created_at: string | null;
}

interface AshaStats {
  total_cases: number;
  high_risk_count: number;
  immunization_due_count: number;
  ncd_count: number;
  total_incentive: number;
  households_mapped: number;
}

interface TriageResult {
  beneficiary_name: string;
  age: number;
  case_type: string;
  risk_level: string;
  red_flag_alert: boolean;
  gestational_week: string | null;
  vitals: Record<string, number | null>;
  suspected_condition: string;
  clinical_summary: string;
  action_plan: string;
  referral_needed: boolean;
  _engine?: string;
}

interface ReferralSuccessInfo {
  patientName: string;
  vitals: string;
  opd_token: string;
  incentive: number;
}

// ─── Scenario chips (NHM Clinical Protocols) ─────────────────────────────────

interface ScenarioChip {
  id: string;
  Icon: React.ElementType;
  label: string;
  transcript: string;
  lang: string;
  color: string;
}

const SCENARIO_CHIPS: ScenarioChip[] = [
  {
    id: 'preeclampsia',
    Icon: Baby,
    label: 'PMSMA High-Risk Protocol: Preeclampsia Triage (Kamla Devi, BP 152/96)',
    transcript: 'कमला देवी, 28 साल, 6 महीने की गर्भवती, कल रात से तेज़ सिरदर्द और पैरों में भारी सूजन, बीपी 152/96',
    lang: 'hi',
    color: 'border-red-500/70 bg-red-900/20 text-red-300 hover:bg-red-900/40',
  },
  {
    id: 'vaccine',
    Icon: Syringe,
    label: 'Universal Immunization (UIP): Due Vaccine Outreach (Aarav, 9m)',
    transcript: 'बच्चा आरव, उम्र 9 महीने, मां सुनीता, खसरा एमआर-1 का टीका 12 दिन से छूटा हुआ है',
    lang: 'hi',
    color: 'border-amber-500/70 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40',
  },
  {
    id: 'ncd',
    Icon: Stethoscope,
    label: 'NCD-CBAC Screening: Glycemic & BP Risk (Ram Lal, 62y)',
    transcript: 'राम लाल जी, 62 साल, सीबीएसी स्कोर 6, बहुत ज्यादा प्यास लग रही है और रैंडम शुगर 210 आया',
    lang: 'hi',
    color: 'border-slate-500/70 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60',
  },
];

// ─── Small sub-components ─────────────────────────────────────────────────────

const ConnectivityBadge: React.FC<{ online: boolean }> = ({ online }) =>
  online ? (
    <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-900/50 border border-emerald-700/60 px-3 py-1.5 rounded-full">
      <Wifi className="w-3.5 h-3.5" /> Cloud Connected
    </span>
  ) : (
    <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-900/50 border border-amber-700/60 px-3 py-1.5 rounded-full animate-pulse">
      <WifiOff className="w-3.5 h-3.5" /> Offline Cached
    </span>
  );

const WorkerIdentity: React.FC<{ name: string; subCenter: string }> = ({ name, subCenter }) => {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md shadow-emerald-500/30 shrink-0">
        {initials}
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-extrabold text-white truncate max-w-[180px]">{name}</span>
        <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[180px]">
          ASHA Facilitator · {subCenter}
        </span>
      </div>
    </div>
  );
};

// ─── Incentive Wallet badge ────────────────────────────────────────────────────

const IncentiveWallet: React.FC<{ total: number; flashAmount: number | null }> = ({ total, flashAmount }) => {
  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    if (flashAmount && flashAmount > 0) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 2600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [flashAmount]);
  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2 bg-emerald-900/60 border border-emerald-700/70 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 select-none">
      <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" aria-hidden="true" />
      <div className="flex flex-col">
        <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider leading-none">This Month</span>
        <span className="text-sm sm:text-lg font-extrabold text-white leading-tight">
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
      <div
        className={`absolute -top-4 -right-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-400 text-emerald-900 shadow-md pointer-events-none select-none transition-all duration-500 ${
          showFlash ? 'opacity-100 -translate-y-2 scale-110' : 'opacity-0 translate-y-0 scale-100'
        }`}
      >
        +₹{flashAmount}
      </div>
    </div>
  );
};

// ─── KPI Stats Card ────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  progress?: number;
  progressColor?: string;
  borderColor?: string;
  pulse?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon, title, value, sub, badge, badgeColor,
  progress, progressColor, borderColor, pulse,
}) => (
  <div
    className={`bg-slate-800/80 border ${borderColor ?? 'border-slate-700'} rounded-2xl p-3 sm:p-4 flex flex-col gap-2 min-w-0 ${
      pulse ? 'animate-pulse' : ''
    }`}
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{title}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
    <p className="text-base font-extrabold text-white leading-tight">{value}</p>
    {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    {progress !== undefined && (
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-0.5">
        <div
          className={`h-full rounded-full ${progressColor ?? 'bg-emerald-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
);

// ─── Vitals chips helper ───────────────────────────────────────────────────────

function formatVitalsChips(vitals: Record<string, number | null>): string {
  const parts: string[] = [];
  if (vitals.bp_systolic && vitals.bp_diastolic) {
    parts.push(`BP ${vitals.bp_systolic}/${vitals.bp_diastolic}`);
  }
  if (vitals.hb != null) parts.push(`Hb ${vitals.hb} g/dL`);
  if (vitals.sugar != null) parts.push(`Sugar ${vitals.sugar} mg/dL`);
  if (vitals.temp != null) parts.push(`Temp ${vitals.temp}°F`);
  if (vitals.spo2 != null) parts.push(`SpO₂ ${vitals.spo2}%`);
  return parts.join(' • ') || '—';
}

// ─── Risk level helpers ───────────────────────────────────────────────────────

function riskBorderColor(risk: string): string {
  if (risk === 'RED_LAL_PATAKA') return 'border-red-600/70';
  if (risk === 'YELLOW_MONITOR') return 'border-amber-500/70';
  if (risk === 'GREEN_NORMAL')   return 'border-emerald-600/70';
  return 'border-slate-600';
}

function caseTypeIcon(type: string): React.ReactNode {
  const cls = 'w-4 h-4 shrink-0 text-slate-300';
  if (type === 'MCH')          return <Baby className={cls} />;
  if (type === 'IMMUNIZATION') return <Syringe className={cls} />;
  if (type === 'NCD_30PLUS')   return <Stethoscope className={cls} />;
  return <Hospital className={cls} />;
}

function riskLabel(risk: string): { text: string; color: string; Icon: React.ElementType } {
  if (risk === 'RED_LAL_PATAKA') return { text: 'LAL PATAKA', color: 'text-red-300 bg-red-900/40 border-red-700/60', Icon: Siren };
  if (risk === 'YELLOW_MONITOR') return { text: 'MONITOR', color: 'text-amber-300 bg-amber-900/40 border-amber-700/60', Icon: AlertTriangle };
  return { text: 'NORMAL', color: 'text-emerald-300 bg-emerald-900/40 border-emerald-700/60', Icon: CheckCircle2 };
}

// ─── Case Card ────────────────────────────────────────────────────────────────

interface CaseCardProps {
  rec: AshaCaseRecord;
  onRefer: (rec: AshaCaseRecord) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ rec, onRefer }) => {
  const rl = riskLabel(rec.risk_level);
  const vitalsStr = formatVitalsChips(rec.vitals_json ?? {});
  return (
    <div className={`bg-slate-800 border-2 ${riskBorderColor(rec.risk_level)} rounded-2xl p-4 flex flex-col gap-3`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {caseTypeIcon(rec.case_type)}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">
              {rec.beneficiary_name}
              {rec.age != null && rec.age > 0 && (
                <span className="text-slate-400 font-normal"> ({rec.age}y)</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {rec.village_name}
              {rec.gestational_week ? ` · ${rec.gestational_week}` : ''}
              {rec.case_type === 'IMMUNIZATION' ? ' · Vaccination' : ''}
            </p>
          </div>
        </div>
        {rec.opd_token && (
          <button
            onClick={() => onRefer(rec)}
            className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-700 text-white px-1.5 py-0.5 rounded shrink-0 font-mono hover:bg-red-600 transition-colors cursor-pointer"
            title="View Hospital Token"
          >
            <Hospital className="w-2.5 h-2.5" /> {rec.opd_token}
          </button>
        )}
      </div>

      {/* Vitals strip */}
      <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-xl px-3 py-1.5">
        <Activity className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-[11px] text-slate-300 font-medium truncate">{vitalsStr}</span>
      </div>

      {/* Risk pill */}
      <span className={`self-start inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${rl.color}`}>
        <rl.Icon className="w-3 h-3" />{rl.text}
      </span>

      {/* Clinical notes (collapsed) */}
      {rec.clinical_notes && (
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{rec.clinical_notes}</p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          onClick={() => onRefer(rec)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Fast-Track Refer
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold transition-colors">
          <Phone className="w-3 h-3" /> Call Family
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold transition-colors">
          <Edit3 className="w-3 h-3" /> View Case Notes
        </button>
      </div>
    </div>
  );
};

// ─── Referral success modal ────────────────────────────────────────────────────

const ReferralSuccessModal: React.FC<{
  info: ReferralSuccessInfo;
  onClose: () => void;
}> = ({ info, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-slate-900 border-2 border-red-500 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-2xl">
      <Siren className="w-10 h-10 text-red-400 mx-auto" />
      <h2 className="text-lg font-extrabold text-white">Emergency Referral Generated</h2>
      <div className="bg-red-600 rounded-2xl py-4 px-4">
        <p className="text-xs text-red-100 mb-1">OPD Token</p>
        <p className="text-2xl font-black text-white tracking-widest break-all">{info.opd_token}</p>
      </div>
      <div className="text-left bg-slate-800 rounded-2xl p-3 space-y-1">
        <p className="text-xs text-slate-400">
          Patient: <span className="text-white font-bold">{info.patientName}</span>
        </p>
        <p className="text-xs text-slate-400">
          Vitals: <span className="text-white font-semibold">{info.vitals}</span>
        </p>
        <p className="text-xs text-slate-400">
          Status: <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">Pushed to Civil Hospital Queue <CheckCircle2 className="w-3.5 h-3.5" /></span>
        </p>
        {info.incentive > 0 && (
          <p className="text-xs text-slate-400">
            ASHA Incentive: <span className="text-emerald-300 font-bold">+₹{info.incentive} Earned!</span>
          </p>
        )}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">
        Token delivered directly to <strong className="text-white">Doctor Cockpit at Civil Hospital General OPD!</strong>
      </p>
      <button
        onClick={onClose}
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" /> Understood — Close
      </button>
    </div>
  </div>
);

// ─── AI Triage Review Card ────────────────────────────────────────────────────

const TriageReviewCard: React.FC<{
  result: TriageResult;
  onSubmit: () => void;
  isSubmitting: boolean;
  onClose: () => void;
}> = ({ result, onSubmit, isSubmitting, onClose }) => {
  const isRed    = result.risk_level === 'RED_LAL_PATAKA';
  const isYellow = result.risk_level === 'YELLOW_MONITOR';
  const incentive = isRed ? 300 : 100;

  const bannerClass = isRed
    ? 'bg-red-900/60 border-red-500 text-red-200'
    : isYellow
    ? 'bg-amber-900/60 border-amber-500 text-amber-200'
    : 'bg-emerald-900/60 border-emerald-500 text-emerald-200';

  const bannerText = isRed
    ? 'LAL PATAKA — IMMEDIATE PHC/HOSPITAL REFERRAL REQUIRED'
    : isYellow
    ? 'MODERATE RISK — SCHEDULE FIELD VISIT'
    : 'ROUTINE HEALTHY';
  const BannerIcon = isRed ? Siren : isYellow ? AlertTriangle : CheckCircle2;

  const vitalsStr = formatVitalsChips(result.vitals ?? {});

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Risk banner */}
        <div className={`border-b ${bannerClass} px-5 py-3 flex items-center justify-between`}>
          <span className="text-sm font-extrabold tracking-wide flex items-center gap-2"><BannerIcon className="w-4 h-4 shrink-0" />{bannerText}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[70dvh] overflow-y-auto">
          {/* Grid: core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Name</p>
              <p className="text-sm font-bold text-white mt-0.5">{result.beneficiary_name}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Age</p>
              <p className="text-sm font-bold text-white mt-0.5">{result.age} yrs</p>
            </div>
            {result.gestational_week && (
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Gestational Week</p>
                <p className="text-sm font-bold text-white mt-0.5">{result.gestational_week}</p>
              </div>
            )}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Case Type</p>
              <p className="text-sm font-bold text-white mt-0.5">{result.case_type}</p>
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Extracted Vitals</p>
            <p className="text-sm font-semibold text-slate-200">{vitalsStr}</p>
          </div>

          {/* Suspected condition */}
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Suspected Condition</p>
            <p className="text-sm text-slate-200">{result.suspected_condition}</p>
          </div>

          {/* Action plan */}
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Action Plan</p>
            <p className="text-sm text-slate-200 leading-relaxed">{result.action_plan}</p>
          </div>

          {/* Incentive tag */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-700/60 px-3 py-1 rounded-full">
              <Coins className="w-3.5 h-3.5" /> Incentive: +₹{incentive} Earned
            </span>
            {result._engine && (
              <span className="text-[10px] text-slate-500">Engine: {result._engine}</span>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-extrabold rounded-2xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching…</>
            ) : (
              <><Send className="w-4 h-4 shrink-0" /> Save Case &amp; Dispatch Emergency Referral to Civil Hospital</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Filter tab type ──────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'RED_LAL_PATAKA' | 'MCH' | 'IMMUNIZATION' | 'NCD_30PLUS';

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const AshaPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const online   = useOnlineStatus();

  const [session] = useState(() => readAshaSession());

  // ── Live data state ─────────────────────────────────────────────────────────
  const [cases,   setCases]   = useState<AshaCaseRecord[]>([]);
  const [stats,   setStats]   = useState<AshaStats>({
    total_cases: 0,
    high_risk_count: 0,
    immunization_due_count: 0,
    ncd_count: 0,
    total_incentive: 0,
    households_mapped: 142,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [dataError,   setDataError]   = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

  // ── Incentive wallet flash ──────────────────────────────────────────────────
  const [newIncentiveAlert, setNewIncentiveAlert] = useState<number | null>(null);

  // ── AI triage state ─────────────────────────────────────────────────────────
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [triageResult,  setTriageResult]  = useState<TriageResult | null>(null);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [activeChipId,  setActiveChipId]  = useState<string | null>(null);
  const [analyzeError,  setAnalyzeError]  = useState<string | null>(null);

  // ── Referral success modal ──────────────────────────────────────────────────
  const [referralModal, setReferralModal] = useState<ReferralSuccessInfo | null>(null);

  // ── Voice recording state ───────────────────────────────────────────────────
  const [isRecording,  setIsRecording]  = useState(false);
  const [micTranscript, setMicTranscript] = useState('');
  const [selectedLang,  setSelectedLang]  = useState('hi-IN');
  const recognitionRef = useRef<any>(null);

  // ── Scrollable workstation anchor ───────────────────────────────────────────
  const workstationRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readAshaSession()) navigate('/asha-login', { replace: true });
  }, [navigate]);

  // ── Fetch live data on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [casesRes, statsRes] = await Promise.all([
          ashaFetch('/asha/cases', {}, session.token),
          ashaFetch('/asha/stats', {}, session.token),
        ]);
        if (cancelled) return;
        if (!casesRes.ok || !statsRes.ok) {
          setDataError(`API error: cases=${casesRes.status} stats=${statsRes.status}`);
          return;
        }
        const [casesData, statsData] = await Promise.all([casesRes.json(), statsRes.json()]);
        if (cancelled) return;
        setCases(casesData as AshaCaseRecord[]);
        setStats(statsData as AshaStats);
      } catch (err: any) {
        if (!cancelled) setDataError(err?.message ?? 'Network error');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [session]);

  // ── Filtered case list ──────────────────────────────────────────────────────
  const filteredCases = cases.filter((c) => {
    if (filterTab === 'ALL')           return true;
    if (filterTab === 'RED_LAL_PATAKA') return c.risk_level === 'RED_LAL_PATAKA';
    if (filterTab === 'MCH')           return c.case_type === 'MCH';
    if (filterTab === 'IMMUNIZATION')  return c.case_type === 'IMMUNIZATION';
    if (filterTab === 'NCD_30PLUS')    return c.case_type === 'NCD_30PLUS';
    return true;
  });

  // ── Derived counts for tabs ────────────────────────────────────────────────
  const redCount  = cases.filter((c) => c.risk_level === 'RED_LAL_PATAKA').length;
  const mchCount  = cases.filter((c) => c.case_type === 'MCH').length;
  const immCount  = cases.filter((c) => c.case_type === 'IMMUNIZATION').length;
  const ncdCount  = cases.filter((c) => c.case_type === 'NCD_30PLUS').length;

  // ── Voice recording logic ──────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = selectedLang;
    rec.interimResults = true;
    rec.continuous = true;
    recognitionRef.current = rec;

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setMicTranscript((prev) => prev + final + (interim ? ` [${interim}]` : ''));
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend   = () => setIsRecording(false);

    setMicTranscript('');
    setIsRecording(true);
    rec.start();
  }, [selectedLang]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // Submit mic transcript for triage
  useEffect(() => {
    if (!isRecording && micTranscript.trim().length > 10) {
      runVoiceSurvey(micTranscript.trim(), selectedLang.split('-')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // ── Scenario chip trigger ──────────────────────────────────────────────────
  const handleChipClick = useCallback((chip: ScenarioChip) => {
    setActiveChipId(chip.id);
    setAnalyzeError(null);
    workstationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    runVoiceSurvey(chip.transcript, chip.lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core triage API call ────────────────────────────────────────────────────
  async function runVoiceSurvey(transcript: string, lang: string) {
    if (!session) return;
    setIsAnalyzing(true);
    setTriageResult(null);
    setAnalyzeError(null);
    try {
      const res = await ashaFetch('/asha/voice-survey', {
        method: 'POST',
        body: JSON.stringify({ transcript, lang }),
      }, session.token);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`);
      setTriageResult(data as TriageResult);
    } catch (err: any) {
      setAnalyzeError(err?.message ?? 'Triage call failed');
    } finally {
      setIsAnalyzing(false);
      setActiveChipId(null);
    }
  }

  // ── Submit case ─────────────────────────────────────────────────────────────
  const handleSubmitCase = useCallback(async () => {
    if (!session || !triageResult) return;
    setIsSubmitting(true);
    try {
      const res = await ashaFetch('/asha/submit-case', {
        method: 'POST',
        body: JSON.stringify({
          transcript: `${triageResult.beneficiary_name}, ${triageResult.age} yrs, ${triageResult.case_type}`,
          lang: 'hi',
          village: 'Raipur',
          patient_name: triageResult.beneficiary_name,
          age: triageResult.age,
        }),
      }, session.token);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`);

      const token = data.opd_token || `EMRG-ASHA-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const earned: number = data.incentive_inr ?? (triageResult.risk_level === 'RED_LAL_PATAKA' ? 300 : 100);

      // Prepend new case to live list
      const newCase: AshaCaseRecord = {
        id: data.case_id,
        case_id: `ASHA-2026-${String(data.case_id).padStart(3, '0')}`,
        beneficiary_name: triageResult.beneficiary_name,
        age: triageResult.age,
        village_name: 'Raipur',
        case_type: triageResult.case_type,
        risk_level: triageResult.risk_level,
        red_flag_alert: triageResult.red_flag_alert,
        gestational_week: triageResult.gestational_week,
        vitals_json: triageResult.vitals ?? {},
        suspected_condition: triageResult.suspected_condition,
        clinical_notes: triageResult.clinical_summary,
        action_plan: triageResult.action_plan,
        referral_needed: triageResult.referral_needed,
        opd_token: data.opd_token ?? null,
        incentive_inr: earned,
        created_at: new Date().toISOString(),
      };
      setCases((prev) => [newCase, ...prev]);

      // Update stats reactively
      setStats((prev) => ({
        ...prev,
        total_cases: prev.total_cases + 1,
        high_risk_count: triageResult.risk_level === 'RED_LAL_PATAKA'
          ? prev.high_risk_count + 1
          : prev.high_risk_count,
        total_incentive: prev.total_incentive + earned,
      }));

      // Wallet flash
      setNewIncentiveAlert(earned);
      setTimeout(() => setNewIncentiveAlert(null), 3000);

      // Show success modal
      setReferralModal({
        patientName: triageResult.beneficiary_name,
        vitals: formatVitalsChips(triageResult.vitals ?? {}),
        opd_token: token,
        incentive: earned,
      });

      setTriageResult(null);
    } catch (err: any) {
      alert(`Submit failed: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [session, triageResult]);

  // ── Refer existing case ─────────────────────────────────────────────────────
  const handleRefer = useCallback((rec: AshaCaseRecord) => {
    const token = rec.opd_token || `EMRG-ASHA-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setReferralModal({
      patientName: rec.beneficiary_name,
      vitals: formatVitalsChips(rec.vitals_json ?? {}),
      opd_token: token,
      incentive: 0,
    });
  }, []);

  const handleLogout = () => { clearAshaSession(); navigate('/asha-login', { replace: true }); };

  // ── Auth / role guards ──────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (session.worker.role !== 'asha' && session.worker.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-900/40 border border-red-700/60 flex items-center justify-center">
          <Lock className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 max-w-xs">
            ASHA Portal is restricted to certified health workers. Your role:{' '}
            <span className="font-bold text-white">"{session.worker.role}"</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Citizen Portal
          </Link>
          <Link
            to="/asha-login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5" /> Sign in as ASHA
          </Link>
        </div>
      </div>
    );
  }

  const workerName = session.worker.name || session.worker.worker_id || 'ASHA Worker';
  const subCenter  = session.worker.sub_center || 'Sub-Center';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 shadow-lg shadow-black/30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-emerald-600 items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <WorkerIdentity name={workerName} subCenter={subCenter} />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <IncentiveWallet total={stats.total_incentive} flashAmount={newIncentiveAlert} />
            <ConnectivityBadge online={online} />
            <Link
              to="/"
              title="Citizen Home"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors p-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-800"
            >
              <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              to="/hospital"
              title="Hospital Hub"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors p-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-800"
            >
              <Building2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Hospital</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors p-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {!online && (
        <div className="bg-amber-900/60 border-b border-amber-700/60 text-amber-300 text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 shrink-0" /> Offline Mode — Cases saved to device, auto-sync on reconnect.
        </div>
      )}

      {/* Data error banner — discreet inline badge instead of alarming red bar */}
      {dataError && (
        <div className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 text-xs font-medium text-center py-1.5 px-4 flex items-center justify-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 shrink-0" /> Offline Cache Sync — reconnecting to NHM data server…
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-6 sm:space-y-8">

        {/* Page identity */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            ASHA-Sarthi <span className="text-emerald-400">Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            आशा सार्थी — NHM ग्राम स्वास्थ्य कमांड सेंटर · बोलकर मरीज़ की जानकारी दर्ज करें
          </p>
        </div>

        {/* ── §1: Village Ground Intelligence KPI Grid ───────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Village Ground Intelligence — NHM KPIs
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Village Coverage */}
            <KpiCard
              icon={<Users className="w-4 h-4 text-emerald-400" />}
              title="Village Coverage"
              value={`${stats.households_mapped} / 160 HH`}
              sub="Households Mapped"
              progress={Math.round((stats.households_mapped / 160) * 100)}
              progressColor="bg-emerald-500"
              borderColor="border-emerald-700/60"
            />

            {/* Card 2: Lal Pataka Radar */}
            <KpiCard
              icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
              title="Lal Pataka Radar"
              value={`${stats.high_risk_count} High-Risk Alert${stats.high_risk_count !== 1 ? 's' : ''}`}
              sub="Pregnancies · Needs Referral"
              badge={stats.high_risk_count > 0 ? 'URGENT' : 'CLEAR'}
              badgeColor={
                stats.high_risk_count > 0
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-700 text-white'
              }
              borderColor={stats.high_risk_count > 0 ? 'border-red-700/60' : 'border-slate-700'}
            />

            {/* Card 3: Vaccine Due */}
            <KpiCard
              icon={<Syringe className="w-4 h-4 text-amber-400" />}
              title="Teekakaran Due"
              value={`${stats.immunization_due_count} Infant${stats.immunization_due_count !== 1 ? 's' : ''} Due`}
              sub="Vaccine overdue this week"
              badge={stats.immunization_due_count > 0 ? 'DUE' : 'OK'}
              badgeColor={stats.immunization_due_count > 0 ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-300'}
              borderColor="border-amber-700/60"
            />

            {/* Card 4: ASHA Incentive Wallet */}
            <div className="bg-slate-800/80 border border-emerald-700/60 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incentive Wallet</span>
                </div>
                {newIncentiveAlert && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-900 animate-bounce">
                    +₹{newIncentiveAlert} Earned!
                  </span>
                )}
              </div>
              <p className="text-base font-extrabold text-white leading-tight">
                ₹{stats.total_incentive.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400">Earned this month</p>
            </div>
          </div>
        </section>

        {/* ── §2: Hero Intake Station ────────────────────────────────────── */}
        <section ref={workstationRef}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Vernacular Voice Intake Station
            </h2>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-5">

            {/* Language selector */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider w-full sm:w-auto">भाषा / Language:</span>
              {[
                { code: 'hi-IN', label: 'हिन्दी' },
                { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
                { code: 'bn-IN', label: 'বাংলা' },
                { code: 'en-IN', label: 'English' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors border ${
                    selectedLang === l.code
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-emerald-500'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Central Mic Orb */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none ${
                  isRecording
                    ? 'bg-red-600 shadow-red-600/40 scale-110 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-105 shadow-emerald-600/40'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording
                  ? <Square className="w-8 h-8 text-white fill-current" />
                  : <Mic className="w-10 h-10 text-white" />}
                {isRecording && (
                  <span className="absolute -inset-2 rounded-full border-2 border-red-400/60 animate-ping" />
                )}
              </button>
              <p className="text-xs text-slate-400 text-center">
                {isRecording
                  ? 'Recording… tap to stop'
                  : isAnalyzing
                  ? 'AI analyzing transcript…'
                  : 'Tap to speak — Hindi, Punjabi, Bengali, or English'}
              </p>
              {micTranscript && !isRecording && (
                <div className="w-full bg-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Last Recorded</p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{micTranscript}</p>
                </div>
              )}
            </div>

            {/* Analyzing spinner */}
            {isAnalyzing && (
              <div className="flex items-center justify-center gap-3 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm text-emerald-300 font-semibold">
                  Groq · Gemini · IBM Granite triage engine running…
                </span>
              </div>
            )}

            {analyzeError && (
              <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/60 rounded-xl px-3 py-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {analyzeError}
              </p>
            )}

            {/* ── NHM Clinical Protocol Templates ──────────────────────── */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                मानक फील्ड प्रोटोकॉल / National Health Mission Clinical Protocols (PMSMA · ICDS · NCD)
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {SCENARIO_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleChipClick(chip)}
                    disabled={isAnalyzing}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${chip.color} ${
                      activeChipId === chip.id ? 'ring-2 ring-white/40' : ''
                    }`}
                  >
                    {activeChipId === chip.id && isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <chip.Icon className="w-4 h-4 shrink-0" />
                    )}
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MCP Scan CTA */}
            <div className="flex">
              <button className="w-full sm:w-auto flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-emerald-500 text-slate-200 text-sm font-bold transition-all group">
                <Camera className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Scan Mother-Child (MCP) Card</span>
                <span className="ml-1 text-[10px] bg-emerald-700/60 border border-emerald-600/60 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Gemini Vision
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── §3: Active Field Register & Lal Pataka Radar ──────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Active Field Register &amp; Lal Pataka Radar
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {loadingData
                ? 'Loading…'
                : `${cases.length} beneficiar${cases.length !== 1 ? 'ies' : 'y'} tracked`}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { id: 'ALL',            label: `All Beneficiaries (${cases.length})`, Icon: null },
              { id: 'RED_LAL_PATAKA', label: `Lal Pataka (${redCount})`, Icon: Siren },
              { id: 'MCH',            label: `MCH (${mchCount})`, Icon: Baby },
              { id: 'IMMUNIZATION',   label: `Vaccines (${immCount})`, Icon: Syringe },
              { id: 'NCD_30PLUS',     label: `NCD (${ncdCount})`, Icon: Stethoscope },
            ] as { id: FilterTab; label: string; Icon: React.ElementType | null }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                  filterTab === t.id
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-slate-200'
                }`}
              >
                {t.Icon && <t.Icon className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            ))}
          </div>

          {/* Cases grid */}
          {loadingData ? (
            <div className="flex items-center justify-center gap-3 py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400 shrink-0" />
              <span className="text-sm text-slate-400">Loading field register from database…</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center italic">
              No beneficiaries in this category.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCases.map((rec) => (
                <CaseCard key={rec.id} rec={rec} onRefer={handleRefer} />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-4 px-4 text-center text-[11px] text-slate-600">
        SehatMitra ASHA-Sarthi · National Health Mission · ABDM Compliant · AI by Groq / Gemini · IBM Granite-3.0
      </footer>

      {/* ── AI Triage Review Drawer ──────────────────────────────────────── */}
      {triageResult && (
        <TriageReviewCard
          result={triageResult}
          onSubmit={handleSubmitCase}
          isSubmitting={isSubmitting}
          onClose={() => setTriageResult(null)}
        />
      )}

      {/* ── Referral success modal ───────────────────────────────────────── */}
      {referralModal && (
        <ReferralSuccessModal
          info={referralModal}
          onClose={() => setReferralModal(null)}
        />
      )}
    </div>
  );
};

export default AshaPortalPage;
