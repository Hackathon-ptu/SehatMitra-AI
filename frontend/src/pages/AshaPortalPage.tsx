/**
 * AshaPortalPage.tsx
 * Protected ASHA Portal — requires role=asha or role=admin.
 * Accessible via /portal/asha.
 *
 * • Unauthenticated → redirect to /portal/asha-login.
 * • Authenticated but non-ASHA role → shows access-denied screen with redirect link.
 * • Authenticated ASHA/admin → renders AshaDashboard.
 */

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AshaDashboard } from '../components/dashboard/AshaDashboard';
import { Activity, ArrowLeft, Lock, Loader2 } from 'lucide-react';

export const AshaPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const role = (user?.role || '').toLowerCase();
  const isAshaOrAdmin = role === 'asha' || role === 'admin';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/asha-login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bg">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  // Not authenticated — navigating away, render nothing to avoid flash
  if (!user) return null;

  // Authenticated but wrong role
  if (!isAshaOrAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-surface-bg px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Lock className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-content-primary mb-2">Access Denied</h1>
          <p className="text-sm text-content-muted max-w-xs">
            The ASHA Portal is restricted to certified ASHA health workers. Your current role is{' '}
            <span className="font-bold text-content-primary">"{role || 'patient'}"</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs font-semibold text-content-primary hover:bg-surface-border transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Citizen Portal
          </Link>
          <Link
            to="/asha-login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Sign in as ASHA
          </Link>
        </div>
      </div>
    );
  }

  // Authorized ASHA / Admin — render full portal with a minimal header
  return (
    <div className="min-h-screen bg-surface-bg text-content-primary flex flex-col">
      {/* Slim ASHA Portal top-bar */}
      <header className="sticky top-0 z-40 bg-teal-900/95 backdrop-blur border-b border-teal-700/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-teal-300" />
            <span className="font-bold text-sm text-white tracking-tight">ASHA Health Worker Portal</span>
            <span className="hidden sm:inline-block text-[10px] text-teal-400 bg-teal-800/60 px-2 py-0.5 rounded-full font-medium">
              {user.full_name || user.email}
            </span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 text-[11px] text-teal-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Citizen Portal
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AshaDashboard />
      </main>
    </div>
  );
};

export default AshaPortalPage;
