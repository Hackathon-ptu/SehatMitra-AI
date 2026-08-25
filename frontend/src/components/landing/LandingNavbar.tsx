import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Globe } from 'lucide-react';
import { Button } from '../common/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

export const LandingNavbar: React.FC = () => {
  const { user, logout, showAuthModal } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const storedUser = user || JSON.parse(localStorage.getItem("user") || "null");

  return (
    <header className="w-full bg-surface-card/90 backdrop-blur border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white transition-colors group-hover:bg-brand-700 shadow-subtle">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-lg tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
            <span className="text-[10px] text-content-muted leading-tight hidden sm:block">
              Healthcare Assistant
            </span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/language">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Globe className="w-4 h-4 text-brand-600" />}
            >
              Language
            </Button>
          </Link>

          {storedUser ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left focus:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {storedUser.displayName
                    ? storedUser.displayName[0].toUpperCase()
                    : storedUser.email
                    ? storedUser.email[0].toUpperCase()
                    : "U"}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:inline-block max-w-[120px] truncate">
                  {storedUser.displayName || storedUser.email?.split("@")[0]}
                </span>
                <span className="text-xs text-slate-400">▼</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-left">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
                      {storedUser.displayName || "Patient"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{storedUser.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      const tabEvent = new CustomEvent('set-active-tab', { detail: 'profile' });
                      window.dispatchEvent(tabEvent);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    👤 My Profile
                  </button>

                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      if (logout) await logout();
                      localStorage.removeItem("user");
                      window.location.reload();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => showAuthModal('login')}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                Login
              </button>
              <button
                onClick={() => showAuthModal('signup')}
                className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
