/**
 * AshaVoiceWorkstation.tsx
 * Zero-typing, voice-first ASHA field-worker clinical workstation.
 *
 * Flow:
 *   1. Tap microphone orb → Web Speech API starts recording in chosen language
 *   2. Transcript auto-posted to POST /api/v1/asha/voice-survey (Groq→Gemini→heuristic)
 *   3. Structured result shown in risk-coded review card
 *   4. ASHA taps "Submit Case" → POST /api/v1/asha/submit-case
 *   5. RED_LAL_PATAKA → OPD emergency token shown in modal
 *   6. Incentive wallet balance incremented with +₹ bounce badge
 *   7. Case saved in field register; offline fallback to localStorage
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { authFetch } from '../../context/AuthContext';

// ─── Type declarations for Web Speech API (not in standard lib) ───────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Domain types ─────────────────────────────────────────────────────────────

interface Vitals {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  hb: number | null;
  sugar: number | null;
}

interface TriageResult {
  beneficiary_name: string;
  age: number;
  case_type: 'MCH' | 'NCD_30PLUS' | 'IMMUNIZATION' | 'GENERAL';
  risk_level: 'GREEN_NORMAL' | 'YELLOW_MONITOR' | 'RED_LAL_PATAKA';
  red_flag_alert: boolean;
  gestational_week: string | null;
  vitals: Vitals;
  suspected_condition: string;
  clinical_summary: string;
  action_plan: string;
  referral_needed: boolean;
  _engine?: string;
}

interface SubmitResult {
  case_id: number;
  risk_level: string;
  red_flag_alert: boolean;
  referral_needed: boolean;
  opd_token: string | null;
  incentive_inr: number;
  clinical_summary: string;
  action_plan: string;
}

interface LocalCase extends SubmitResult {
  patient_name: string;
  village: string;
  case_type: string;
  transcript: string;
  created_at: string;
  pending_sync?: boolean;
}

// ─── Language options ──────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { code: 'hi-IN', label: 'हिन्दी', short: 'HI' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ', short: 'PA' },
  { code: 'bn-IN', label: 'বাংলা', short: 'BN' },
  { code: 'en-IN', label: 'English', short: 'EN' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PENDING_KEY = 'pending_asha_cases';

function loadLocalCases(): LocalCase[] {
  try {
    return JSON.parse(localStorage.getItem('asha_case_register') || '[]');
  } catch {
    return [];
  }
}

function saveLocalCases(cases: LocalCase[]) {
  localStorage.setItem('asha_case_register', JSON.stringify(cases));
}

function loadPendingCases(): LocalCase[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingCase(c: LocalCase) {
  const existing = loadPendingCases();
  localStorage.setItem(PENDING_KEY, JSON.stringify([...existing, c]));
}

function riskColor(level: string) {
  if (level === 'RED_LAL_PATAKA') return 'red';
  if (level === 'YELLOW_MONITOR') return 'yellow';
  return 'green';
}

function incentiveForRisk(level: string): number {
  return level === 'RED_LAL_PATAKA' ? 300 : 100;
}

function caseTypeLabel(ct: string) {
  const map: Record<string, string> = {
    MCH: '🤰 Maternal & Child',
    NCD_30PLUS: '💊 NCD / Chronic',
    IMMUNIZATION: '💉 Vaccine Due',
    GENERAL: '🩺 General',
  };
  return map[ct] ?? ct;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated waveform shown while microphone is active */
const WaveformBars: React.FC = () => (
  <div className="flex items-end gap-0.5 h-6">
    {[3, 5, 7, 4, 8, 5, 3, 6, 4, 7].map((h, i) => (
      <div
        key={i}
        className="w-1 bg-white rounded-full opacity-90"
        style={{
          height: `${h * 3}px`,
          animation: `wave ${0.5 + i * 0.07}s ease-in-out infinite alternate`,
        }}
      />
    ))}
    <style>{`
      @keyframes wave {
        from { transform: scaleY(0.4); }
        to   { transform: scaleY(1); }
      }
    `}</style>
  </div>
);

