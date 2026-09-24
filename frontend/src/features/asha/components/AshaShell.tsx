import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloudOff, Heart, Home, ListChecks, Moon, Plus, RefreshCw, Send, Sun, UserRound } from 'lucide-react';
import { LanguageSelector } from '../../../components/language/LanguageSelector';
import { useColorTheme } from '../../../hooks/useColorTheme';
import { cn } from '../../../utils/cn';
import { useAshaSession, useOnline, useOutbox } from '../hooks';
import { Toaster, toast } from './ui';

const NAV = [
  { to: '/asha', end: true, icon: ListChecks, key: 'nav.today', label: 'Today' },
  { to: '/asha/households', icon: Home, key: 'nav.households', label: 'Families' },
  { to: '/asha/visit', icon: Plus, key: 'nav.visit', label: 'Record visit', primary: true },
  { to: '/asha/referrals', icon: Send, key: 'nav.referrals', label: 'Referrals' },
  { to: '/asha/me', icon: UserRound, key: 'nav.me', label: 'My work' },
];

export const AshaShell: React.FC = () => {
  const { t } = useTranslation('asha');
  const { theme, toggleTheme } = useColorTheme();
  const session = useAshaSession();
  const online = useOnline();
  const pending = useOutbox(() => toast(t('offline.synced', 'Saved records synced'), 'success'));
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-bg text-content-primary flex flex-col antialiased">
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <NavLink to="/asha" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/10 shrink-0">
              <Heart className="w-5 h-5 fill-white/10" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-extrabold text-base sm:text-lg tracking-tight leading-none truncate">
                SehatMitra <span className="text-brand-600">AI</span>
              </span>
              <span className="text-[10px] text-content-muted leading-tight font-medium mt-0.5 truncate">
                {t('portalName', 'ASHA Portal')}
                {session?.worker.village ? ` · ${session.worker.village}` : ''}
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(!online || pending > 0) && (
              <span
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                  online ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
                )}
                title={t('offline.pendingHint', 'Records saved on this phone will upload automatically')}
              >
                {online ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudOff className="w-3.5 h-3.5" />}
                {pending > 0 ? t('offline.pending', { count: pending, defaultValue: '{{count}} to sync' }) : t('offline.label', 'Offline')}
              </span>
            )}
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="p-2 bg-surface-elevated border border-surface-border rounded-lg hover:bg-surface-border transition-colors"
              aria-label={t('toggleTheme', 'Toggle theme')}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-brand-600 fill-brand-600/10" /> : <Sun className="w-4 h-4 text-amber-500 fill-amber-500/10" />}
            </button>
            {session && (
              <NavLink
                to="/asha/me"
                className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full hover:bg-surface-elevated transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-sm">
                  {session.worker.name[0]}
                </span>
                <span className="text-sm font-medium text-content-secondary max-w-[120px] truncate">{session.worker.name}</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Desktop tabs — same treatment as the citizen app's tab bar */}
        <nav className="hidden lg:block border-t border-surface-border bg-surface-card" aria-label={t('nav.label', 'ASHA sections')}>
          <div className="max-w-6xl mx-auto px-6 flex gap-1">
            {NAV.map(({ to, end, icon: Icon, key, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'relative flex items-center gap-2 py-3 px-4 text-sm transition-colors rounded-t-lg',
                  isActive
                    ? 'text-brand-700 dark:text-brand-400 font-semibold bg-brand-50/70 dark:bg-brand-950/30 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600'
                    : 'text-content-secondary hover:text-content-primary',
                )}
              >
                <Icon className="w-4 h-4" />
                {t(key, label)}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {!online && (
        <div className="lg:hidden bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium px-4 py-2 flex items-center gap-2">
          <CloudOff className="w-4 h-4 shrink-0" />
          {t('offline.banner', 'You are offline. You can keep recording — visits will sync when network returns.')}
          {pending > 0 && <span className="ml-auto font-semibold whitespace-nowrap">{t('offline.pending', { count: pending, defaultValue: '{{count}} to sync' })}</span>}
        </div>
      )}

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-12">
        <div key={location.pathname} className="tab-panel-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur border-t border-surface-border pb-[env(safe-area-inset-bottom)]"
        aria-label={t('nav.label', 'ASHA sections')}
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {NAV.map(({ to, end, icon: Icon, key, label, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                primary ? 'text-content-secondary' : isActive ? 'text-brand-700 dark:text-brand-400' : 'text-content-muted',
              )}
            >
              {({ isActive }) => primary ? (
                <>
                  <span className="-mt-7 w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 flex items-center justify-center ring-4 ring-surface-bg active:scale-95 transition-transform">
                    <Icon className="w-7 h-7" />
                  </span>
                  <span className={isActive ? 'text-brand-700 dark:text-brand-400' : ''}>{t('nav.visitShort', 'Visit')}</span>
                </>
              ) : (
                <>
                  <span className={cn('px-4 py-1 rounded-full transition-colors', isActive && 'bg-brand-50 dark:bg-brand-500/15')}>
                    <Icon className="w-5 h-5" />
                  </span>
                  {t(key, label)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster />
    </div>
  );
};
