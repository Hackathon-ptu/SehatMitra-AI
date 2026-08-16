import React from 'react';
import { LanguageItem } from '../../data/languageData';
import { LanguageOption } from './LanguageOption';

export interface LanguageSelectorProps {
  languages: LanguageItem[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedCode,
  onSelect,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = languages.findIndex((l) => l.code === selectedCode);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % languages.length;
      onSelect(languages[nextIndex].code);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + languages.length) % languages.length;
      onSelect(languages[prevIndex].code);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Language options"
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-3 w-full"
    >
      {languages.map((lang) => (
        <LanguageOption
          key={lang.code}
          language={lang}
          isSelected={selectedCode === lang.code}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
