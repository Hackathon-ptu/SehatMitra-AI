import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();

  const language = i18n.language || 'en';

  const setLanguage = (lang: Language) => {
    // If input language code is e.g. hi-IN or en-US, extract the primary sub-tag (hi or en)
    const baseLang = lang.split('-')[0];
    i18n.changeLanguage(baseLang);
    // Also save under other expected localStorage keys to avoid breaking legacy code
    localStorage.setItem('sehatmitra_lang', baseLang);
    localStorage.setItem('language', baseLang);
    localStorage.setItem('preferred_lang', baseLang);
  };

  const translate = (key: string): string => {
    return t(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
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

