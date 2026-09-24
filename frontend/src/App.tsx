import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { HealthChat } from './components/HealthChat';
import { LabReportAnalyzer } from './components/reports/LabReportAnalyzer';
import { HospitalLocator } from './components/HospitalLocator';
import { HistoryDashboard } from './components/HistoryDashboard';
import { TriageAssistant } from './components/triage/TriageAssistant';
import { ProfilePage } from './components/profile/ProfilePage';
import { AuthModal } from './components/AuthModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { LanguageSelector } from './components/language/LanguageSelector';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Heart, MessageSquare, FileSpreadsheet, MapPin, History, User as UserIcon, Sun, Moon, Mic, Menu, X, Hospital, ChevronDown, LogOut } from 'lucide-react';
import { UI_TRANSLATIONS } from './constants/translations';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import { OfflineBanner } from './components/common/OfflineBanner';
import { useColorTheme } from './hooks/useColorTheme';

export const App = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isAuthenticated, loading: authLoading, user, logout, showAuthModal, authModalMode, hideAuthModal } = useAuth();

  // Resolve the current user role — support both in-context and localStorage.
  // During auth loading we still check localStorage so the UI doesn't flicker.
  const resolvedUser = user || (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // storedUser: prefer in-context user; fall back to localStorage so header
  // doesn't flash "Login" while the Firebase check is still in flight.
  const storedUser = resolvedUser;

  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('set-active-tab', handleSetTab);
    return () => window.removeEventListener('set-active-tab', handleSetTab);
  }, []);

  useEffect(() => {
    const handleOpenSos = () => setIsSosOpen(true);
    window.addEventListener('open-sos', handleOpenSos);
    return () => window.removeEventListener('open-sos', handleOpenSos);
  }, []);
  
  // Theme Engine (shared with the ASHA portal)
  const { theme, toggleTheme } = useColorTheme();

  const { language: selectedLanguage, setLanguage, t: translate } = useLanguage();

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  useEffect(() => {
    const hasLang = localStorage.getItem('preferred_lang');
    if (!hasLang) {
      setIsLangModalOpen(true);
    }
  }, []);



  const handleSelectLanguageFromModal = (langCode: string) => {
    setLanguage(langCode as any);
    setIsLangModalOpen(false);
  };

  const t = {
    chatTab: translate('nav_chat') || translate('chatTab'),
    triageTab: translate('nav_voice') || translate('triageTab'),
    reportTab: translate('nav_reports') || translate('reportTab'),
    locatorTab: translate('nav_hospitals') || translate('locatorTab'),
    historyTab: translate('nav_history') || translate('historyTab'),
    ashaTab: translate('nav_asha') || translate('ashaTab'),
    profileTab: translate('nav_profile') || translate('profileTab'),
    welcome: translate('welcome') || (UI_TRANSLATIONS as any)[selectedLanguage]?.welcome,
    chatPlaceholder: translate('chatPlaceholder') || (UI_TRANSLATIONS as any)[selectedLanguage]?.chatPlaceholder,
    sendBtn: translate('sendBtn') || (UI_TRANSLATIONS as any)[selectedLanguage]?.sendBtn,
    listening: translate('listening') || (UI_TRANSLATIONS as any)[selectedLanguage]?.listening,
    sosTitle: translate('sosTitle') || (UI_TRANSLATIONS as any)[selectedLanguage]?.sosTitle,
    callAmbulance: translate('callAmbulance') || (UI_TRANSLATIONS as any)[selectedLanguage]?.callAmbulance,
    contactAlert: translate('contactAlert') || (UI_TRANSLATIONS as any)[selectedLanguage]?.contactAlert,
    reportTitle: translate('reportTitle') || (UI_TRANSLATIONS as any)[selectedLanguage]?.reportTitle,
    reportDesc: translate('reportDesc') || (UI_TRANSLATIONS as any)[selectedLanguage]?.reportDesc,
    uploadBtn: translate('uploadBtn') || (UI_TRANSLATIONS as any)[selectedLanguage]?.uploadBtn,
    analyzeBtn: translate('analyzeBtn') || (UI_TRANSLATIONS as any)[selectedLanguage]?.analyzeBtn,
    uploadAnother: translate('uploadAnother') || (UI_TRANSLATIONS as any)[selectedLanguage]?.uploadAnother,
    reportSummary: translate('reportSummary') || (UI_TRANSLATIONS as any)[selectedLanguage]?.reportSummary,
    biomarkers: translate('biomarkers') || (UI_TRANSLATIONS as any)[selectedLanguage]?.biomarkers,
    pdfDownload: translate('pdfDownload') || (UI_TRANSLATIONS as any)[selectedLanguage]?.pdfDownload
  };

  // Citizen-facing tabs only. ASHA Portal and Charak-Kiosk are accessed
  // via dedicated routes (/asha-login and /kiosk) — not surfaced here.
  const tabs = [
    {
      id: 'chat',
      label: t.chatTab || 'AI Chat',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'triage',
      label: t.triageTab || 'Voice Triage',
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: 'report',
      label: t.reportTab || 'Report Explanation',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'hospitals',
      label: t.locatorTab || 'Hospitals',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: t.historyTab || 'Health History',
      icon: <History className="w-4 h-4" />,
    },
    // Show profile tab while auth is loading (so logged-in users don't lose the tab)
    // or when confirmed authenticated.
    ...((isAuthenticated || authLoading) ? [{
      id: 'profile',
      label: t.profileTab || 'My Profile',
      icon: <UserIcon className="w-4 h-4" />,
    }] : [])
  ];

  // Sliding tab indicator: measure the active tab and glide a single shared
  // highlight to it, so switching sections animates instead of jumping.
  const tabNavRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeTab];
      if (!el) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    // Keep the active tab visible when the tab row scrolls horizontally on phones
    const scroller = tabNavRef.current?.parentElement;
    const activeEl = tabRefs.current[activeTab];
    if (scroller && activeEl && scroller.scrollWidth > scroller.clientWidth) {
      const target = activeEl.offsetLeft - (scroller.clientWidth - activeEl.offsetWidth) / 2;
      scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
    const observer = new ResizeObserver(measure);
    if (tabNavRef.current) observer.observe(tabNavRef.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [activeTab, tabs.length, selectedLanguage]);


  return (
    <div className="min-h-screen bg-surface-bg text-content-primary flex flex-col antialiased">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur border-b border-surface-border transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/10 shrink-0">
              <Heart className="w-5 h-5 fill-white/10" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-content-primary truncate">
                SehatMitra <span className="text-brand-600">AI</span>
              </h1>
              <span className="text-[10px] text-content-muted leading-tight font-medium hidden sm:block">
                Smart Rural Healthcare Assistant
              </span>
            </div>
          </div>

          {/* Right Header Panel: Lang Dropdown + Auth triggers */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageSelector />

            {/* Desktop-only Panel (lg and above) */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Hospital Portal quick-access — always visible, zero URL typing */}
              <a
                href="/hospital"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Hospital className="w-3.5 h-3.5" /> Hospital Portal
              </a>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 bg-surface-elevated border border-surface-border rounded-lg hover:bg-surface-border text-content-primary transition-all duration-200 flex items-center justify-center shrink-0"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-brand-600 fill-brand-600/10" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500/10" />
                )}
              </button>

              {/* Authentication Action Controls */}
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
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
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
                          setActiveTab('profile');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4 text-content-muted" /> My Profile
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
                        <LogOut className="w-4 h-4" /> Sign Out
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

            {/* Mobile Hamburger menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 bg-surface-elevated border border-surface-border rounded-lg text-content-primary hover:bg-surface-border transition-colors flex items-center justify-center shrink-0"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-surface-card border-b border-surface-border py-4 px-4 flex flex-col gap-4 animate-fade-in z-30 shadow-lg">
            {/* Hospital Hub — prominent at top of mobile menu */}
            <a
              href="/hospital"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
            >
              <Hospital className="w-4 h-4" /> Hospital Portal
            </a>

            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <span className="text-xs font-bold text-content-muted uppercase">Settings & Account</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs font-bold text-content-primary"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-brand-600 fill-brand-600/10" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>

            {storedUser ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-2 bg-surface-elevated rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    {storedUser.displayName
                      ? storedUser.displayName[0].toUpperCase()
                      : storedUser.email
                      ? storedUser.email[0].toUpperCase()
                      : "U"}
                  </div>
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="text-sm font-bold truncate text-content-primary">
                      {storedUser.displayName || "Patient"}
                    </span>
                    <span className="text-xs text-content-muted truncate">
                      {storedUser.email}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveTab('profile');
                    }}
                    className="flex-1 py-2 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5" /> My Profile
                  </button>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      if (logout) await logout();
                      localStorage.removeItem("user");
                      window.location.reload();
                    }}
                    className="flex-1 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    showAuthModal('login');
                  }}
                  className="w-full py-2.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary rounded-xl text-xs font-bold transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    showAuthModal('signup');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      <OfflineBanner />

      {/* Navigation tabs */}
      <div className="relative lg:sticky lg:top-[65px] lg:z-30 border-b border-surface-border bg-surface-card">
        {/* Left and Right fade gradient indicator masks to denote overflow scrolling on mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-card to-transparent pointer-events-none z-10 lg:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-card to-transparent pointer-events-none z-10 lg:hidden" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x">
          <nav ref={tabNavRef} className="relative flex justify-start lg:justify-center gap-1 sm:gap-2 px-4 min-w-max lg:min-w-0" aria-label="Tabs" role="tablist">
            {/* Shared sliding indicator: soft pill + underline that glide to the active tab */}
            <span
              aria-hidden="true"
              className="tab-indicator absolute top-1.5 bottom-0 rounded-t-lg bg-brand-50/70 dark:bg-brand-950/30 pointer-events-none"
              style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: indicator.width ? 1 : 0 }}
            >
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-600" />
            </span>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-[1] flex items-center gap-2 py-3.5 px-4 text-xs sm:text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 rounded-t-lg shrink-0 ${
                    isActive ? 'text-brand-700 dark:text-brand-400' : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  <span className={`transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-content-muted'}`}>{tab.icon}</span>
                  {/* Invisible bold copy reserves the semibold width so tabs never resize when activated */}
                  <span className="grid">
                    <span aria-hidden="true" className="col-start-1 row-start-1 font-semibold invisible">{tab.label}</span>
                    <span className={`col-start-1 row-start-1 text-center ${isActive ? 'font-semibold' : 'font-normal'}`}>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Render Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div key={activeTab} className="tab-panel-enter">
          {activeTab === 'chat' && <HealthChat languageCode={selectedLanguage} />}
          {activeTab === 'triage' && <TriageAssistant />}
          {activeTab === 'report' && <LabReportAnalyzer languageCode={selectedLanguage} />}
          {activeTab === 'hospitals' && <HospitalLocator />}
          {activeTab === 'history' && <HistoryDashboard />}
          {activeTab === 'profile' && (isAuthenticated || authLoading) && <ProfilePage />}
        </div>
      </main>

      {/* Safe Disclaimer Footer */}
      <footer className="py-6 border-t border-surface-border bg-surface-card text-center text-xs text-content-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 SehatMitra AI. सभी अधिकार सुरक्षित हैं। AI परामर्श केवल मार्गदर्शन के लिए है, आपातकालीन स्थिति में तुरंत डॉक्टर से संपर्क करें।</p>
        </div>
      </footer>

      {/* Mobile Floating Action Button (FAB) for quick access to AI Chat/Triage */}
      {activeTab !== 'chat' && (
        <button
          onClick={() => setActiveTab('chat')}
          className="lg:hidden fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-50 p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/10"
          aria-label="Launch AI Triage Chat"
          title="Launch AI Triage Chat"
        >
          <MessageSquare className="w-6 h-6 fill-white/10" />
        </button>
      )}

      {/* Global Auth Modal portal */}
      <AuthModal isOpen={!!authModalMode} onClose={hideAuthModal} />

      {/* Language Selection Modal on first visit */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        onSelectLanguage={handleSelectLanguageFromModal}
      />

      <EmergencySOSModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

export default App;
