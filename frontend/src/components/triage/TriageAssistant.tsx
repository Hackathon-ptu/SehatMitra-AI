import React, { useState, useEffect, useRef } from 'react';
import { apiClient, historyService } from '../../services/api';
import { playGlobalSpeech, stopAllSpeech } from '../../utils/speech';
import { Mic, MicOff, Volume2, ShieldAlert, Loader2, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES } from '../../config/languages';

interface TriageResult {
  risk_level: 'Low' | 'Medium' | 'High' | 'Emergency';
  clinical_summary: string;
  doctor_checklist: string[];
  recommended_specialist: string;
  disclaimer: string;
  engine_used: string;
  reply?: string;
  message?: string;
  is_interview_complete?: boolean;
  reasons?: string[];
  recommendation?: string;
  current_step?: number;
  collected_points?: string[];
}

export const TriageAssistant: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [collectedPoints, setCollectedPoints] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);

  const getInitialGreeting = (langCode: string): string => {
    const primary = langCode.split('-')[0].toLowerCase();
    switch (primary) {
      case 'bn':
        return 'হ্যালো! আমি সেহাতমিত্র, আপনার ক্লিনিকাল ভয়েস অ্যাসিস্ট্যান্ট। আজ আপনি কেমন অনুভব করছেন? অনুগ্রহ করে আপনার উপসর্গ বর্ণনা করুন।';
      case 'hi':
        return 'नमस्ते! मैं सेहतमित्र हूँ, आपका क्लिनिकल वॉयस असिस्टेंट। आज आप कैसा महसूस कर रहे हैं? कृपया अपने लक्षणों का वर्णन करें।';
      case 'pa':
        return 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਿਹਤਮਿੱਤਰ ਹਾਂ, ਤੁਹਾਡਾ ਕਲੀਨਿਕਲ ਵੌਇਸ ਅਸਿਸਟੈਂਟ। ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ? ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਲੱਛਣਾਂ ਦਾ ਵਰਣਨ ਕਰੋ।';
      case 'te':
        return 'నమస్తే! నేను సేహత్ మిత్రను, మీ క్లినికల్ వాయిస్ అసిస్టెంట్. ఈ రోజు మీ ఆరోగ్యం ఎలా ఉంది? దయచేసి మీ లక్షణాలను వివరించండి.';
      case 'mr':
        return 'नमस्कार! मी सेहतमित्र आहे, तुमचा क्लिनिकल व्हॉइस असिस्टंट. आज तुम्हाला कसे वाटत आहे? कृपया तुमची लक्षणे सांगा.';
      case 'ta':
        return 'வணக்கம்! நான் சேஹத்மித்ரா, உங்கள் மருத்துவ குரல் உதவியாளர். இன்று நீங்கள் எப்படி உணர்கிறீர்கள்? உங்கள் அறிகுறிகளை விவரிக்கவும்.';
      case 'gu':
        return 'નમસ્તે! હું સેહતમિત્ર છું, તમારો ક્લિનિકલ વૉઇસ આસિસ્ટન્ટ. આજે તમને કેવું લાગે છે? કૃપા કરીને તમારા લક્ષણો જણાવો.';
      case 'kn':
        return 'ನಮಸ್ತೆ! ನಾನು ಸೇಹತ್ ಮಿತ್ರ, ನಿಮ್ಮ ಕ್ಲಿನಿಕಲ್ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್. ಇಂದು ನಿಮಗೆ ಹೇಗೆನಿಸುತ್ತಿದೆ? ದಯವಿಟ್ಟು ನಿಮ್ಮ ಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ.';
      case 'ml':
        return 'നമസ്തേ! ഞാൻ സേഹത് മിത്ര, നിങ്ങളുടെ ക്ലിനിക്കൽ വോയ്‌സ് അസിസ്റ്റന്റ്. ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്? ദয়വായി നിങ്ങളുടെ ലക്ഷണങ്ങൾ വിശദീകരിക്കുക.';
      case 'or':
        return 'ନମସ୍କାର! ମୁଁ ସେହତମିତ୍ର, ଆପଣଙ୍କ କ୍ଲିନିକାଲ୍ ଭଏସ୍ ଆସିଷ୍ଟାଣ୍ଟ। ଆଜି ଆପଣ କେମିତି ଅଛନ୍ତି? ଦୟାକରି ଆପଣଙ୍କର ଲକ୍ଷଣ ବର୍ଣ୍ଣନା କରନ୍ତୁ।';
      case 'ur':
        return 'ہیلو! میں صحت مترا ہوں، آپ کا کلینیکل وائس اسسٹنٹ۔ آج آپ کیسا محسوس کر رہے ہیں؟ براہ کرਮ اپنی علامات بیان کریں۔';
      case 'en':
      default:
        return 'Hello! I am SehatMitra, your clinical voice assistant. How are you feeling today? Please describe your symptoms.';
    }
  };

  const stopAudioPlayback = () => {
    stopAllSpeech();
    setIsSpeaking(false);
  };

  const getLocale = (langCode: string): string => {
    const primary = langCode.split('-')[0].toLowerCase();
    const localeMap: Record<string, string> = {
      hi: 'hi-IN',
      pa: 'pa-IN',
      bn: 'bn-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      ur: 'ur-IN',
      en: 'en-IN'
    };
    return localeMap[primary] || 'en-IN';
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = getLocale(language);

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSymptomInput(transcript);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        if (e.error === 'not-allowed') {
          setErrorMsg(
            language.split('-')[0] === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया माइक्रोफ़ोन एक्सेस की अनुमति दें।'
              : 'Microphone permission denied. Please allow microphone access in your browser settings.'
          );
        } else {
          setErrorMsg(`Speech recognition status: ${e.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Stop audio on component unmount
  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type or select symptoms below.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      stopAudioPlayback();
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setErrorMsg(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const saveCompletedConsultation = async (result: TriageResult, convoHistory: any[]) => {
    const primaryDiag = result.recommended_specialist || result.clinical_summary || 'Clinical Triage Evaluation';
    const consultationPayload = {
      session_id: Date.now(),
      language: language.split('-')[0],
      conversation_history: convoHistory,
      risk_level: result.risk_level,
      reasons: result.reasons && result.reasons.length > 0 ? result.reasons : [result.clinical_summary || primaryDiag],
      recommendation: result.recommendation || `Please consult a ${result.recommended_specialist || 'Physician'} as soon as possible.`,
      created_at: new Date().toISOString()
    };

    // 1. Save to localStorage for instant local/guest history retrieval
    try {
      const existing = JSON.parse(localStorage.getItem('guest_consultations') || '[]');
      const updated = [consultationPayload, ...existing.slice(0, 29)];
      localStorage.setItem('guest_consultations', JSON.stringify(updated));
      window.dispatchEvent(new Event('history_updated'));
    } catch (err) {
      console.warn('Local history storage failed', err);
    }

    // 2. Save to backend database if token is available
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      try {
        await historyService.saveConsultation(consultationPayload);
      } catch (err) {
        console.warn('Backend history save error', err);
      }
    }
  };

  const handleTriageSubmit = async (customInput?: string) => {
    const textToSubmit = (customInput !== undefined ? customInput : symptomInput).trim();
    if (!textToSubmit) {
      setErrorMsg(
        language.split('-')[0] === 'hi'
          ? 'कृपया विश्लेषण शुरू करने के लिए अपने लक्षण दर्ज करें।'
          : 'Please describe your symptoms to start analysis.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    stopAudioPlayback();

    try {
      const payload = {
        message: textToSubmit,
        language: language.split('-')[0],
        history: history.map(h => ({ role: h.role, content: h.content }))
      };

      const response = await apiClient.post('/triage/chat', payload);
      const data = response.data;
      setTriageResult(data);

      const botReplyText = data.reply || data.message || data.clinical_summary || '';
      
      const updatedHistory = [
        ...history,
        { role: 'user', content: textToSubmit },
        { role: 'assistant', content: botReplyText }
      ];
      setHistory(updatedHistory);
      setCurrentStep(data.current_step || (updatedHistory.filter(h => h.role === 'user').length + 1));
      
      if (data.collected_points) {
        setCollectedPoints(data.collected_points);
      }

      // If triage is complete, save to history and check for SOS alert
      if (data.is_interview_complete === true) {
        await saveCompletedConsultation(data, updatedHistory);
        if (data.risk_level === 'Emergency' || data.risk_level === 'High') {
          window.dispatchEvent(new CustomEvent('open-sos'));
        }
      }

      // Speak question aloud
      if (botReplyText) {
        playAudio(botReplyText);
      }

      setSymptomInput('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || "Triage processing failed");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text: string, overrideLang?: string) => {
    stopAudioPlayback();
    if (!text) return;

    const targetLang = overrideLang || language;
    setIsSpeaking(true);
    await playGlobalSpeech(
      text,
      targetLang,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleLanguageChange = (newLangCode: string) => {
    stopAudioPlayback();
    setLanguage(newLangCode);
    setTriageResult(null);
    setHistory([]);
    setCurrentStep(1);
    setSymptomInput('');
  };

  const handleVoiceControl = () => {
    if (isSpeaking) {
      stopAudioPlayback();
    } else {
      const textToSpeak = triageResult?.reply || triageResult?.message || triageResult?.clinical_summary || getInitialGreeting(language);
      playAudio(textToSpeak, language);
    }
  };

  const handleReset = () => {
    stopAudioPlayback();
    setTriageResult(null);
    setSymptomInput('');
    setHistory([]);
    setCurrentStep(1);
    setCollectedPoints([]);
    setErrorMsg(null);
  };

  const handlePrintSlip = () => {
    if (!triageResult) return;

    const riskColors = {
      Low: '#10b981',
      Medium: '#f59e0b',
      High: '#f97316',
      Emergency: '#ef4444',
    };

    const isHindi = language.split('-')[0] === 'hi';
    const isPunjabi = language.split('-')[0] === 'pa';

    const riskLabel = getRiskLabel(triageResult.risk_level);

    const slipHtml = `
      <html>
        <head>
          <title>SehatMitra-AI Triage Prescription Slip</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
            .prescription-card { border: 2px solid #3b82f6; border-radius: 16px; padding: 30px; background: #fff; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
            .brand { text-align: left; }
            .brand-title { font-size: 28px; font-weight: 800; color: #1d4ed8; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 11px; text-transform: uppercase; tracking-wider; color: #6b7280; margin: 2px 0 0 0; font-weight: 600; }
            .meta-info { text-align: right; font-size: 12px; color: #4b5563; }
            .patient-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .patient-table th, .patient-table td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
            .patient-table th { background: #f3f4f6; color: #374151; font-weight: 700; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; color: white; font-weight: 850; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
            .section { margin-top: 25px; }
            .section-title { font-size: 15px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
            .bullet-list { padding-left: 20px; margin: 8px 0; }
            .bullet-list li { margin-bottom: 6px; font-size: 13.5px; color: #374151; }
            .signature-area { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 30px; }
            .sig-line { width: 200px; border-top: 1px solid #9ca3af; text-align: center; font-size: 11px; color: #6b7280; padding-top: 5px; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="prescription-card">
            <div class="header">
              <div class="brand">
                <h1 class="brand-title">SehatMitra AI</h1>
                <p class="brand-sub">Clinical Assessment & Triage Slip</p>
              </div>
              <div class="meta-info">
                <strong>Slip ID:</strong> SM-TR-${Math.floor(100000 + Math.random() * 900000)}<br/>
                <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br/>
                <strong>Time:</strong> ${new Date().toLocaleTimeString('en-IN')}
              </div>
            </div>

            <!-- Patient Profile Details Table -->
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>Age / Gender</th>
                  <th>Triage Urgency</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${user?.patient_id || 'SM-2026-GUEST'}</td>
                  <td>${user?.full_name || 'Guest Patient'}</td>
                  <td>${user?.age || 'N/A'} Yrs / ${user?.gender || 'N/A'}</td>
                  <td>
                    <span class="badge" style="background-color: ${riskColors[triageResult.risk_level] || '#6b7280'}">${riskLabel}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="section">
              <div class="section-title">${isHindi ? 'मरीज की शिकायत / Patient Chief Complaint' : isPunjabi ? 'ਮਰੀਜ਼ ਦੀ ਸ਼ਿਕਾਇਤ / Patient Chief Complaint' : 'Patient Chief Complaint'}</div>
              <p style="font-size: 13.5px; margin: 0; color: #4b5563; font-style: italic; background: #f9fafb; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 4px;">"${history.filter(h => h.role === 'user').map(h => h.content).join(' -> ')}"</p>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'क्लीनीकल ​​सारांश / Clinical Summary' : 'Clinical Summary'}</div>
              <p style="font-size: 16px; font-weight: bold; color: #1e3a8a; margin: 0;">${triageResult.clinical_summary}</p>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'अनुशंसित विशेषज्ञ / Recommended Specialist' : 'Recommended Specialist'}</div>
              <p style="font-size: 16px; font-weight: bold; color: #1e3a8a; margin: 0;">${triageResult.recommended_specialist}</p>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'डॉक्टर चेकलिस्ट / Doctor Checklist' : 'Doctor Checklist'}</div>
              <ul class="bullet-list">
                ${triageResult.doctor_checklist.map((r) => `<li>${r}</li>`).join('')}
              </ul>
            </div>

            <div class="signature-area">
              <div class="sig-line">ASHA Health Worker Sign / Stamp</div>
              <div class="sig-line">Consulting Medical Officer Sign</div>
            </div>

            <div class="footer">
              <p>${triageResult.disclaimer}</p>
              <p>Disclaimer: This triage summary is generated automatically by SehatMitra-AI to assist community health workers. It is not a clinical replacement for standard diagnostic pathology or physical consultation.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([slipHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'SehatMitra_Prescription.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const getRiskStyles = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'emergency':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-950 dark:text-rose-200',
          badge: 'bg-rose-100 text-rose-800 animate-pulse'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 text-orange-950 dark:text-orange-200',
          badge: 'bg-orange-100 text-orange-800'
        };
      case 'medium':
      case 'moderate':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-950 dark:text-amber-200',
          badge: 'bg-amber-100 text-amber-800'
        };
      case 'low':
      default:
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-950 dark:text-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800'
        };
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return t('risk_low') || 'Low';
      case 'medium':
      case 'moderate':
        return t('risk_moderate') || 'Medium';
      case 'high': return t('risk_high') || 'High';
      case 'emergency': return t('risk_emergency') || 'Emergency';
      default: return level;
    }
  };

  const isComplete = triageResult?.is_interview_complete === true;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Interactive Dialogue Interface */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col text-left gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
              {t('triage_title') || 'Voice Symptom Triage'}
            </h2>
            {(triageResult || history.length > 0) && (
              <button
                onClick={handleReset}
                className="p-2 hover:bg-surface-elevated border border-surface-border text-content-secondary rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                title="Reset Intake"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
            {t('triage_subtitle') || 'Describe symptoms via voice or text in any regional language for instant triage analysis.'}
          </p>
        </div>

        {/* Input panel card */}
        <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-elevated flex flex-col gap-5 text-left">
          
          {/* Toggle Language & Status */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-content-muted">
              Select Preferred Language
            </label>
            <div className="flex flex-wrap bg-surface-elevated border border-surface-border rounded-xl p-1.5 gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    language.split('-')[0] === lang.code ? 'bg-brand-600 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary hover:bg-surface-border'
                  }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-content-muted">
                Current Locale: <span className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded text-[11px] font-bold">{getLocale(language)}</span>
              </span>
              <div className="flex items-center gap-1.5 text-xs text-content-muted">
                <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-surface-border'}`} />
                <span>{isRecording ? (language.split('-')[0] === 'hi' ? 'सुन रहे हैं...' : 'Listening...') : 'Idle'}</span>
              </div>
            </div>
          </div>

          {!isComplete ? (
            <>
              {/* Bot Voice Question Area */}
              <div className="p-4 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 rounded-xl flex items-center justify-between gap-3 text-left">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 tracking-wider">
                    {triageResult 
                      ? (language.split('-')[0] === 'hi' ? `सक्रिय चरण #${currentStep}` : language.split('-')[0] === 'pa' ? `ਸਰਗਰਮ ਪੜਾਅ #${currentStep}` : `Active Turn #${currentStep}`)
                      : (language.split('-')[0] === 'hi' ? 'प्रारंभिक क्लिनिकल पूछताछ (Initial Prompt)' : language.split('-')[0] === 'pa' ? 'ਸ਼ੁਰੂਆਤੀ ਕਲੀਨਿਕਲ ਪੁੱਛਗਿੱਛ' : language.split('-')[0] === 'bn' ? 'প্রাথমিক ক্লিনিকাল প্রশ্ন' : language.split('-')[0] === 'te' ? 'ప్రారంభ క్లినికల్ ప్రశ్న' : 'Initial Clinical Intake Prompt')}
                  </span>
                  <p className="text-sm font-semibold text-brand-950 dark:text-brand-100">
                    {triageResult?.reply || triageResult?.message || getInitialGreeting(language)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVoiceControl}
                  className={`px-4 py-2 rounded-xl shadow-md transition-colors flex items-center justify-center shrink-0 gap-1.5 ${
                    isSpeaking ? 'bg-red-600 hover:bg-red-700 animate-pulse text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                  title={isSpeaking ? "Stop Voice" : "Replay Question"}
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  <span className="text-xs font-bold whitespace-nowrap">
                    {isSpeaking 
                      ? (language.split('-')[0] === 'hi' ? '⏹️ आवाज रोकें' : language.split('-')[0] === 'pa' ? '⏹️ ਆਵਾਜ਼ ਰੋਕੋ' : '⏹️ Stop Voice')
                      : (language.split('-')[0] === 'hi' ? '🔊 आवाज दोबारा सुनें' : language.split('-')[0] === 'pa' ? '🔊 ਸਵਾਲ ਸੁਣੋ' : language.split('-')[0] === 'bn' ? '🔊 আবার শুনুন' : language.split('-')[0] === 'te' ? '🔊 మళ్లీ వినండి' : '🔊 Replay Question')}
                  </span>
                </button>
              </div>

              {/* Big recording trigger */}
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-surface-border rounded-xl bg-surface-bg/50 gap-4">
                <button
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white scale-110 animate-pulse' 
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                </button>
                <span className="text-xs font-semibold text-content-muted">
                  {isRecording 
                    ? (language.split('-')[0] === 'hi' ? 'सुन रहे हैं... (Listening)' : language.split('-')[0] === 'pa' ? 'ਸੁਣ ਰਿਹਾ ਹੈ...' : 'Listening...') 
                    : (language.split('-')[0] === 'hi' ? 'बोलने के लिए माइक दबाएं' : language.split('-')[0] === 'pa' ? 'ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ' : 'Tap to speak symptoms')}
                </span>
              </div>

              {/* Quick Symptom Test Chips */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
                  {language.split('-')[0] === 'hi' ? 'त्वरित लक्षण चयन (Quick Symptom Presets)' : language.split('-')[0] === 'pa' ? 'ਤੁਰੰਤ ਲੱਛਣ ਚੋਣ (Quick Presets)' : 'Quick Symptom Presets'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(language.split('-')[0] === 'hi' ? [
                    { label: "🌡️ 2 दिन से तेज़ बुखार", text: "मुझे 2 दिनों से तेज़ बुखार और सिरदर्द है।" },
                    { label: "🫁 सीने में तेज दर्द व सांस फूलना", text: "सीने में बहुत तेज दर्द है और सांस लेने में भारीपन महसूस हो रहा है।" },
                    { label: "🤢 पेट दर्द और उल्टी", text: "सुबह से पेट के ऊपरी हिस्से में तेज दर्द और उल्टी हो रही है।" },
                    { label: "🤧 लगातार सूखी खांसी व खराश", text: "गले में खराश और 4 दिनों से लगातार खांसी आ रही है।" }
                  ] : language.split('-')[0] === 'pa' ? [
                    { label: "🌡️ 2 ਦਿਨਾਂ ਤੋਂ ਤੇਜ਼ ਬੁਖ਼ਾਰ", text: "ਮੈਨੂੰ 2 ਦਿਨਾਂ ਤੋਂ ਤੇਜ਼ ਬੁਖ਼ਾਰ ਅਤੇ ਸਿਰ ਦਰਦ ਹੈ।" },
                    { label: "🫁 ਛਾਤੀ ਵਿੱਚ ਦਰਦ ਤੇ ਸਾਹ ਦੀ ਤਕਲੀਫ਼", text: "ਛਾਤੀ ਵਿੱਚ ਬਹੁਤ ਤੇਜ਼ ਦਰਦ ਹੈ ਅਤੇ ਸਾਹ ਲੈਣ 'ਚ ਔਖ ਹੋ ਰਹੀ ਹੈ।" },
                    { label: "🤢 ਪੇਟ ਦਰਦ ਤੇ ਉਲਟੀ", text: "ਸਵੇਰ ਤੋਂ ਪੇਟ ਵਿੱਚ ਤੇਜ਼ ਦਰਦ ਅਤੇ ਉਲਟੀਆਂ ਆ ਰਹੀਆਂ ਹਨ।" },
                    { label: "🤧 ਲਗਾਤਾਰ ਖੰਘ", text: "ਗਲੇ ਵਿੱਚ ਖਰਾਸ਼ ਅਤੇ ਪਿਛਲੇ 3 ਦਿਨਾਂ ਤੋਂ ਖੰਘ ਹੈ।" }
                  ] : [
                    { label: "🌡️ High Fever & Shivering (2 days)", text: "I have had a high fever with body chills and headache for 2 days." },
                    { label: "🫁 Severe Chest Pain & Breathlessness", text: "I have sharp chest tightness and severe difficulty breathing." },
                    { label: "🤢 Acute Stomach Cramps & Nausea", text: "Experiencing severe abdominal pain with vomiting since morning." },
                    { label: "🤧 Persistent Cough & Sore Throat", text: "Persistent dry cough, sore throat and fatigue for 4 days." }
                  ]).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSymptomInput(item.text);
                        handleTriageSubmit(item.text);
                      }}
                      className="px-2.5 py-1.5 bg-surface-elevated hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border border-surface-border rounded-lg text-xs font-semibold text-content-secondary transition-all"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input box */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">
                  {language.split('-')[0] === 'hi' ? 'आपका उत्तर' : 'Your Answer'}
                </label>
                <textarea
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  rows={3}
                  placeholder="Your transcribed speech or typed answer will appear here..."
                  className="w-full px-4 py-3 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                onClick={handleTriageSubmit}
                disabled={isLoading}
                variant="primary"
                className="w-full py-2.5 font-bold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing response...</span>
                  </>
                ) : (
                  <span>Submit Answer</span>
                )}
              </Button>
            </>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center flex flex-col items-center gap-2">
              <Sparkles className="w-8 h-8 text-emerald-600" />
              <h3 className="text-base font-bold text-emerald-950">Clinical Intake Completed</h3>
              <p className="text-xs text-emerald-700">
                All diagnostic questions have been successfully answered. The provisional doctor slip is unlocked on the right.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Dynamic Intake Progress or Completed Doctor Slip */}
      <div className="w-full lg:w-[380px] shrink-0">
        {!isComplete ? (
          (collectedPoints.length === 0 && (!triageResult || !triageResult.reasons || triageResult.reasons.length === 0)) ? (
            <div className="w-full border border-surface-border bg-surface-card rounded-2xl p-6 flex flex-col gap-4 justify-center items-center shadow-lg h-[250px] animate-fade-in text-center">
              <Sparkles className="w-8 h-8 text-content-muted animate-pulse" />
              <h3 className="text-base font-bold">{t('no_symptoms_evaluated') || 'No Symptoms Evaluated'}</h3>
              <p className="text-xs text-content-secondary leading-relaxed px-4 text-center">
                {t('speak_or_type_symptoms') || 'Speak or type symptoms to start clinical interviewing.'}
              </p>
            </div>
          ) : (
            <div className="w-full border border-surface-border bg-surface-card rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg h-fit animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                  Clinical Intake Ongoing
                </span>
              </div>
              <h3 className="text-lg font-bold">
                Active Turn #{currentStep}
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                We are dynamically asking follow-up questions to gather diagnostic metrics.
              </p>

              {/* Live Symptom Notes */}
              {collectedPoints && collectedPoints.length > 0 && (
                <div className="border-t border-surface-border pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-2">
                    Live Symptom Notes
                  </span>
                  <ul className="list-disc pl-5 text-xs text-content-secondary space-y-1.5">
                    {collectedPoints.map((point, idx) => point && point.trim() && (
                      <li key={idx} className="leading-relaxed">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cumulative Reasons */}
              {triageResult && triageResult.reasons && triageResult.reasons.length > 0 && triageResult.reasons.some(r => r && r.trim().length > 0) && (
                <div className="border-t border-surface-border pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-2">
                    Clinical Notes Recorded
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {triageResult.reasons.map((reason, idx) => reason && reason.trim() && (
                      <p key={idx} className="text-[11px] leading-relaxed text-content-secondary bg-surface-bg/50 px-2.5 py-1.5 rounded border border-surface-border">
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          triageResult && (() => {
            const riskStyles = getRiskStyles(triageResult.risk_level);
            return (
              <div className={`w-full border-2 rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg ${riskStyles.bg} animate-fade-in`}>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyles.badge}`}>
                    {getRiskLabel(triageResult.risk_level)}
                  </span>
                  <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold">
                    Primary Health Risk Report
                  </h3>
                  <span className="text-[11px] text-content-muted">
                    Generated: Just now
                  </span>
                </div>

                <div className="space-y-3.5 border-t border-surface-border pt-4 text-content-primary">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                      Specialist Recommendation
                    </span>
                    <p className="text-sm font-semibold">{triageResult.recommended_specialist}</p>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                      Clinical Notes Summary
                    </span>
                    <ul className="list-disc pl-5 text-xs text-content-secondary space-y-1">
                      {triageResult.reasons?.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                      Recommendation
                    </span>
                    <p className="text-xs leading-relaxed text-content-secondary">{triageResult.recommendation}</p>
                  </div>

                  {triageResult.doctor_checklist && triageResult.doctor_checklist.length > 0 && (
                    <div className="p-3 bg-surface-card border border-surface-border rounded-lg flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                        Checklist for Doctor / Patient
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {triageResult.doctor_checklist.map((item, idx) => (
                          <label key={idx} className="flex items-start gap-2 text-xs text-content-secondary cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="mt-0.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {triageResult.disclaimer && (
                    <div className="p-3 rounded-lg bg-surface-card border border-surface-border flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-[10px] text-content-secondary leading-normal">{triageResult.disclaimer}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    📄 Download Doctor Slip (PDF)
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>

    </div>
  );
};
