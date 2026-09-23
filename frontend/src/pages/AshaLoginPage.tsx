/**
 * AshaLoginPage.tsx
 * Standalone entry point for ASHA Health Workers.
 * Accessible via /portal/asha-login — not shown in the citizen navbar.
 *
 * • Unauthenticated visitors see the sign-in form (role="asha" preset).
 * • If already authenticated as ASHA/admin, redirect to /portal/asha.
 * • Non-ASHA authenticated users see a clear "access denied" message.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Activity, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://sehatmitra-ai.onrender.com/api/v1';

export const AshaLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const role = (user.role || '').toLowerCase();
      if (role === 'asha' || role === 'admin') {
        navigate('/asha/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await auth.signOut();
        setError('Email not verified. Please verify your email before signing in.');
        setLoading(false);
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/auth/firebase-login`, {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
      });
      const payload = res.data.user || { uid: cred.user.uid, email: cred.user.email };
      const role = (payload.role || '').toLowerCase();
      if (role !== 'asha' && role !== 'admin') {
        await auth.signOut();
        setError('Access denied. This portal is only for certified ASHA Health Workers.');
        setLoading(false);
        return;
      }
      localStorage.setItem('user', JSON.stringify(payload));
      localStorage.setItem('sehat_user', JSON.stringify(payload));
      if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
      if (setUser) setUser(payload);
      window.dispatchEvent(new Event('auth_state_changed'));
      navigate('/asha/dashboard', { replace: true });
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bg">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 text-left">
      {/* Back to citizen portal */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to SehatMitra
      </Link>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/30">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-extrabold text-lg text-white leading-tight">ASHA Worker Portal</h1>
            <p className="text-xs text-slate-400 mt-0.5">Certified health worker access only</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asha.worker@gov.in"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In as ASHA Worker'}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-500">
          Not an ASHA Worker?{' '}
          <Link to="/" className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
            Go to Citizen Portal
          </Link>
        </p>

        {/* Hospital Hub redirect footer */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 text-center">
          <p className="text-[10px] text-slate-500">
            Looking for the Hospital OPD Workstation?
          </p>
          <Link
            to="/hospital"
            className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            🏥 Switch to Hospital Hub →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AshaLoginPage;
