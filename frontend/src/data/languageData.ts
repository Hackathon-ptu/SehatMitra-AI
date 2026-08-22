export interface LanguageItem {
  code: string;
  nativeName: string;
  englishName: string;
}

export const AVAILABLE_LANGUAGES: LanguageItem[] = [
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
  },
  {
    code: 'pa',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
  },
];

export const STORAGE_KEY_LANGUAGE = 'sehatmitra-language';
