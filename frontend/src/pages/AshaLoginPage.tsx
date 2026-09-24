/**
 * AshaLoginPage.tsx
 * Standalone entry point for ASHA Health Workers.
 * Accessible via /asha-login and /portal/asha-login.
 *
 * Auth isolation contract:
 *   - NEVER reads or writes citizen localStorage keys (token, sehat_user, user).
 *   - On successful login, writes only to sessionStorage:
 *       sessionStorage.asha_token  — opaque auth token
 *       sessionStorage.asha_worker — JSON worker profile
 *   - AuthContext (citizen) is never touched.
 *
 * Demo credentials:
 *   Worker ID: ASHA-101 | ASHA-PB-042 | 9876543210
 *   M-PIN:     1234
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import API_BASE_URL from '../config/api';

// ── Component ─────────────────────────────────────────────────────────────────

export const AshaLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [workerId, setWorkerId] = useState('');
  const [mpin, setMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If an ASHA session already exists in this browser tab, skip login.
  useEffect(() => {
    if (sessionStorage.getItem('asha_token')) {
      navigate('/asha/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const id  = workerId.trim().toUpperCase();
    const pin = mpin.trim();

    // Client-side field validation
    if (!id) {
      setError('Please enter your ASHA Worker ID or Registration Number.');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('M-PIN must be exactly 4 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/asha-login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ worker_id: id, mpin: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail ?? 'Invalid ASHA Worker ID or M-PIN. Please verify credentials.');
        return;
      }

      // ── Isolated session write — citizen localStorage untouched ──────────────
      sessionStorage.setItem('asha_token',  data.access_token);
      sessionStorage.setItem('asha_worker', JSON.stringify(data.worker));

      navigate('/asha/dashboard', { replace: true });
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-16">

      {/* ── Top-left: return to citizen portal ─────────────────────────────── */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ← Return to SehatMitra Citizen AI
      </Link>

      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl p-6 sm:p-8">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700/30 border border-emerald-600/50 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-emerald-500 mb-0.5">
                राष्ट्रीय स्वास्थ्य मिशन (NHM)
              </p>
              <h1 className="font-extrabold text-base text-white leading-tight">
                ASHA-Sarthi Field Portal
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authorized access for certified ASHA health workers only
              </p>
            </div>
          </div>

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-900/40 border border-red-700/60 text-red-300 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* ── Credential form ───────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Worker ID */}
            <div>
              <label
                htmlFor="worker-id"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5"
              >
                ASHA Worker ID / Registration Number
              </label>
              <input
                id="worker-id"
                type="text"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="e.g. ASHA-101 or ASHA-PB-042"
                autoComplete="username"
                spellCheck={false}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* M-PIN */}
            <div>
              <label
                htmlFor="mpin"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5"
              >
                Security 4-Digit M-PIN
              </label>
              <div className="relative">
                <input
                  id="mpin"
                  type={showMpin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-[0.6em] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowMpin((v) => !v)}
                  aria-label={showMpin ? 'Hide M-PIN' : 'Show M-PIN'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-900/40 transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Verifying credentials…' : 'Login to ASHA-Sarthi Workstation'}
            </button>
          </form>

          {/* ── Demo credentials helper ───────────────────────────────────── */}
          <div className="mt-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              <span className="font-semibold text-slate-400">Demo Authorized Credentials</span>
              <br />
              ID: <span className="font-mono text-slate-300">ASHA-101</span>
              {' '}|{' '}
              M-PIN: <span className="font-mono text-slate-300">1234</span>
            </p>
          </div>

          {/* ── Footer links ──────────────────────────────────────────────── */}
          <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-500">
              Not an ASHA Worker?{' '}
              <Link to="/" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Go to Citizen Portal
              </Link>
            </p>
            <Link
              to="/hospital"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              🏥 Switch to Hospital Hub →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AshaLoginPage;
