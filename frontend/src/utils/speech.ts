import { neuralTtsService } from '../services/api';

let activeGlobalAudio: HTMLAudioElement | null = null;
let currentSpeechRequestId = 0;

export const stopAllSpeech = () => {
  // Invalidate any in-flight async speech requests
  currentSpeechRequestId++;

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('SpeechSynthesis cancel failed:', err);
    }
  }

  if (activeGlobalAudio) {
    try {
      activeGlobalAudio.pause();
      activeGlobalAudio.currentTime = 0;
      activeGlobalAudio.src = '';
      activeGlobalAudio.onended = null;
      activeGlobalAudio.onerror = null;
    } catch (err) {
      console.warn('Error pausing active global audio:', err);
    }
    activeGlobalAudio = null;
  }
};

const getLocaleHelper = (lang: string) => {
  const primary = (lang || 'en').split('-')[0].toLowerCase();
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
  // Stop existing speech and create a new unique request ID
  stopAllSpeech();
  const thisRequestId = currentSpeechRequestId;

  if (!text || !text.trim()) {
    onEnd?.();
    return;
  }

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.resume();
    } catch (err) {
      console.warn("speechSynthesis resume failed", err);
    }
  }

  onStart?.();

  // 1. Try Microsoft Edge Neural TTS
  try {
    const data = await neuralTtsService.synthesizeSpeech(text, langCode);

    // If another speech request was triggered while fetching, ignore this result
    if (thisRequestId !== currentSpeechRequestId) {
      return;
    }

    if (data && data.audio_base64) {
      const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
      activeGlobalAudio = audio;

      audio.onended = () => {
        if (thisRequestId === currentSpeechRequestId) {
          activeGlobalAudio = null;
          onEnd?.();
        }
      };

      audio.onerror = (e) => {
        console.warn("Audio playback error", e);
        if (thisRequestId === currentSpeechRequestId) {
          activeGlobalAudio = null;
          onEnd?.();
        }
      };

      try {
        await audio.play();
        return;
      } catch (playErr) {
        console.warn("Audio play rejected, falling back to Web Speech API", playErr);
        if (thisRequestId !== currentSpeechRequestId) return;
        activeGlobalAudio = null;
      }
    }
  } catch (e) {
    console.warn("Neural TTS failed, falling back to Web Speech API", e);
  }

  // If superseded while trying TTS, do not trigger fallback
  if (thisRequestId !== currentSpeechRequestId) {
    return;
  }

  // 2. Web Speech API Fallback
  try {
    window.speechSynthesis.cancel(); // Clear queue before speaking
    const fallbackLocale = getLocaleHelper(langCode);
    const voices = window.speechSynthesis.getVoices();
    const voiceExists = voices.some(
      v => v.lang.toLowerCase().replace('_', '-') === fallbackLocale.toLowerCase()
    );

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceExists ? fallbackLocale : 'hi-IN';

    utterance.onend = () => {
      if (thisRequestId === currentSpeechRequestId) {
        onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis utterance error", e);
      if (thisRequestId === currentSpeechRequestId) {
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (synthErr) {
    console.error("Web Speech API fallback error", synthErr);
    onEnd?.();
  }
};
