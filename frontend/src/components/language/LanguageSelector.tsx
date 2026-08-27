import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { LANGUAGES } from '../../config/languages';

export interface LanguageSelectorProps {
  mode?: 'dropdown' | 'grid';
  selectedCode?: string;
  onSelect?: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  mode = 'dropdown',
  selectedCode,
  onSelect,
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguageCode = selectedCode || i18n.language || 'en';
  const currentLanguage = LANGUAGES.find((l) => l.code === currentLanguageCode) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    if (onSelect) {
      onSelect(code);
    } else {
      i18n.changeLanguage(code);
      localStorage.setItem('sehatmitra_lang', code);
      localStorage.setItem('language', code);
      localStorage.setItem('preferred_lang', code);
    }
    setIsOpen(false);
  };

  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 w-full max-w-full">
        {LANGUAGES.map((lang) => {
          const isSelected = currentLanguageCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all text-center border-2 ${
                isSelected
                  ? 'bg-brand-50 border-brand-500 text-brand-900 font-semibold dark:bg-brand-950/20 dark:border-brand-600 dark:text-brand-300'
                  : 'border-surface-border bg-surface-card hover:bg-surface-elevated text-content-primary'
              }`}
            >
              <span className="text-base font-semibold">{lang.nativeName}</span>
              <span className="text-xs text-content-muted">{lang.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg hover:bg-surface-border text-content-primary transition-all duration-200 text-xs font-bold shadow-sm focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
        <span>{currentLanguage.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-content-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[90vw] origin-top-right rounded-xl bg-surface-card border border-surface-border shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transition-all p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-2 px-1">
            Select Language / भाषा चुनें
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = currentLanguageCode === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`flex flex-col items-start p-2 rounded-lg transition-all text-left border ${
                    isSelected
                      ? 'bg-brand-50 border-brand-500 text-brand-900 font-semibold dark:bg-brand-950/20 dark:border-brand-600 dark:text-brand-300'
                      : 'border-transparent hover:bg-surface-elevated text-content-primary'
                  }`}
                >
                  <span className="text-xs font-semibold">{lang.nativeName}</span>
                  <span className="text-[10px] text-content-muted">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
