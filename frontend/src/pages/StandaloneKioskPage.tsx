/**
 * StandaloneKioskPage.tsx
 * Full-screen, no-chrome Charak-Kiosk for hospital OPD tablets/touchscreens.
 *
 * Route architecture:
 *   /kiosk                    → Pure patient intake kiosk (CharakKiosk only, no tabs)
 *   /doctor-cockpit/:token_id → Pure physician workstation (DoctorCockpit only, no tabs)
 *
 * The 3-tab "Patient Intake / Doctor Cockpit / FHIR" layout has been removed.
 * Patients see ONLY the intake flow. Doctors open their dedicated route.
 *
 * Built with IBM Bob IDE (Granite-Code-Instruct)
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CharakKiosk } from '../components/kiosk/CharakKiosk';
import { DoctorCockpit } from '../components/kiosk/DoctorCockpit';
import { ShieldAlert, X } from 'lucide-react';

// ── Kiosk shell — /kiosk ──────────────────────────────────────────────────────

export const StandaloneKioskPage: React.FC = () => {
  const [redFlagActive, setRedFlagActive]     = useState(false);
  const [redFlagReason, setRedFlagReason]     = useState('');
  const [redFlagDismissed, setRedFlagDismissed] = useState(false);

  const handleRedFlag = (reason: string) => {
    setRedFlagReason(reason);
    setRedFlagActive(true);
    setRedFlagDismissed(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Emergency Red-Flag Banner ─────────────────────────────────────── */}
      {redFlagActive && !redFlagDismissed && (
        <div className="shrink-0 bg-red-700 border-b-2 border-red-400 px-5 py-2.5 flex items-center justify-between gap-3 animate-pulse z-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 animate-bounce" />
            <span className="font-extrabold text-sm text-white">
              🚨 RED FLAG — {redFlagReason || 'Emergency condition detected. Escalate immediately.'}
            </span>
          </div>
          <button
            onClick={() => setRedFlagDismissed(true)}
            className="p-1 rounded-lg hover:bg-red-600 transition-colors shrink-0"
            aria-label="Dismiss red-flag banner"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* ── Patient Intake (CharakKiosk owns its own header + theme) ──────── */}
      <div className="flex-1">
        <CharakKiosk onRedFlag={handleRedFlag} />
      </div>
    </div>
  );
};

// ── Doctor Cockpit shell — /doctor-cockpit/:token_id ─────────────────────────

export const DoctorCockpitPage: React.FC = () => {
  const { token_id } = useParams<{ token_id?: string }>();

  // If no token in URL, show a token entry screen
  if (!token_id) {
    return <DoctorCockpitTokenEntry />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Slim breadcrumb back-link */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-700/40 flex items-center justify-between">
        <Link
          to="/kiosk"
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          ← Patient Kiosk
        </Link>
        <span className="text-[10px] text-slate-600 font-mono">Doctor Cockpit · Charak-Kiosk · AIIA PS-26047</span>
      </div>
      <DoctorCockpit tokenId={decodeURIComponent(token_id)} />
    </div>
  );
};

// ── Token entry screen (no token in URL) ─────────────────────────────────────

const DoctorCockpitTokenEntry: React.FC = () => {
  const [input, setInput] = React.useState('');
  const [submitted, setSubmitted] = React.useState('');

  const load = () => {
    const val = input.trim().toUpperCase();
    if (val) setSubmitted(val);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700/40 flex items-center justify-between">
          <button
            onClick={() => setSubmitted('')}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            ← Search Another Token
          </button>
          <span className="text-[10px] text-slate-600 font-mono">Doctor Cockpit · Charak-Kiosk</span>
        </div>
        <DoctorCockpit tokenId={submitted} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <span className="text-2xl">🩺</span>
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl leading-tight">Doctor Cockpit</h1>
            <p className="text-slate-400 text-xs mt-0.5">15-second physician triage view · AIIA PS-26047</p>
          </div>
        </div>

        {/* Token input */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
            Enter OPD Token
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="OPD-GRN-XXXXXX"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-lg font-mono text-center tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={load}
            disabled={!input.trim()}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            Load Patient Record
          </button>
        </div>

        <Link
          to="/kiosk"
          className="block text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          ← Back to Patient Kiosk
        </Link>
      </div>
    </div>
  );
};

export default StandaloneKioskPage;
