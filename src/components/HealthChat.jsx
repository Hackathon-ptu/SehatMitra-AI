import React, { useState, useEffect, useRef } from 'react';
import { healthService } from '../services/api';
import { Mic, MicOff, Send, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

export const HealthChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'नमस्ते! मैं सेहतमित्र हूँ। आज आप कैसा महसूस कर रहे हैं? कृपया अपने लक्षणों के बारे में विस्तार से बताएं। (जैसे: "मुझे दो दिनों से तेज़ बुखार है और सूखी खाँसी है।")',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const messagesEndRef = useRef(null);

  // Initialize Web Speech API Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'hi-IN';

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
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleSpeech = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser.');
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
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await healthService.sendInterviewMessage({
        session_id: sessionId,
        user_message: userText,
        language: 'hi',
      });

      setSessionId(response.session_id);

      // Append bot response
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.next_question,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // If completed, trigger risk assessment
      if (response.is_completed) {
        setIsCompleted(true);
        const riskResponse = await healthService.assessRisk({
          session_id: response.session_id,
          symptoms_data: response.collected_symptoms,
        });
        setRiskData(riskResponse);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'माफ़ कीजियेगा, नेटवर्क में कुछ तकनीकी त्रुटि आ गई है। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'नमस्ते! मैं सेहतमित्र हूँ। आज आप कैसा महसूस कर रहे हैं? कृपया अपने लक्षणों के बारे में विस्तार से बताएं। (जैसे: "मुझे दो दिनों से तेज़ बुखार है और सूखी खाँसी है।")',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSessionId(null);
    setUserInput('');
    setIsCompleted(false);
    setRiskData(null);
  };

  const getRiskStyles = (level) => {
    switch (level?.toLowerCase()) {
      case 'emergency':
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-950 dark:text-red-200',
          badge: 'bg-red-500 text-white',
          label: 'Critical / Emergency (आपातकालीन स्थिति)',
        };
      case 'moderate':
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200',
          badge: 'bg-amber-500 text-white',
          label: 'Moderate Risk (सामान्य जोखिम)',
        };
      case 'low':
      case 'green':
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-950 dark:text-green-200',
          badge: 'bg-green-500 text-white',
          label: 'Low Risk (कम जोखिम)',
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
              <h2 className="font-bold text-base leading-tight">लक्षण परामर्श (Symptom Chat)</h2>
              <span className="text-[11px] text-white/80">AI संचालित प्राथमिक जांच सहायक</span>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Chat Reset करें"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">रीसेट करें</span>
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
                className={`max-w-[80%] rounded-2xl px-4.5 py-3 text-sm shadow-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-surface-card text-content-primary border border-surface-border rounded-tl-none'
                }`}
              >
                <p className="text-left whitespace-pre-wrap">{msg.text}</p>
                <span
                  className={`block text-[10px] text-right mt-1.5 font-medium ${
                    msg.sender === 'user' ? 'text-white/70' : 'text-content-muted'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-surface-card text-content-muted border border-surface-border rounded-2xl rounded-tl-none px-4.5 py-3 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs font-semibold ml-1">सोच रहा हूँ...</span>
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
              title={isListening ? 'बोलना बंद करें' : 'हिंदी में बोलें (Hindi Voice Input)'}
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
                  ? 'सुन रहा हूँ... बोलिए'
                  : isCompleted
                  ? 'परामर्श पूर्ण हो चुका है।'
                  : 'यहाँ अपने लक्षण लिखें...'
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
              🎙️ हिंदी वॉइस इनपुट सक्रिय है। कृपया माइक के सामने बोलें।
            </p>
          )}
        </form>
      </div>

      {/* Right Column: Triage Result Card */}
      {riskData && riskStyles && (
        <div className={`w-full lg:w-[400px] border-2 rounded-2xl p-6 flex flex-col gap-4 text-left shadow-lg ${riskStyles.bg}`}>
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyles.badge}`}>
              {riskStyles.label}
            </span>
            <Sparkles className="w-5 h-5 text-brand-600" />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">प्राथमिक स्वास्थ्य रिस्क रिपोर्ट</h3>
            <span className="text-xs text-content-muted">तैयार किया गया समय: अभी</span>
          </div>

          <div className="space-y-3.5 border-t border-surface-border pt-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                मूल्यांकन के मुख्य कारण (Reasons)
              </span>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {riskData.reasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1">
                सलाह व अनुशंसित कार्रवाई (Recommendation)
              </span>
              <p className="text-sm font-semibold leading-relaxed">{riskData.recommendation}</p>
            </div>

            {riskData.disclaimer && (
              <div className="p-3 rounded-lg bg-surface-card border border-surface-border flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[10px] text-content-secondary leading-normal">{riskData.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthChat;
