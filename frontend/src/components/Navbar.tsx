import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Globe, 
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
import { Badge } from './common/Badge';
import { MedicalProfileModal } from './profile/MedicalProfileModal';

export interface NavbarProps {
  pageMode?: PageMode;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, showAuthModal, logout } = useAuth();
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

          <Link to="/language">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Globe className="w-4 h-4 text-brand-600" />}
            >
              Language
            </Button>
          </Link>

          {/* Authentication section */}
          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-1.5 focus:outline-none"
              >
                <Badge variant="teal" size="md" icon={<UserIcon className="w-3.5 h-3.5" />}>
                  {user?.email || 'Logged In'}
                </Badge>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-card border border-surface-border rounded-lg shadow-elevated py-1 z-50 text-left">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: 'profile' }));
                      navigate('/');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-content-primary hover:bg-surface-elevated transition-colors"
                  >
                    👤 My Profile
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-surface-elevated transition-colors border-t border-surface-border"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => showAuthModal('login')}
              >
                {t('login')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => showAuthModal('signup')}
              >
                {t('signup')}
              </Button>
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

          <Link to="/language" onClick={closeMobileMenu}>
            <IconButton aria-label="Change Language" variant="ghost" size="sm">
              <Globe className="w-5 h-5 text-brand-600" />
            </IconButton>
          </Link>

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
            {isAuthenticated ? (
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
                  {user?.email}
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
