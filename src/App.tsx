import React, { useState } from 'react';
import { HealthChat } from './components/HealthChat';
import { ReportAnalyzer } from './components/ReportAnalyzer';
import { HospitalLocator } from './components/HospitalLocator';
import { Heart, MessageSquare, FileSpreadsheet, MapPin } from 'lucide-react';

export const App = () => {
  const [activeTab, setActiveTab] = useState('chat');

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
  ];

  return (
    <div className="min-h-screen bg-surface-bg text-content-primary flex flex-col antialiased">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur border-b border-surface-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
          <div className="text-xs font-semibold text-content-secondary px-3 py-1 rounded-full bg-brand-50 border border-brand-200">
            ग्रामीण स्वास्थ्य साथी
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
                  onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'chat' && <HealthChat />}
          {activeTab === 'report' && <ReportAnalyzer />}
          {activeTab === 'hospitals' && <HospitalLocator />}
        </div>
      </main>

      {/* Safe Disclaimer Footer */}
      <footer className="py-6 border-t border-surface-border bg-surface-card text-center text-xs text-content-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 SehatMitra AI. सभी अधिकार सुरक्षित हैं। AI परामर्श केवल मार्गदर्शन के लिए है, आपातकालीन स्थिति में तुरंत डॉक्टर से संपर्क करें।</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
