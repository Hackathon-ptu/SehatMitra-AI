import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, Eye, EyeOff, Heart, ListChecks, Lock, Moon, ShieldCheck, Sun, Syringe, UserRound } from 'lucide-react';
import { LanguageSelector } from '../../../components/language/LanguageSelector';
import { useColorTheme } from '../../../hooks/useColorTheme';
import { errorMessage, getSession, login } from '../api';
import { Btn } from '../components/ui';

export const AshaLoginPage: React.FC = () => {
  const { t } = useTranslation('asha');
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useColorTheme();
  const [workerId, setWorkerId] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const next = (location.state as { from?: string } | null)?.from || '/asha';

  useEffect(() => {
    if (getSession()) navigate(next, { replace: true });
  }, [navigate, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!workerId.trim()) return setError(t('login.needId', 'Enter your ASHA ID or mobile number'));
    if (!/^\d{4,6}$/.test(mpin)) return setError(t('login.needPin', 'M-PIN is 4 to 6 digits'));
    setLoading(true);
    try {
      await login(workerId.trim(), mpin);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err, t('login.network', 'Could not connect. Check your internet and try again.')));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: ListChecks, title: t('login.f1', 'Your day, planned'), body: t('login.f1b', 'Visits, vaccines and follow-ups due today — worked out for you.') },
    { icon: Baby, title: t('login.f2', 'Mother & child care'), body: t('login.f2b', 'ANC, newborn (HBNC) and child (HBYC) visits on schedule.') },
    { icon: Syringe, title: t('login.f3', 'No missed vaccines'), body: t('login.f3b', 'Every child’s UIP card with due and overdue doses.') },
  ];

  return (
    <div className="min-h-screen bg-surface-bg text-content-primary grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 text-white p-12 flex-col justify-between">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -left-20 bottom-10 w-72 h-72 rounded-full bg-white/5" />
        <Link to="/" className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </span>
          <span className="font-extrabold text-xl tracking-tight">SehatMitra AI</span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-3">{t('portalName', 'ASHA Portal')}</p>
          <h1 className="text-4xl font-bold leading-tight">{t('login.hero', 'Every family in your village, cared for on time.')}</h1>
          <div className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/75">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">{t('login.nhm', 'Built around NHM guidelines for Accredited Social Health Activists.')}</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-4 sm:px-8 h-16">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-content-secondary hover:text-content-primary">
            <ArrowLeft className="w-4 h-4" /> {t('login.backHome', 'SehatMitra home')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="p-2 bg-surface-elevated border border-surface-border rounded-lg hover:bg-surface-border transition-colors"
              aria-label={t('toggleTheme', 'Toggle theme')}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-brand-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <span className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/20">
                <Heart className="w-5 h-5" />
              </span>
              <div>
                <p className="font-extrabold text-lg leading-none">SehatMitra <span className="text-brand-600">AI</span></p>
                <p className="text-xs text-content-muted mt-1">{t('portalName', 'ASHA Portal')}</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight">{t('login.title', 'Namaste! Sign in')}</h2>
            <p className="text-sm text-content-muted mt-1">{t('login.subtitle', 'Use the ASHA ID or mobile number registered with your ANM.')}</p>

            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <label className="block">
                <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('login.id', 'ASHA ID or mobile number')}</span>
                <span className="flex items-center rounded-xl border border-surface-border bg-surface-card focus-within:ring-2 focus-within:ring-brand-600/40 focus-within:border-brand-600">
                  <UserRound className="w-4 h-4 ml-3 text-content-muted" />
                  <input
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="characters"
                    placeholder="ASHA-101"
                    className="w-full h-12 bg-transparent px-3 text-[15px] focus:outline-none placeholder:text-content-disabled"
                  />
                </span>
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold text-content-secondary mb-1.5">{t('login.pin', 'M-PIN')}</span>
                <span className="flex items-center rounded-xl border border-surface-border bg-surface-card focus-within:ring-2 focus-within:ring-brand-600/40 focus-within:border-brand-600">
                  <Lock className="w-4 h-4 ml-3 text-content-muted" />
                  <input
                    value={mpin}
                    onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="current-password"
                    placeholder="••••"
                    className="w-full h-12 bg-transparent px-3 text-[15px] tracking-[0.3em] focus:outline-none placeholder:text-content-disabled placeholder:tracking-normal"
                  />
                  <button type="button" onClick={() => setShowPin((s) => !s)} className="p-3 text-content-muted" aria-label={t('login.showPin', 'Show M-PIN')}>
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </span>
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm px-3 py-2.5" role="alert">{error}</p>
              )}

              <Btn type="submit" size="lg" block loading={loading}>{t('login.submit', 'Sign in')}</Btn>
            </form>

            <button
              type="button"
              onClick={() => { setWorkerId('ASHA-101'); setMpin('1234'); }}
              className="mt-5 w-full rounded-xl border border-dashed border-brand-300 dark:border-brand-500/40 bg-brand-50/60 dark:bg-brand-500/5 px-4 py-3 text-left hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
            >
              <span className="block text-xs font-semibold text-brand-700 dark:text-brand-300">{t('login.demo', 'Demo account — tap to fill')}</span>
              <span className="block text-sm text-content-secondary mt-0.5 font-mono">ASHA-101 · 1234</span>
            </button>

            <p className="mt-6 flex items-start gap-2 text-xs text-content-muted">
              <ShieldCheck className="w-4 h-4 shrink-0 text-brand-600" />
              {t('login.privacy', 'You only see families assigned to you. Every record you open is logged to protect patient privacy.')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
