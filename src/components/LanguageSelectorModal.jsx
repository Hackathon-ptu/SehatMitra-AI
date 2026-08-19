import React from 'react';
import { BHASHINI_LANGUAGES } from '../constants/languages';
import { Globe, X } from 'lucide-react';

export const LanguageSelectorModal = ({ isOpen, onClose, onSelectLanguage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-bold">अपनी भाषा चुनें (Choose Your Language)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Grid of Languages */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs sm:text-sm text-content-muted mb-4 font-semibold">
            सेहतमित्र ऐप का उपयोग करने के लिए अपनी पसंदीदा भाषा का चयन करें:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BHASHINI_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className="p-3.5 rounded-xl border border-surface-border bg-surface-elevated hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all text-left flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span className="text-sm font-extrabold">{lang.nativeName}</span>
                <span className="text-xs text-content-secondary font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;
