import React, { useState, useEffect, useRef } from 'react';
import { healthService, bhashiniService } from '../services/api';
import { Mic, MicOff, Send, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { BHASHINI_LANGUAGES } from '../constants/languages';
import { useAuth } from '../context/AuthContext';
import { generateConsultationSlip } from '../utils/pdfGenerator';
import { UI_TRANSLATIONS } from '../constants/translations';
import { useLanguage } from '../context/LanguageContext';

export const HealthChat = ({ languageCode = 'hi-IN' }) => {
  const { t } = useLanguage();
  const selectedLangConfig = BHASHINI_LANGUAGES.find(l => l.code === languageCode) || BHASHINI_LANGUAGES[0];
  const bhashiniCode = selectedLangConfig.bhashiniCode;

  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  const handleDownloadSlip = () => {
    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SehatMitra Medical Slip - ${user?.abha_id || 'SM-2026'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: bold; background: #fef3c7; color: #d97706; }
          .section { margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SehatMitra-AI — Clinical Consultation Slip</h2>
          <p><strong>Patient ID:</strong> ${user?.abha_id || 'SM-2026-1RXBY'} | <strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div class="section">
          <span class="badge">${riskData?.risk_level?.toUpperCase() || 'MODERATE RISK'}</span>
          <h3>Diagnosis & Summary</h3>
          <p>${riskData?.primary_diagnosis || riskData?.provisional_diagnosis || 'Symptom analysis completed.'}</p>
        </div>
        <div class="section">
          <h3>Key Reasons & Observations</h3>
          <p>${riskData?.clinical_reasons?.join(', ') || riskData?.reasons?.join(', ') || 'Monitored routine symptoms.'}</p>
        </div>
        <div class="section">
          <h3>Prescribed Action / Remedies</h3>
          <p>${riskData?.recommendation || riskData?.home_remedies?.join(', ') || 'Consult nearby PHC.'}</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([slipHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SehatMitra_Slip_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [sessionId, setSessionId] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const messagesEndRef = useRef(null);

  // Synchronize initial greeting based on the selected languageCode
  useEffect(() => {
    const t = UI_TRANSLATIONS[languageCode] || UI_TRANSLATIONS['hi-IN'] || UI_TRANSLATIONS['en-IN'];
    const welcomeText = t.welcome;

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setSessionId(null);
    setIsCompleted(false);
    setRiskData(null);
  }, [languageCode]);

  // Initialize Web Speech API Recognition dynamically when languageCode updates
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = languageCode;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [languageCode]);

  // Speech Synthesis (TTS) Helper Function with Bhashini fallback
  const speakText = async (msg) => {
    try {
      // 1. Try Bhashini synthesis first
      const data = await bhashiniService.synthesizeSpeech(msg.text, bhashiniCode);
      if (data && data.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.onended = () => setSpeakingMsgId(null);
        audio.play();
        return audio;
      }
    } catch (e) {
      console.warn("Bhashini TTS failed, falling back to Web Speech API", e);
    }

    // 2. Fall back to standard browser synthesis
    if (!window.speechSynthesis) return null;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(msg.text);
    utterance.lang = languageCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.includes(bhashiniCode) || v.lang.toLowerCase().includes(bhashiniCode));
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
    return null;
  };

  const [activeAudioElement, setActiveAudioElement] = useState(null);

  const stopSpeaking = () => {
    if (activeAudioElement) {
      activeAudioElement.pause();
      setActiveAudioElement(null);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // State to track currently playing message
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const togglePlaySpeech = async (msg) => {
    if (speakingMsgId === msg.id) {
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msg.id);
      const audioObj = await speakText(msg);
      if (audioObj) {
        setActiveAudioElement(audioObj);
      }
    }
  };

  // Clean speaking state when synthesis finishes
  useEffect(() => {
    if (window.speechSynthesis) {
      const handleEnd = () => setSpeakingMsgId(null);
      window.speechSynthesis.addEventListener('end', handleEnd);
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.removeEventListener('end', handleEnd);
        }
      };
    }
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleSpeech = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser for this language.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!userInput.trim() || loading || isCompleted) return;

    const userText = userInput.trim();
    setUserInput('');

    // Append user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const payload = {
        symptoms_data: {
          user_input_summary: userText,
          dialogue_history: updatedMessages.map(m => ({
            sender: m.sender === 'user' ? 'Patient' : 'Doctor',
            text: m.text
          })),
          detected_symptoms: []
        },
        language: selectedLangConfig.code.split('-')[0],
      };

      const response = await healthService.getTriageChatResponse(payload);

      // Append bot response (doctor_reply)
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.doctor_reply || "I have received your message.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Update right-hand Primary Health Risk Report card live only if it is a clinical response
      if (response.risk_level && response.risk_level !== 'none') {
        setRiskData({
          risk_level: response.risk_level,
          primary_diagnosis: response.primary_diagnosis,
          reasons: response.reasons,
          home_remedies: response.remedies,
          recommendation: response.recommendation,
          disclaimer: response.disclaimer,
          clinical_reasons: response.reasons
        });
      }

      const normalizedRisk = response.risk_level?.toLowerCase();
      if (normalizedRisk === 'emergency' || normalizedRisk === 'high') {
        window.dispatchEvent(new CustomEvent('open-sos'));
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: bhashiniCode === 'en' 
          ? 'Sorry, a network connection error has occurred. Please try again.' 
          : 'माफ़ कीजियेगा, नेटवर्क में कुछ तकनीकी त्रुटि आ गई है। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    const welcomeText = t('welcome') || 'Welcome to SehatMitra.';

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSessionId(null);
    setUserInput('');
    setIsCompleted(false);
    setRiskData(null);
  };

  const getRiskStyles = (level) => {
    const lvl = level?.toLowerCase();
    switch (lvl) {
      case 'emergency':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-950 dark:text-red-200',
          badge: 'bg-red-500 text-white',
          label: t('risk_emergency') || 'Emergency Risk',
        };
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-950 dark:text-red-200',
          badge: 'bg-red-500 text-white',
          label: t('risk_high') || 'High Risk',
        };
      case 'moderate':
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200',
          badge: 'bg-amber-500 text-white',
          label: t('risk_moderate') || 'Moderate Risk',
        };
      case 'low':
      case 'green':
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-950 dark:text-green-200',
          badge: 'bg-green-500 text-white',
          label: t('risk_low') || 'Low Risk',
        };
    }
  };

  const riskStyles = riskData ? getRiskStyles(riskData.risk_level) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto p-4 animate-fade-in">
      {/* Left Column: Chat Area */}
      <div className="flex-1 flex flex-col h-[600px] bg-surface-card border border-surface-border rounded-2xl shadow-xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">
              SM
            </div>
            <div className="text-left">
              <h2 className="font-bold text-base leading-tight">
                {t('chatTab') || 'Symptom Chat'}
              </h2>
              <span className="text-[11px] text-white/80">
                {t('chat_subtitle') || 'AI Powered Triage Assistant'}
              </span>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title={t('reset') || 'Reset'}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">{t('reset') || 'Reset'}</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-bg/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4.5 py-3 text-sm shadow-sm leading-relaxed relative group ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-surface-card text-content-primary border border-surface-border rounded-tl-none'
                }`}
              >
                <p className="text-left whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-between gap-4 mt-1.5 border-t border-surface-border/20 pt-1">
                  {msg.sender === 'bot' ? (
                    <button
                      onClick={() => togglePlaySpeech(msg)}
                      className="text-[10px] flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700"
                    >
                      {speakingMsgId === msg.id ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-0.5" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <span>🔊 Speak</span>
                      )}
                    </button>
                  ) : <div />}
                  <span
                    className={`block text-[10px] font-medium ${
                      msg.sender === 'user' ? 'text-white/70' : 'text-content-muted'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-surface-card text-content-muted border border-surface-border rounded-2xl rounded-tl-none px-4.5 py-3 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs font-semibold ml-1">
                  {t('listening') || 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-surface-border bg-surface-card">
          <div className="flex items-center gap-2 bg-surface-bg border border-surface-border rounded-xl p-2 transition-colors focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20">
            <button
              type="button"
              onClick={toggleSpeech}
              className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-surface-elevated text-content-secondary hover:text-brand-600 hover:bg-brand-50 border border-surface-border'
              }`}
              title={isListening ? 'Stop' : `Voice Input (${selectedLangConfig.name})`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loading || isCompleted}
              placeholder={
                isListening
                  ? t('listening') || 'Listening...'
                  : isCompleted
                  ? 'Completed.'
                  : t('chatPlaceholder') || 'Type your symptoms here...'
              }
              className="flex-1 bg-transparent border-0 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none py-2 px-1"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || loading || isCompleted}
              className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${
                userInput.trim() && !loading && !isCompleted
                  ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
                  : 'bg-surface-elevated text-content-disabled cursor-not-allowed border border-surface-border'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {isListening && (
            <p className="text-[11px] text-red-500 font-semibold mt-2 animate-pulse text-left">
              🎙️ {t('listening') || 'Listening...'} ({selectedLangConfig.name})
            </p>
          )}
        </form>
      </div>

      {/* Right Column: Triage Result Card or Placeholder */}
      {riskData && (
        riskData.risk_level === 'initial' || riskData.risk_level === 'none' ? (
          <div className="w-full lg:w-[400px] border border-dashed border-surface-border bg-surface-card rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-md h-fit self-start">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-600 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-bold text-content-primary">
                {t('risk_report_placeholder_title') || 'Awaiting Symptoms'}
              </h3>
              <p className="text-xs text-content-muted leading-relaxed max-w-[280px]">
                {t('risk_report_placeholder_desc') || 'Describe your symptoms in the chat to generate your health risk assessment.'}
              </p>
            </div>
          </div>
        ) : (
          riskStyles && (
            <div className={`w-full lg:w-[400px] border-2 rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg ${riskStyles.bg}`}>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyles.badge}`}>
                  {riskStyles.label}
                </span>
                <Sparkles className="w-5 h-5 text-brand-600" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">
                  {t('primary_health_risk_report') || 'Primary Health Risk Report'}
                </h3>
                <span className="text-xs text-content-muted">
                  {t('generated_just_now') || 'Generated: Just now'}
                </span>
              </div>

              <div className="space-y-3.5 border-t border-surface-border pt-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                    {t('reasons_title') || 'Reasons'}
                  </span>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {riskData.reasons?.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                    {t('recommendation_title') || 'Recommendation'}
                  </span>
                  <p className="text-sm font-semibold leading-relaxed">{riskData.recommendation}</p>
                </div>

                {riskData.disclaimer && (
                  <div className="p-3 rounded-lg bg-surface-card border border-surface-border flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-content-secondary leading-normal">{riskData.disclaimer}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadSlip}
                  className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  📄 {t('download_doctor_slip') || 'Download Doctor Slip (PDF)'}
                </button>
              </div>
            </div>
          )
        )
      )}
    </div>
  );
};

export default HealthChat;
