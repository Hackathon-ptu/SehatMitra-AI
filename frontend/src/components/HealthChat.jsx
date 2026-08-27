import React, { useState, useEffect, useRef } from 'react';
import { healthService, historyService } from '../services/api';
import { playGlobalSpeech, stopAllSpeech } from '../utils/speech';
import { Mic, MicOff, Send, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { BHASHINI_LANGUAGES } from '../constants/languages';
import { useAuth } from '../context/AuthContext';
import { generateConsultationSlip } from '../utils/pdfGenerator';
import { UI_TRANSLATIONS } from '../constants/translations';
import { useLanguage } from '../context/LanguageContext';

export const HealthChat = ({ languageCode = 'hi-IN' }) => {
  const { t } = useLanguage();
  const selectedLangConfig = BHASHINI_LANGUAGES.find(l => l.code === languageCode) || BHASHINI_LANGUAGES.find(l => l.code.startsWith(languageCode)) || BHASHINI_LANGUAGES[0];
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
  const [interviewStatus, setInterviewStatus] = useState('in_progress');
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(6);
  const [collectedPoints, setCollectedPoints] = useState([]);

  const messagesEndRef = useRef(null);

  // Synchronize initial greeting based on the selected languageCode
  useEffect(() => {
    const welcomeText = t('welcome') || 'Hello! I am your SehatMitra AI health assistant. What symptoms are you experiencing?';

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
    setInterviewStatus('in_progress');
    setCurrentStep(1);
    setTotalSteps(6);
    setCollectedPoints([]);
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

  const stopSpeaking = () => {
    stopAllSpeech();
    setSpeakingMsgId(null);
  };

  // State to track currently playing message
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const togglePlaySpeech = (msg) => {
    if (speakingMsgId === msg.id) {
      stopSpeaking();
    } else {
      setSpeakingMsgId(msg.id);
      playGlobalSpeech(
        msg.text,
        languageCode,
        undefined,
        () => setSpeakingMsgId(null)
      );
    }
  };

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
        message: userText,
        language: selectedLangConfig.code.split('-')[0],
        history: updatedMessages.slice(0, -1).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      };

      const response = await healthService.getDualAiTriage(payload);

      // Append bot response
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.reply || response.message || response.clinical_summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Update interview status and progress states
      if (response.interview_status) setInterviewStatus(response.interview_status);
      if (response.current_step) setCurrentStep(response.current_step);
      if (response.total_steps) setTotalSteps(response.total_steps);
      if (response.collected_points) setCollectedPoints(response.collected_points);

      // Only update triage results if reasons list has non-empty items
      const hasReasons = response.reasons && response.reasons.length > 0 && response.reasons.some(r => r && r.trim().length > 0);
      if (hasReasons && response.risk_level) {
        const triageReasons = response.reasons.filter(r => r && r.trim().length > 0);
        setRiskData({
          risk_level: response.risk_level,
          primary_diagnosis: response.recommended_specialist || 'Consult Specialist',
          reasons: triageReasons,
          recommendation: response.recommendation || `Please consult a ${response.recommended_specialist || 'Physician'} as soon as possible.`,
          disclaimer: response.disclaimer,
          clinical_reasons: triageReasons,
          doctor_checklist: response.doctor_checklist || [],
          engine_used: response.engine_used
        });

        if (response.is_interview_complete === true) {
          setIsCompleted(true);
          const normalizedRisk = response.risk_level?.toLowerCase();
          if (normalizedRisk === 'emergency' || normalizedRisk === 'high') {
            window.dispatchEvent(new CustomEvent('open-sos'));
          }

          // Auto-save triage session if user is logged in
          const token = localStorage.getItem('token') || localStorage.getItem('access_token');
          if (token && user) {
            const conversation_history = updatedMessages.map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            }));
            const savePayload = {
              session_id: Date.now(),
              language: selectedLangConfig.code.split('-')[0],
              conversation_history,
              risk_level: response.risk_level,
              reasons: triageReasons,
              recommendation: response.recommendation || `Please consult a ${response.recommended_specialist || 'Physician'} as soon as possible.`
            };
            historyService.saveConsultation(savePayload).catch(err => {
              console.error('Failed to auto-save consultation to history', err);
            });
          }
        } else {
          setIsCompleted(false);
        }
      } else {
        setRiskData(null);
        setIsCompleted(false);
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      console.error("Chat API Error details:", {
        status: statusCode,
        data: responseData,
        message: err.message
      });

      let errorText = bhashiniCode === 'en' 
        ? 'Sorry, a network connection error has occurred. Please try again.' 
        : 'माफ़ कीजियेगा, नेटवर्क में कुछ तकनीकी त्रुटि आ गई है। कृपया पुनः प्रयास करें।';

      if (statusCode === 500 || statusCode === 503) {
        errorText = "AI service is currently initializing. Please check your API keys in backend .env.";
      }

      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: errorText,
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
    setInterviewStatus('in_progress');
    setCurrentStep(1);
    setTotalSteps(6);
    setCollectedPoints([]);
  };

  const getRiskStyles = (level) => {
    const lvl = level?.toLowerCase();
    switch (lvl) {
      case 'emergency':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-950 dark:text-red-200',
          badge: 'bg-rose-100 text-rose-800 animate-pulse',
          label: t('risk_emergency') || 'Emergency Risk',
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 text-orange-950 dark:text-orange-200',
          badge: 'bg-orange-100 text-orange-800',
          label: t('risk_high') || 'High Risk',
        };
      case 'moderate':
      case 'medium':
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-950 dark:text-amber-200',
          badge: 'bg-amber-100 text-amber-800',
          label: t('risk_moderate') || 'Moderate Risk',
        };
      case 'low':
      case 'green':
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 text-green-950 dark:text-green-200',
          badge: 'bg-emerald-100 text-emerald-800',
          label: t('risk_low') || 'Low Risk',
        };
    }
  };

  const riskStyles = riskData ? getRiskStyles(riskData.risk_level) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Chat Area */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-210px)] min-h-[600px] bg-surface-card border border-surface-border rounded-2xl shadow-xl overflow-hidden">
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
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div
                className={`text-sm shadow-sm leading-relaxed relative group ${
                  msg.sender === 'user'
                    ? 'max-w-[75%] mr-1 sm:mr-2 rounded-2xl rounded-tr-none px-4 py-3 bg-teal-700 text-white'
                    : 'max-w-[80%] bg-surface-card text-content-primary border border-surface-border rounded-2xl rounded-tl-none px-4.5 py-3'
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
              disabled={loading}
              placeholder={
                isListening
                  ? t('listening') || 'Listening...'
                  : 'Describe your symptoms in detail...'
              }
              className="flex-1 bg-transparent border-0 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none py-2 px-1"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || loading}
              className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${
                userInput.trim() && !loading
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
      {!isCompleted ? (
        (collectedPoints.length === 0 && (!riskData || !riskData.reasons || riskData.reasons.length === 0)) ? (
          <div className="w-full lg:col-span-5 border border-surface-border bg-surface-card rounded-2xl p-6 flex flex-col gap-4 text-center justify-center items-center shadow-lg h-[calc(100vh-210px)] min-h-[600px] animate-fade-in">
            <Sparkles className="w-8 h-8 text-content-muted animate-pulse" />
            <h3 className="text-base font-bold">No Symptoms Evaluated Yet</h3>
            <p className="text-xs text-content-secondary leading-relaxed px-4">
              Describe your symptoms in the chat to see clinical triage.
            </p>
          </div>
        ) : (
          <div className="w-full lg:col-span-5 border border-surface-border bg-surface-card rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg h-[calc(100vh-210px)] min-h-[600px] overflow-y-auto animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Clinical Assessment Ongoing
              </span>
            </div>
            <h3 className="text-lg font-bold">
              Active Turn #{currentStep}
            </h3>

            <p className="text-sm text-content-secondary leading-relaxed">
              Please answer the follow-up question on the left to help clarify symptoms.
            </p>

            {/* Live Symptom Notes / Collected Points */}
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

            {/* Cumulative Case Details if reasons are present */}
            {riskData && riskData.reasons && riskData.reasons.length > 0 && riskData.reasons.some(r => r && r.trim().length > 0) && (
              <div className="border-t border-surface-border pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-2">
                  Clinical Notes Recorded
                </span>
                <div className="flex flex-col gap-1.5">
                  {riskData.reasons.map((reason, idx) => reason && reason.trim() && (
                    <p key={idx} className="text-[11px] leading-relaxed text-content-secondary bg-surface-bg/50 px-2.5 py-1.5 rounded border border-surface-border animate-fade-in">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        riskData && riskStyles && (
          <div className={`w-full lg:col-span-5 border-2 rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg ${riskStyles.bg} h-[calc(100vh-210px)] min-h-[600px] overflow-y-auto animate-fade-in`}>
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

              {riskData.doctor_checklist && riskData.doctor_checklist.length > 0 && (
                <div className="p-3 bg-surface-card border border-surface-border rounded-lg flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Checklist for Doctor / Patient
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {riskData.doctor_checklist.map((item, idx) => (
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
      )}
      </div>
    </div>
  );
};

export default HealthChat;
