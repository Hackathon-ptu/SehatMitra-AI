import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVAILABLE_LANGUAGES, STORAGE_KEY_LANGUAGE } from '../data/languageData';
import { LanguageHeader } from '../components/language/LanguageHeader';
import { LanguageIntro } from '../components/language/LanguageIntro';
import { LanguageSelector } from '../components/language/LanguageSelector';
import { LanguageActions } from '../components/language/LanguageActions';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const LanguagePage: React.FC = () => {
  const [selectedCode, setSelectedCode] = useState<string>('en');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
      if (saved && AVAILABLE_LANGUAGES.some((l) => l.code === saved)) {
        setSelectedCode(saved);
      }
    } catch {
      // Graceful fallback if localStorage is unavailable
      setSelectedCode('en');
    }
  }, []);

  const handleContinue = () => {
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, selectedCode);
    } catch {
      // Graceful fallback to in-memory state
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary transition-colors">
      <LanguageHeader />

      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 lg:py-16">
        <ScrollReveal className="w-full max-w-[560px]">
          <div className="w-full bg-surface-card border border-surface-border rounded-lg p-6 sm:p-8 lg:p-10 shadow-elevated flex flex-col items-center">
            <LanguageIntro />
            <LanguageSelector
              languages={AVAILABLE_LANGUAGES}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
            />
            <LanguageActions onContinue={handleContinue} />
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
};
