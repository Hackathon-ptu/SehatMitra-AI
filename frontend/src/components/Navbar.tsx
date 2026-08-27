import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageSquare, 
  ClipboardList, 
  ShieldAlert, 
  Building2, 
  FileText, 
  Menu, 
  X,
  User as UserIcon,
  Activity
} from 'lucide-react';
import { NavItem, PageMode } from '../types/navigation';
import { IconButton } from './common/IconButton';
import { Button } from './common/Button';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MedicalProfileModal } from './profile/MedicalProfileModal';
import { LanguageSelector } from './language/LanguageSelector';

export interface NavbarProps {
  pageMode?: PageMode;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showAuthModal, logout } = useAuth();
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("sehat_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [dropdown, setDropdown] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem("sehat_user") || localStorage.getItem("user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {}
    };
    window.addEventListener("auth_state_changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth_state_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const NAV_ITEMS: NavItem[] = [
    { label: t('nav_home') || 'Overview', path: '/' },
    { label: t('nav_chat') || 'AI Chat', path: '/chat', icon: <MessageSquare className="w-4 h-4" /> },
    { label: t('nav_interview') || 'Health Interview', path: '/health-interview', icon: <ClipboardList className="w-4 h-4" /> },
    { label: t('nav_triage') || 'Risk Assessment', path: '/risk-assessment', icon: <ShieldAlert className="w-4 h-4" /> },
    { label: t('nav_hospitals') || 'Hospitals', path: '/hospitals', icon: <Building2 className="w-4 h-4" /> },
    { label: t('nav_reports') || 'Report Explanation', path: '/report', icon: <FileText className="w-4 h-4" /> },
    { label: t('nav_asha') || 'ASHA Portal', path: '/asha-portal', icon: <Activity className="w-4 h-4" /> },
  ];

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-card/95 backdrop-blur border-b border-surface-border shadow-subtle">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" onClick={closeMobileMenu}>
          <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white transition-colors group-hover:bg-brand-700 shadow-subtle">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
            <span className="text-[10px] text-content-muted tracking-wider uppercase leading-tight">
              Healthcare Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sos'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-full shadow-lg shadow-red-500/30 animate-pulse transition-all"
            type="button"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>SOS / 108</span>
          </button>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-full shadow-md transition-all"
              type="button"
            >
              📲 Install App
            </button>
          )}

          <LanguageSelector />

          {/* Authentication section */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdown(!dropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                  {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : "U"}
                </div>
                <span className="text-xs font-semibold max-w-[100px] truncate text-slate-700 dark:text-slate-200">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
                <span className="text-xs text-slate-400">▼</span>
              </button>
              {dropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 text-left">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <p className="font-semibold truncate">{user.displayName || "Patient"}</p>
                    <p className="text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("sehat_user");
                      localStorage.removeItem("user");
                      setUser(null);
                      if (logout) logout();
                      window.location.reload();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => showAuthModal('login')} className="px-3 py-1.5 text-xs font-medium border border-surface-border rounded-lg text-content-primary bg-surface-card hover:bg-surface-elevated">
                Login
              </button>
              <button onClick={() => showAuthModal('signup')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sos'))}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-full shadow-lg animate-pulse transition-all mr-1"
            type="button"
          >
            <span>SOS / 108</span>
          </button>

          <LanguageSelector />

          <IconButton
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            variant="ghost"
            size="md"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-surface-border bg-surface-card px-4 pt-2 pb-6 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-content-muted px-3 py-1">
            Navigation Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={cn(
                  'px-3 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2.5',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          
          <div className="mt-4 pt-4 border-t border-surface-border flex flex-col gap-2">
            {deferredPrompt && (
              <button
                onClick={() => { handleInstallClick(); closeMobileMenu(); }}
                className="py-2 mb-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-md transition-all text-center flex items-center justify-center gap-1.5 active:scale-[0.99] w-full"
                type="button"
              >
                📲 Install SehatMitra App
              </button>
            )}
            {user ? (
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'profile' }));
                    navigate('/');
                    closeMobileMenu();
                  }}
                  className="flex items-center justify-center p-2 rounded bg-brand-50/50 border border-brand-100 text-xs font-bold text-brand-800 cursor-pointer hover:bg-brand-50 transition-colors w-full"
                >
                  <UserIcon className="w-4 h-4 mr-1.5 text-brand-600" />
                  {user.email}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button variant="outline" size="md" onClick={() => { showAuthModal('login'); closeMobileMenu(); }} className="w-full">
                  {t('login')}
                </Button>
                <Button variant="primary" size="md" onClick={() => { showAuthModal('signup'); closeMobileMenu(); }} className="w-full">
                  {t('signup')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <MedicalProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </header>
  );
};
