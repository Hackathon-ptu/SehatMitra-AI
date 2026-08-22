export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  popular?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', popular: true },
  { code: 'en', name: 'English', nativeName: 'English', popular: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'கன்னட' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const APP_METADATA = {
  name: 'SehatMitra AI',
  tagline: 'Your Intelligent Healthcare Companion for Quick Assessment & Guidance',
  version: '0.1.0-phase0',
};
