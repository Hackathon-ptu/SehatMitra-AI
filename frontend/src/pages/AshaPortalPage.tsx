/**
 * AshaPortalPage.tsx
 * Production-grade Voice-First ASHA Health Worker Workstation.
 *
 * Routing:  /asha/*  and  /portal/asha  (legacy alias)
 *
 * Auth isolation contract:
 *   - Authentication is verified against sessionStorage.asha_token ONLY.
 *   - Citizen AuthContext (localStorage token / sehat_user) is NEVER read here.
 *   - Logout removes only asha_token and asha_worker from sessionStorage;
 *     citizen localStorage is untouched.
 *
 * Sections:
 *   1. Sticky top header — worker avatar, incentive wallet, connectivity badge, nav links
 *   2. AshaVoiceWorkstation — microphone orb, triage result card, case register
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AshaVoiceWorkstation } from '../components/asha/AshaVoiceWorkstation';
import { Activity, ArrowLeft, Lock, Loader2, LogOut, Wifi, WifiOff, Home, Building2 } from 'lucide-react';

// ─── Typed worker session (matches what AshaLoginPage writes) ─────────────────

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
    const raw = sessionStorage.getItem('asha_worker');
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

// ─── Connectivity hook ────────────────────────────────────────────────────────

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// ─── Incentive Wallet widget ──────────────────────────────────────────────────

interface WalletProps {
  total: number;
  flashAmount: number | null;
}

const IncentiveWallet: React.FC<WalletProps> = ({ total, flashAmount }) => {
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
    <div className="relative flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/70 rounded-2xl px-4 py-2 select-none">
      <span className="text-xl" role="img" aria-label="coin">🪙</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider leading-none">
          This Month
        </span>
        <span className="text-lg font-extrabold text-white leading-tight">
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

// ─── Connectivity badge ───────────────────────────────────────────────────────

const ConnectivityBadge: React.FC<{ online: boolean }> = ({ online }) =>
  online ? (
    <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-900/50 border border-emerald-700/60 px-3 py-1.5 rounded-full">
      <Wifi className="w-3.5 h-3.5" />
      Cloud Connected
    </span>
  ) : (
    <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-900/50 border border-amber-700/60 px-3 py-1.5 rounded-full animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      Offline Cached
    </span>
  );

// ─── Worker avatar / identity strip ──────────────────────────────────────────

const WorkerIdentity: React.FC<{ name: string; subCenter: string }> = ({ name, subCenter }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-emerald-500/30 shrink-0">
        {initials}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-extrabold text-white truncate max-w-[180px]">{name}</span>
        <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[180px]">
          ASHA Facilitator · {subCenter}
        </span>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const AshaPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();

  // Resolve worker identity from isolated sessionStorage — no AuthContext dependency.
  const [session] = useState(() => readAshaSession());

  // Incentive wallet state — persisted in localStorage under ASHA-specific key.
  // (Using asha_wallet_total is safe; it's not a citizen auth key.)
  const [walletTotal, setWalletTotal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('asha_wallet_total');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [lastEarned, setLastEarned] = useState<number | null>(null);

  const handleIncentiveEarned = useCallback((amount: number) => {
    setWalletTotal((prev) => {
      const next = prev + amount;
      localStorage.setItem('asha_wallet_total', String(next));
      return next;
    });
    setLastEarned(amount);
    setTimeout(() => setLastEarned(null), 3000);
  }, []);

  // ── Auth guard: session-based, citizen auth untouched ─────────────────────
  useEffect(() => {
    if (!readAshaSession()) {
      navigate('/asha-login', { replace: true });
    }
  }, [navigate]);

  // ── Logout: clear ASHA session only ───────────────────────────────────────
  const handleLogout = () => {
    clearAshaSession();
    navigate('/asha-login', { replace: true });
  };

  // Guard against the narrow render window before redirect fires
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ── Access denied (unexpected role in session) ────────────────────────────
  if (session.worker.role !== 'asha' && session.worker.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-900/40 border border-red-700/60 flex items-center justify-center">
          <Lock className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 max-w-xs">
            The ASHA Portal is restricted to certified ASHA health workers. Your session role is{' '}
            <span className="font-bold text-white">"{session.worker.role || 'unknown'}"</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Citizen Portal
          </Link>
          <Link
            to="/asha-login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Sign in as ASHA
          </Link>
        </div>
      </div>
    );
  }

  // ── Derive display info from the isolated ASHA session ───────────────────
  const workerName = session.worker.name || session.worker.worker_id || 'ASHA Worker';
  const subCenter = session.worker.sub_center || 'Sub-Center';

  // ── Full workstation render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Sticky Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 shadow-lg shadow-black/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* Left: logo + worker identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <WorkerIdentity name={workerName} subCenter={subCenter} />
          </div>

          {/* Right: wallet + connectivity + nav */}
          <div className="flex items-center gap-2 shrink-0">
            <IncentiveWallet total={walletTotal} flashAmount={lastEarned} />
            <ConnectivityBadge online={online} />

            {/* Nav: Citizen Home — navigates without touching ASHA session */}
            <Link
              to="/"
              title="Citizen Home"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {/* Nav: Hospital Hub */}
            <Link
              to="/hospital"
              title="Hospital Hub"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hospital</span>
            </Link>

            {/* Logout — clears ONLY ASHA sessionStorage */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of ASHA portal"
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Offline banner ──────────────────────────────────────────────── */}
      {!online && (
        <div className="bg-amber-900/60 border-b border-amber-700/60 text-amber-300 text-xs font-semibold text-center py-2 px-4">
          📴 Offline Mode — Cases will be saved to device and synced when connectivity is restored.
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Page identity */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            ASHA-Sarthi <span className="text-emerald-400">Workstation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            आशा सार्थी — बोलकर मरीज़ की जानकारी दर्ज करें और AI से तुरंत क्लिनिकल ट्राइज पाएं
          </p>
        </div>

        {/* Voice workstation */}
        <AshaVoiceWorkstation
          workerName={workerName}
          subCenter={subCenter}
          onIncentiveEarned={handleIncentiveEarned}
        />
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-600">
        SehatMitra ASHA-Sarthi · National Health Mission · ABDM Compliant · AI by Groq / Gemini
      </footer>
    </div>
  );
};

export default AshaPortalPage;
