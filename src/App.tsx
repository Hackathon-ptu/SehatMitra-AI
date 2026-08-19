import React, { useState, useEffect } from 'react';
import { HealthChat } from './components/HealthChat';
import { ReportAnalyzer } from './components/ReportAnalyzer';
import { HospitalLocator } from './components/HospitalLocator';
import { HistoryDashboard } from './components/HistoryDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { useAuth } from './context/AuthContext';
import { BHASHINI_LANGUAGES } from './constants/languages';
import { Heart, MessageSquare, FileSpreadsheet, MapPin, History, Globe, LogOut, User as UserIcon } from 'lucide-react';

export const App = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isAuthenticated, user, logout, showAuthModal } = useAuth();
  
  // Load initial language from localStorage or default to hi-IN
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('preferred_lang') || localStorage.getItem('language') || 'hi-IN';
  });

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  useEffect(() => {
    const hasLang = localStorage.getItem('preferred_lang');
    if (!hasLang) {
      setIsLangModalOpen(true);
    }
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    localStorage.setItem('language', lang);
    localStorage.setItem('preferred_lang', lang);
  };

  const handleSelectLanguageFromModal = (langCode: string) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('language', langCode);
    localStorage.setItem('preferred_lang', langCode);
    setIsLangModalOpen(false);
  };

  const tabs = [
    {
      id: 'chat',
      label: 'Symptom Chat (AI परामर्श)',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'report',
      label: 'Lab Report OCR (जांच रिपोर्ट)',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'hospitals',
      label: 'Find Hospitals (अस्पताल खोजें)',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Health History (इतिहास)',
      icon: <History className="w-4 h-4" />,
    },
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
                {BHASHINI_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-surface-card text-content-primary">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Authentication Action Controls */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[100px]">{user?.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showAuthModal('login')}
                  className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-border text-content-primary border border-surface-border rounded-lg text-xs font-bold transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => showAuthModal('signup')}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
          {activeTab === 'report' && <ReportAnalyzer />}
          {activeTab === 'hospitals' && <HospitalLocator />}
          {activeTab === 'history' && isAuthenticated && <HistoryDashboard />}
        </div>
      </main>

      {/* Safe Disclaimer Footer */}
      <footer className="py-6 border-t border-surface-border bg-surface-card text-center text-xs text-content-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 SehatMitra AI. सभी अधिकार सुरक्षित हैं। AI परामर्श केवल मार्गदर्शन के लिए है, आपातकालीन स्थिति में तुरंत डॉक्टर से संपर्क करें।</p>
        </div>
      </footer>

      {/* Global Auth Modal portal */}
      <AuthModal />

      {/* Language Selection Modal on first visit */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        onSelectLanguage={handleSelectLanguageFromModal}
      />
    </div>
  );
};

export default App;