/** Risk banner – pulsing red / amber / green */
const RiskBanner: React.FC<{ level: string }> = ({ level }) => {
  const color = riskColor(level);
  const cfg = {
    red: {
      bg: 'bg-red-600',
      ring: 'ring-red-400',
      text: 'text-white',
      label: '⚠️ LAL PATAKA — HIGH-RISK DETECTED',
      sub: 'Immediate referral required. Generate OPD token.',
      pulse: true,
    },
    yellow: {
      bg: 'bg-amber-500',
      ring: 'ring-amber-300',
      text: 'text-white',
      label: '🟡 Moderate Risk — Close Follow-up Required',
      sub: 'Visit PHC within 48 hours. Monitor vitals.',
      pulse: false,
    },
    green: {
      bg: 'bg-emerald-600',
      ring: 'ring-emerald-400',
      text: 'text-white',
      label: '🟢 Routine Healthy Profile',
      sub: 'Continue regular screenings. No immediate action needed.',
      pulse: false,
    },
  }[color] as any;

  return (
    <div
      className={`${cfg.bg} ${cfg.ring} ${cfg.text} rounded-2xl p-4 ring-2 flex flex-col gap-1 ${cfg.pulse ? 'animate-pulse' : ''}`}
    >
      <span className="font-extrabold text-base tracking-tight">{cfg.label}</span>
      <span className="text-sm opacity-90">{cfg.sub}</span>
    </div>
  );
};

/** Vital chip */
const VitalChip: React.FC<{ label: string; value: string | null; unit: string }> = ({
  label,
  value,
  unit,
}) => {
  if (value === null || value === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-700 text-white text-xs font-semibold">
      <span className="opacity-70">{label}</span>
      <span>{value} {unit}</span>
    </span>
  );
};

/** Incentive bounce badge */
const IncentiveBadge: React.FC<{ amount: number; show: boolean }> = ({ amount, show }) => (
  <div
    className={`pointer-events-none select-none absolute -top-5 -right-2 px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-400 text-emerald-900 shadow-md transition-all duration-500 ${
      show ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-0'
    }`}
  >
    +₹{amount}
  </div>
);

/** OPD Token modal */
const OpdTokenModal: React.FC<{ token: string; onClose: () => void }> = ({ token, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
      <div className="text-4xl">🚨</div>
      <h2 className="text-xl font-extrabold text-white">Emergency OPD Token</h2>
      <div className="bg-red-600 rounded-2xl py-5 px-4">
        <p className="text-sm text-red-100 mb-1">Token Number</p>
        <p className="text-3xl font-black text-white tracking-widest">{token}</p>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">
        Patient can directly visit the{' '}
        <strong className="text-white">Civil Hospital Doctor Cabin</strong> without
        waiting in general queue.
      </p>
      <button
        onClick={onClose}
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-colors text-sm"
      >
        ✓ Understood — Close
      </button>
    </div>
  </div>
);

/** Case register card */
const CaseCard: React.FC<{ c: LocalCase }> = ({ c }) => {
  const color = riskColor(c.risk_level);
  const badgeClass = {
    red: 'bg-red-600 text-white',
    yellow: 'bg-amber-500 text-white',
    green: 'bg-emerald-600 text-white',
  }[color] as string;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white text-sm">{c.patient_name}</p>
          <p className="text-xs text-slate-400">{c.village} · {new Date(c.created_at).toLocaleDateString('hi-IN')}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
          {c.risk_level.replace('_', ' ')}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
          {caseTypeLabel(c.case_type)}
        </span>
        <span className="text-[11px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
          ₹{c.incentive_inr} earned
        </span>
        {c.pending_sync && (
          <span className="text-[11px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full">
            ⏳ Pending Sync
          </span>
        )}
      </div>

      {c.opd_token && (
        <div className="flex items-center gap-2 bg-red-900/40 border border-red-700/60 rounded-xl px-3 py-2">
          <span className="text-xs font-bold text-red-300">🏥 OPD Token:</span>
          <span className="text-xs font-black text-white tracking-widest">{c.opd_token}</span>
        </div>
      )}
    </div>
  );
};

// ─── Tab filter type ──────────────────────────────────────────────────────────

type FilterTab = 'all' | 'red' | 'mch' | 'vaccine';

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  workerName?: string;
  subCenter?: string;
  onIncentiveEarned: (amount: number) => void;
}

