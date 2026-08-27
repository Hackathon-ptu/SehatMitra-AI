import { neuralTtsService } from '../services/api';

let activeGlobalAudio: HTMLAudioElement | null = null;

export const stopAllSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeGlobalAudio) {
    try {
      activeGlobalAudio.pause();
    } catch (err) {
      console.error('Error pausing active global audio:', err);
    }
    activeGlobalAudio = null;
  }
};

const getLocaleHelper = (lang: string) => {
  const primary = lang.split('-')[0].toLowerCase();
  switch (primary) {
    case 'en': return 'en-IN';
    case 'hi': return 'hi-IN';
    case 'bn': return 'bn-IN';
    case 'te': return 'te-IN';
    case 'mr': return 'mr-IN';
    case 'ta': return 'ta-IN';
    case 'gu': return 'gu-IN';
    case 'kn': return 'kn-IN';
    case 'ml': return 'ml-IN';
    case 'pa': return 'pa-IN';
    case 'or': return 'or-IN';
    case 'ur': return 'ur-IN';
    default: return 'en-IN';
  }
};

export const playGlobalSpeech = async (
  text: string,
  langCode: string,
  onStart?: () => void,
  onEnd?: () => void
) => {
  stopAllSpeech();
  if (!text) return;

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.resume();
    } catch (err) {
      console.warn("speechSynthesis resume failed", err);
    }
  }

  // 1. Try Microsoft Edge Neural TTS
  try {
    onStart?.();
    const data = await neuralTtsService.synthesizeSpeech(text, langCode);
    if (data && data.audio_base64) {
      const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
      activeGlobalAudio = audio;
      audio.onended = () => {
        onEnd?.();
        activeGlobalAudio = null;
      };
      audio.onerror = () => {
        onEnd?.();
        activeGlobalAudio = null;
      };
      try {
        await audio.play();
        return;
      } catch (playErr) {
        console.warn("Audio play rejected, falling back to Web Speech API", playErr);
        activeGlobalAudio = null;
        // fall through to native fallback
      }
    }
  } catch (e) {
    console.warn("Neural TTS failed, falling back to Web Speech API", e);
  }

  // 2. Web Speech API Fallback
  const fallbackLocale = getLocaleHelper(langCode);
  const voices = window.speechSynthesis.getVoices();
  const voiceExists = voices.some(v => v.lang.toLowerCase().replace('_', '-') === fallbackLocale.toLowerCase());

  const utterance = new SpeechSynthesisUtterance(text);
  // If native voice is missing, fallback to hi-IN
  utterance.lang = voiceExists ? fallbackLocale : 'hi-IN';
  utterance.onend = () => {
    onEnd?.();
  };
  utterance.onerror = () => {
    onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
};
