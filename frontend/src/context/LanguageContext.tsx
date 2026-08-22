import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import pa from '../locales/pa.json';
import te from '../locales/te.json';

export type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<string, string>> = {
  'en-US': en,
  'en-IN': en,
  'hi-IN': hi,
  'pa-IN': pa,
  'te-IN': te
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sehatmitra_lang') || localStorage.getItem('preferred_lang') || localStorage.getItem('language') || 'hi-IN';
    if (saved === 'hi-IN' || saved === 'en-US' || saved === 'en-IN' || saved === 'pa-IN' || saved === 'te-IN') {
      return saved;
    }
    if (saved.startsWith('hi')) return 'hi-IN';
    if (saved.startsWith('pa')) return 'pa-IN';
    if (saved.startsWith('te')) return 'te-IN';
    if (saved.startsWith('en')) return 'en-US';
    return 'en-US';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sehatmitra_lang', lang);
    localStorage.setItem('language', lang);
    localStorage.setItem('preferred_lang', lang);
  };

  const t = (key: string): string => {
    const langTranslations = translations[language] || translations['en-US'];
    // Fall back directly to en.json (translations['en-US']) if the key is missing or blank
    const translated = langTranslations[key];
    if (translated !== undefined && translated !== null && translated !== '') {
      return translated;
    }
    const fallbackTranslated = translations['en-US'][key];
    return fallbackTranslated !== undefined && fallbackTranslated !== null && fallbackTranslated !== '' ? fallbackTranslated : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
