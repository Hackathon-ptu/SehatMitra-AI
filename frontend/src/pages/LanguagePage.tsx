import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageHeader } from '../components/language/LanguageHeader';
import { LanguageIntro } from '../components/language/LanguageIntro';
import { LanguageSelector } from '../components/language/LanguageSelector';
import { LanguageActions } from '../components/language/LanguageActions';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const LanguagePage: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedCode, setSelectedCode] = useState<string>('en');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sehatmitra_lang') || localStorage.getItem('preferred_lang') || 'en';
      setSelectedCode(saved);
    } catch {
      setSelectedCode('en');
    }
  }, []);

  const handleContinue = () => {
    try {
      i18n.changeLanguage(selectedCode);
      localStorage.setItem('sehatmitra_lang', selectedCode);
      localStorage.setItem('language', selectedCode);
      localStorage.setItem('preferred_lang', selectedCode);
    } catch {
      // Graceful fallback
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
              mode="grid"
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
