import React, { useState, useEffect } from 'react';
import { HealthChat } from './components/HealthChat';
import { LabReportAnalyzer } from './components/reports/LabReportAnalyzer';
import { HospitalLocator } from './components/HospitalLocator';
import { HistoryDashboard } from './components/HistoryDashboard';
import { TriageAssistant } from './components/triage/TriageAssistant';
import { AshaDashboard } from './components/dashboard/AshaDashboard';
import { ProfilePage } from './components/profile/ProfilePage';
import { AuthModal } from './components/AuthModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { BHASHINI_LANGUAGES } from './constants/languages';
import { Heart, MessageSquare, FileSpreadsheet, MapPin, History, Globe, User as UserIcon, Sun, Moon, Mic, Activity } from 'lucide-react';
import { UI_TRANSLATIONS } from './constants/translations';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import { OfflineBanner } from './components/common/OfflineBanner';

export const App = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isAuthenticated, user, logout, showAuthModal, authModalMode, hideAuthModal } = useAuth();
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const storedUser = user || JSON.parse(localStorage.getItem("user") || "null");

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
  
  // Theme Engine
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const { language: selectedLanguage, setLanguage, t: translate } = useLanguage();

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  useEffect(() => {
    const hasLang = localStorage.getItem('preferred_lang');
    if (!hasLang) {
      setIsLangModalOpen(true);
    }
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as any;
    setLanguage(lang);
  };

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

  const tabs = [
    {
      id: 'chat',
      label: t.chatTab || 'Symptom Chat',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'triage',
      label: t.triageTab || 'Voice Triage',
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: 'report',
      label: t.reportTab || 'Report Analyzer',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'hospitals',
      label: t.locatorTab || 'Hospital Locator',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: t.historyTab || 'Health History',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'asha',
      label: t.ashaTab || 'ASHA Portal',
      icon: <Activity className="w-4 h-4" />,
    },
    ...(isAuthenticated ? [{
      id: 'profile',
      label: t.profileTab || 'My Profile',
      icon: <UserIcon className="w-4 h-4" />,
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-surface-bg text-content-primary flex flex-col antialiased">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur border-b border-surface-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/10">
              <Heart className="w-5 h-5 fill-white/10" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-extrabold text-lg tracking-tight leading-none text-content-primary">
                SehatMitra <span className="text-brand-600">AI</span>
              </h1>
              <span className="text-[10px] text-content-muted leading-tight font-medium">
                Smart Rural Healthcare Assistant
              </span>
            </div>
          </div>

          {/* Right Header Panel: Lang Dropdown + Auth triggers */}
          <div className="flex items-center gap-3">
            {/* Bhashini Multi-language selection dropdown */}
            <div className="relative flex items-center bg-surface-elevated border border-surface-border rounded-lg px-2 py-1 gap-1">
              <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="bg-transparent border-none text-xs font-bold text-content-primary focus:outline-none focus:ring-0 cursor-pointer max-w-[120px] sm:max-w-none"
              >
                {BHASHINI_LANGUAGES.filter((l: any) => ['hi-IN', 'en-IN', 'pa-IN', 'te-IN'].includes(l.code)).map((lang: any) => (
                  <option key={lang.code} value={lang.code} className="bg-surface-card text-content-primary">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

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
                        setActiveTab('profile');
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
      <OfflineBanner />

      {/* Navigation tabs */}
      <div className="border-b border-surface-border bg-surface-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center -mb-px space-x-2 sm:space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'history' && !isAuthenticated) {
                      showAuthModal('login');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 py-4 px-3 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none ${
                    isActive
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-content-secondary hover:text-content-primary hover:border-surface-border'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Render Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-all duration-300">
          {activeTab === 'chat' && <HealthChat languageCode={selectedLanguage} />}
          {activeTab === 'triage' && <TriageAssistant />}
          {activeTab === 'report' && <LabReportAnalyzer languageCode={selectedLanguage} />}
          {activeTab === 'hospitals' && <HospitalLocator />}
          {activeTab === 'history' && isAuthenticated && <HistoryDashboard />}
          {activeTab === 'asha' && <AshaDashboard />}
          {activeTab === 'profile' && isAuthenticated && <ProfilePage />}
        </div>
      </main>

      {/* Safe Disclaimer Footer */}
      <footer className="py-6 border-t border-surface-border bg-surface-card text-center text-xs text-content-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 SehatMitra AI. सभी अधिकार सुरक्षित हैं। AI परामर्श केवल मार्गदर्शन के लिए है, आपातकालीन स्थिति में तुरंत डॉक्टर से संपर्क करें।</p>
        </div>
      </footer>

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