export const AshaVoiceWorkstation: React.FC<Props> = ({
  onIncentiveEarned,
}) => {
  // ── Voice / recording state ────────────────────────────────────────────────
  const [lang, setLang] = useState('hi-IN');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recognitionRef = useRef<any>(null);

  // ── API / triage state ─────────────────────────────────────────────────────
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [triageError, setTriageError] = useState('');

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitLoading, setSubmitLoading] = useState(false);
  const [opdToken, setOpdToken] = useState<string | null>(null);
  const [showOpdModal, setShowOpdModal] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  // ── Incentive badge ────────────────────────────────────────────────────────
  const [showIncentiveBadge, setShowIncentiveBadge] = useState(false);
  const [lastIncentive, setLastIncentive] = useState(0);

  // ── Case register ──────────────────────────────────────────────────────────
  const [cases, setCases] = useState<LocalCase[]>(loadLocalCases);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const filteredCases = useMemo(() => {
    switch (filterTab) {
      case 'red': return cases.filter(c => c.risk_level === 'RED_LAL_PATAKA');
      case 'mch': return cases.filter(c => c.case_type === 'MCH');
      case 'vaccine': return cases.filter(c => c.case_type === 'IMMUNIZATION');
      default: return cases;
    }
  }, [cases, filterTab]);

  // ── Save cases to localStorage whenever they change ────────────────────────
  useEffect(() => {
    saveLocalCases(cases);
  }, [cases]);

  // ── Speech recognition setup ───────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!speechSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      setTranscript((prev) => (prev + final || interim).trim());
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
    setTriageResult(null);
    setTriageError('');
  }, [speechSupported, lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Auto-call triage when recording stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript.length > 10) {
      runTriage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const runTriage = async () => {
    if (!transcript.trim()) return;
    setTriageLoading(true);
    setTriageError('');
    setTriageResult(null);
    try {
      const res = await authFetch('/asha/voice-survey', {
        method: 'POST',
        body: JSON.stringify({ transcript: transcript.trim(), lang: lang.split('-')[0] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TriageResult = await res.json();
      setTriageResult(data);
    } catch (e: any) {
      setTriageError('Network error — could not reach server. Check transcript and retry.');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleSubmitCase = async () => {
    if (!triageResult) return;
    setSubmitLoading(true);
    setOfflineSaved(false);

    const body = {
      transcript: transcript.trim(),
      lang: lang.split('-')[0],
      village: triageResult.beneficiary_name ? 'Field Visit' : 'Unknown Village',
      patient_name: triageResult.beneficiary_name || undefined,
      age: triageResult.age || undefined,
    };

    try {
      const res = await authFetch('/asha/submit-case', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SubmitResult = await res.json();

      // OPD token for red cases
      if (data.opd_token) {
        setOpdToken(data.opd_token);
        setShowOpdModal(true);
      }

      // Incentive animation
      setLastIncentive(data.incentive_inr);
      setShowIncentiveBadge(true);
      onIncentiveEarned(data.incentive_inr);
      setTimeout(() => setShowIncentiveBadge(false), 2800);

      // Persist to register
      const newCase: LocalCase = {
        ...data,
        patient_name: triageResult.beneficiary_name || 'Unknown',
        village: body.village,
        case_type: triageResult.case_type,
        transcript: body.transcript,
        created_at: new Date().toISOString(),
      };
      setCases((prev) => [newCase, ...prev]);

      // Reset voice state for next patient
      setTranscript('');
      setTriageResult(null);
    } catch {
      // Offline fallback — save to pending queue
      const incentive = incentiveForRisk(triageResult.risk_level);
      const pendingCase: LocalCase = {
        case_id: Date.now(),
        risk_level: triageResult.risk_level,
        red_flag_alert: triageResult.red_flag_alert,
        referral_needed: triageResult.referral_needed,
        opd_token: null,
        incentive_inr: incentive,
        clinical_summary: triageResult.clinical_summary,
        action_plan: triageResult.action_plan,
        patient_name: triageResult.beneficiary_name || 'Unknown',
        village: 'Field Visit',
        case_type: triageResult.case_type,
        transcript: transcript.trim(),
        created_at: new Date().toISOString(),
        pending_sync: true,
      };
      savePendingCase(pendingCase);
      setCases((prev) => [pendingCase, ...prev]);
      setOfflineSaved(true);

      setLastIncentive(incentive);
      setShowIncentiveBadge(true);
      onIncentiveEarned(incentive);
      setTimeout(() => setShowIncentiveBadge(false), 2800);

      setTranscript('');
      setTriageResult(null);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReRecord = () => {
    stopListening();
    setTranscript('');
    setTriageResult(null);
    setTriageError('');
    setOfflineSaved(false);
  };

  // ── Derived UI values ──────────────────────────────────────────────────────
  const orbColor = isListening
    ? 'bg-rose-500 shadow-rose-500/60'
    : triageResult
    ? riskColor(triageResult.risk_level) === 'red'
      ? 'bg-red-600 shadow-red-500/50'
      : riskColor(triageResult.risk_level) === 'yellow'
      ? 'bg-amber-500 shadow-amber-400/50'
      : 'bg-emerald-600 shadow-emerald-500/50'
    : 'bg-emerald-600 shadow-emerald-500/60';

  const estimatedIncentive = triageResult
    ? incentiveForRisk(triageResult.risk_level)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Section 1: Language selector ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Language:</span>
        {LANG_OPTIONS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
              lang === l.code
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* ── Section 2: Voice Orb ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 py-4">
        {/* Relative wrapper for the incentive bounce badge */}
        <div className="relative">
          <IncentiveBadge amount={lastIncentive} show={showIncentiveBadge} />

          {/* Outer pulsing rings */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <span className="absolute w-44 h-44 rounded-full bg-rose-500/15 animate-ping" />
                <span className="absolute w-36 h-36 rounded-full bg-rose-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            {!isListening && !triageResult && !triageLoading && (
              <>
                <span className="absolute w-44 h-44 rounded-full bg-emerald-500/10 animate-ping" />
                <span className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDelay: '0.5s' }} />
              </>
            )}

            {/* Core orb button */}
            <button
              onClick={toggleRecording}
              disabled={triageLoading || submitLoading}
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1.5 shadow-2xl ${orbColor} transition-all duration-300 active:scale-95 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop Recording' : 'Start Recording'}
            >
              {isListening ? (
                <>
                  <WaveformBars />
                  <span className="text-[10px] font-bold text-white/80 mt-0.5">रोकें / STOP</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white/90" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 10z" />
                  </svg>
                  <span className="text-[10px] font-bold text-white/80">TAP</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prompt text */}
        <div className="text-center">
          <p className="text-base font-bold text-white">
            {isListening ? 'सुन रहा हूँ… / Listening…' : 'Tap to Record Field Visit'}
          </p>
          <p className="text-sm text-slate-400 mt-0.5">बोलकर मरीज़ की जानकारी दर्ज करें</p>
        </div>

        {/* Speech not supported warning */}
        {!speechSupported && (
          <p className="text-xs text-amber-400 bg-amber-900/40 border border-amber-700/60 px-3 py-2 rounded-xl">
            ⚠ Browser does not support voice input. Please use Chrome on Android.
          </p>
        )}
      </div>

      {/* ── Section 3: Live transcript display ────────────────────────────── */}
      {(transcript || isListening) && (
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isListening ? '● Live Transcript' : 'Captured Transcript'}
            </span>
            {!isListening && transcript && !triageResult && !triageLoading && (
              <button
                onClick={runTriage}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Re-analyze →
              </button>
            )}
          </div>
          <p className="text-sm text-slate-200 leading-relaxed min-h-[2rem]">
            {transcript || <span className="text-slate-500 italic">Listening…</span>}
          </p>
        </div>
      )}

      {/* ── Section 4: AI Triage loading ──────────────────────────────────── */}
      {triageLoading && (
        <div className="flex items-center gap-3 bg-slate-800 border border-emerald-700/60 rounded-2xl p-4">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Analyzing with SehatMitra AI…</p>
            <p className="text-xs text-slate-400">Groq LLM → Gemini → Clinical Parser</p>
          </div>
        </div>
      )}

      {/* ── Section 5: Triage error ────────────────────────────────────────── */}
      {triageError && (
        <div className="bg-red-900/40 border border-red-700/60 rounded-2xl p-4 text-sm text-red-300">
          {triageError}
        </div>
      )}

      {/* ── Section 6: Clinical result review card ────────────────────────── */}
      {triageResult && !triageLoading && (
        <div className="bg-slate-850 border border-slate-700 rounded-3xl overflow-hidden space-y-0">
          {/* Risk banner */}
          <div className="p-4">
            <RiskBanner level={triageResult.risk_level} />
          </div>

          {/* Demographics & vitals grid */}
          <div className="px-4 pb-4 space-y-3">
            {/* Demog row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Beneficiary', value: triageResult.beneficiary_name },
                { label: 'Age', value: triageResult.age ? `${triageResult.age} yr` : null },
                { label: 'Case Type', value: caseTypeLabel(triageResult.case_type) },
                triageResult.gestational_week
                  ? { label: 'Gestation', value: triageResult.gestational_week }
                  : null,
              ]
                .filter(Boolean)
                .map((f: any) => (
                  <div key={f.label} className="bg-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{f.label}</p>
                    <p className="text-sm text-white font-semibold mt-0.5 truncate">{f.value ?? '—'}</p>
                  </div>
                ))}
            </div>

            {/* Vitals chips */}
            {triageResult.vitals && (
              <div className="flex flex-wrap gap-2">
                {triageResult.vitals.bp_systolic != null && triageResult.vitals.bp_diastolic != null && (
                  <VitalChip
                    label="BP"
                    value={`${triageResult.vitals.bp_systolic}/${triageResult.vitals.bp_diastolic}`}
                    unit="mmHg"
                  />
                )}
                <VitalChip label="Hb" value={triageResult.vitals.hb?.toFixed(1) ?? null} unit="g/dL" />
                <VitalChip label="Sugar" value={triageResult.vitals.sugar?.toString() ?? null} unit="mg/dL" />
              </div>
            )}

            {/* Suspected condition */}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Suspected Condition</p>
              <p className="text-sm text-amber-300 font-semibold">{triageResult.suspected_condition}</p>
            </div>

            {/* Action plan */}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Action Plan</p>
              <p className="text-sm text-slate-200 leading-relaxed">{triageResult.action_plan}</p>
            </div>

            {/* Incentive preview */}
            <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/60 rounded-xl px-4 py-3">
              <span className="text-emerald-400 text-lg">🪙</span>
              <span className="text-sm font-bold text-emerald-300">
                +₹{estimatedIncentive}{' '}
                <span className="font-normal text-emerald-400">
                  ({triageResult.red_flag_alert ? 'High-Risk Referral Bonus' : 'Routine Check Incentive'})
                </span>
              </span>
            </div>

            {/* Engine badge */}
            {triageResult._engine && (
              <p className="text-[10px] text-slate-600 text-right">
                Engine: {triageResult._engine}
              </p>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={handleSubmitCase}
                disabled={submitLoading}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-colors flex items-center justify-center gap-2"
              >
                {submitLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  '🚀 Submit Case & Generate Hospital Referral'
                )}
              </button>
              <button
                onClick={handleReRecord}
                disabled={submitLoading}
                className="sm:w-auto px-5 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-2xl transition-colors disabled:opacity-60"
              >
                🔄 Re-record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline saved notice */}
      {offlineSaved && (
        <div className="bg-amber-900/40 border border-amber-700/60 rounded-2xl p-3 text-sm text-amber-300">
          📴 Saved locally on device. Will auto-sync when network returns.
        </div>
      )}

      {/* ── Section 7: Case register ───────────────────────────────────────── */}
      {cases.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Field Case Register
          </h3>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: '📋 All Field Cases' },
                { id: 'red', label: '🚨 Lal Pataka' },
                { id: 'mch', label: '🤰 MCH' },
                { id: 'vaccine', label: '💉 Vaccine Due' },
              ] as { id: FilterTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTab(t.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                  filterTab === t.id
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500'
                }`}
              >
                {t.label}
                {t.id === 'red' && cases.filter(c => c.risk_level === 'RED_LAL_PATAKA').length > 0 && (
                  <span className="ml-1.5 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {cases.filter(c => c.risk_level === 'RED_LAL_PATAKA').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Case cards */}
          <div className="space-y-3">
            {filteredCases.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No cases in this category.</p>
            ) : (
              filteredCases.map((c) => <CaseCard key={c.case_id} c={c} />)
            )}
          </div>
        </div>
      )}

      {/* OPD Token modal */}
      {showOpdModal && opdToken && (
        <OpdTokenModal token={opdToken} onClose={() => setShowOpdModal(false)} />
      )}
    </div>
  );
};

export default AshaVoiceWorkstation;
