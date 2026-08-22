import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/api';
import { Mic, MicOff, Volume2, VolumeX, Printer, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface TriageResult {
  risk_level: 'low' | 'moderate' | 'high' | 'emergency';
  primary_diagnosis: string;
  reasons: string[];
  remedies: string[];
  red_flags: string[];
  recommendation: string;
  disclaimer: string;
}

export const TriageAssistant: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recognitionRef = useRef<any>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSymptomInput(transcript);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Stop audio if unmounted
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your symptoms instead.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setErrorMsg(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTriageSubmit = async () => {
    if (!symptomInput.trim()) {
      setErrorMsg(language === 'hi-IN' ? 'कृपया विश्लेषण शुरू करने के लिए अपने लक्षण दर्ज करें।' : 'Please describe your symptoms to start analysis.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setTriageResult(null);
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);

    try {
      // Formulate detected symptoms context based on input keywords
      const lowerInput = symptomInput.toLowerCase();
      const detectedSymptoms: string[] = [];
      if (lowerInput.includes('chest') || lowerInput.includes('सीना') || lowerInput.includes('दर्द')) detectedSymptoms.push('chest pain');
      if (lowerInput.includes('breath') || lowerInput.includes('सांस') || lowerInput.includes('cough') || lowerInput.includes('खांसी')) detectedSymptoms.push('difficulty breathing');
      if (lowerInput.includes('fever') || lowerInput.includes('बुखार') || lowerInput.includes('तापमान')) detectedSymptoms.push('fever');
      if (lowerInput.includes('blood') || lowerInput.includes('खून') || lowerInput.includes('bleeding')) detectedSymptoms.push('severe bleeding');
      if (lowerInput.includes('headache') || lowerInput.includes('सिर दर्द')) detectedSymptoms.push('pain');

      const payload = {
        symptoms_data: {
          user_input_summary: symptomInput,
          detected_symptoms: detectedSymptoms,
        },
        language: language.split('-')[0],
      };

      const response = await apiClient.post('/triage/', payload);
      setTriageResult(response.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || "Triage processing failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakRecommendation = () => {
    if (!triageResult) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const t = triageResult;
    const textToSpeak = `${language === 'hi-IN' ? 'प्राथमिक निदान' : 'Primary provisional diagnosis'}: ${t.primary_diagnosis}. ${language === 'hi-IN' ? 'अनुशंसा' : 'Recommendation'}: ${t.recommendation}. ${language === 'hi-IN' ? 'घरेलू उपाय' : 'Home remedies'}: ${t.remedies.join(', ')}.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = language;
    utterance.onend = () => {
      setIsPlayingAudio(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechUtteranceRef.current = utterance;
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePrintSlip = () => {
    if (!triageResult) return;

    const riskColors = {
      low: '#10b981',
      moderate: '#f59e0b',
      high: '#f97316',
      emergency: '#ef4444',
    };

    const isHindi = language === 'hi-IN';
    const isPunjabi = language === 'pa-IN';

    const riskLabel = triageResult.risk_level === 'low' ? t('risk_low') 
      : triageResult.risk_level === 'moderate' ? t('risk_moderate')
      : triageResult.risk_level === 'high' ? t('risk_high')
      : triageResult.risk_level === 'emergency' ? t('risk_emergency')
      : triageResult.risk_level;

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
            .red-flag-box { border: 1px solid #fca5a5; background: #fff5f5; border-radius: 8px; padding: 15px; margin-top: 25px; }
            .red-flag-title { color: #dc2626; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 6px; margin: 0 0 8px 0; text-transform: uppercase; }
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
                    <span class="badge" style="background-color: ${riskColors[triageResult.risk_level]}">${riskLabel}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div class="section">
              <div class="section-title">${isHindi ? 'मरीज की शिकायत / Patient Chief Complaint' : isPunjabi ? 'ਮਰੀਜ਼ ਦੀ ਸ਼ਿਕਾਇਤ / Patient Chief Complaint' : 'Patient Chief Complaint'}</div>
              <p style="font-size: 13.5px; margin: 0; color: #4b5563; font-style: italic; background: #f9fafb; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 4px;">"${symptomInput}"</p>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'प्राथमिक अनंतिम निदान / Provisional Primary Diagnosis' : isPunjabi ? 'ਮੁੱਢਲਾ ਨਿਦਾਨ / Provisional Primary Diagnosis' : 'Provisional Primary Diagnosis'}</div>
              <p style="font-size: 16px; font-weight: bold; color: #1e3a8a; margin: 0;">${triageResult.primary_diagnosis}</p>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'वर्गीकरण के कलीनीकल कारण / Clinical Reasons' : isPunjabi ? 'ਵਰਗੀਕਰਨ ਦੇ ਕਲੀਨਿਕਲ ਕਾਰਨ / Clinical Reasons' : 'Clinical Reasons for Assessment'}</div>
              <ul class="bullet-list">
                ${triageResult.reasons.map((r) => `<li>${r}</li>`).join('')}
              </ul>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'स्व-देखभाल और घरेलू उपाय / Self-Care Advice' : isPunjabi ? 'ਸਵੈ-ਦੇਖਭਾਲ ਅਤੇ ਘਰੇਲੂ ਉਪਚਾਰ / Self-Care Advice' : 'Self-Care & Home Remedies'}</div>
              <ul class="bullet-list">
                ${triageResult.remedies.map((r) => `<li>${r}</li>`).join('')}
              </ul>
            </div>

            <div class="red-flag-box">
              <div class="red-flag-title">
                ⚠️ ${isHindi ? 'लाल झंडा चेतावनी लक्षण / Critical Red Flags' : isPunjabi ? 'ਖਤਰੇ ਦੇ ਸੰਕੇਤ / Critical Red Flags' : 'Red Flag Warning Signs'}
              </div>
              <ul class="bullet-list" style="color: #b91c1c; margin: 0; padding-left: 20px;">
                ${triageResult.red_flags.map((r) => `<li style="color: #b91c1c; font-weight: 600;">${r}</li>`).join('')}
              </ul>
            </div>

            <div class="section">
              <div class="section-title">${isHindi ? 'डॉक्टर की सिफारिश / Doctor Recommendation' : isPunjabi ? 'ਡਾਕਟਰ ਦੀ ਸਿਫਾਰਸ਼ / Doctor Recommendation' : 'Recommendation & Next Steps'}</div>
              <p style="font-size: 14px; font-weight: 700; color: #1e3a8a; margin: 0; background: #eff6ff; padding: 12px; border-radius: 6px;">
                ${triageResult.recommendation}
              </p>
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300';
      case 'moderate': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300';
      case 'high': return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-300';
      case 'emergency': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 animate-pulse';
      default: return 'bg-surface-elevated border-surface-border text-content-secondary';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return t('risk_low');
      case 'moderate': return t('risk_moderate');
      case 'high': return t('risk_high');
      case 'emergency': return t('risk_emergency');
      default: return level;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex flex-col text-left gap-1">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
          {t('triage_title')}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
          {t('triage_subtitle')}
        </p>
      </div>

      {/* Input panel card */}
      <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-elevated flex flex-col gap-5 text-left">
        
        {/* Toggle Language & Status */}
        <div className="flex items-center justify-between">
          <div className="flex bg-surface-elevated border border-surface-border rounded-lg p-1 gap-1">
            <button
              onClick={() => setLanguage('hi-IN')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'hi-IN' ? 'bg-brand-600 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguage('pa-IN')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'pa-IN' ? 'bg-brand-600 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
            <button
              onClick={() => setLanguage('en-US')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'en-US' ? 'bg-brand-600 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              English
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-content-muted">
            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-surface-border'}`} />
            <span>{isRecording ? t('listening') : (language === 'hi-IN' ? 'निष्क्रिय' : language === 'pa-IN' ? 'ਨਿਸ਼ਕਿਰਿਆ' : 'Idle')}</span>
          </div>
        </div>

        {/* Big recording trigger */}
        <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-surface-border rounded-xl bg-surface-bg/50 gap-4">
          <button
            onClick={toggleRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white scale-110' 
                : 'bg-brand-600 hover:bg-brand-700 text-white'
            }`}
          >
            {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
          </button>
          <span className="text-xs font-semibold text-content-muted">
            {isRecording ? t('stop') : t('speak_btn')}
          </span>
        </div>

        {/* Input box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-content-secondary">
            {language === 'hi-IN' ? 'आपके लक्षण' : language === 'pa-IN' ? 'ਤੁਹਾਡੇ ਲੱਛਣ' : 'Your Symptoms'}
          </label>
          <textarea
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            rows={4}
            placeholder={t('type_placeholder')}
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
              <span>{t('listening') || 'Assessing risk level...'}</span>
            </>
          ) : (
            <span>{t('analyze_btn')}</span>
          )}
        </Button>
      </div>

      {/* Result Triage summary card */}
      {triageResult && (
        <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-elevated flex flex-col gap-6 text-left animate-fade-in">
          
          {/* Card Header: Diagnosis & Risk badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-content-muted">
                {language === 'hi-IN' ? 'प्राथमिक अनंतिम निदान' : 'Provisional Diagnosis'}
              </span>
              <h3 className="text-lg font-bold text-brand-600 mt-0.5">
                {triageResult.primary_diagnosis}
              </h3>
            </div>
            
            <div className={`px-4 py-1.5 rounded-full border text-xs font-extrabold uppercase tracking-wider ${getRiskColor(triageResult.risk_level)}`}>
              {getRiskLabel(triageResult.risk_level)}
            </div>
          </div>

          {/* Reasons */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary">
              {language === 'hi-IN' ? 'वर्गीकरण के क्लिनिकल कारण' : 'Clinical Assessment Reasons'}
            </h4>
            <ul className="list-disc pl-5 text-sm text-content-secondary space-y-1.5">
              {triageResult.reasons.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Home remedies */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary">
              {language === 'hi-IN' ? 'स्व-देखभाल और घरेलू उपचार' : 'Self-Care & Home Remedies'}
            </h4>
            <ul className="list-disc pl-5 text-sm text-content-secondary space-y-1.5">
              {triageResult.remedies.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Red flags warnings */}
          <div className="flex flex-col gap-2 p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              {language === 'hi-IN' ? 'लाल झंडा चेतावनी संकेत (तत्काल डॉक्टर से मिलें)' : 'Red Flag Warning Signs (Seek Urgent Care)'}
            </h4>
            <ul className="list-disc pl-5 text-sm text-red-800 dark:text-red-300 space-y-1.5 mt-1 font-medium">
              {triageResult.red_flags.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Action Recommendations */}
          <div className="flex flex-col gap-1 text-sm bg-surface-elevated p-4 border border-surface-border rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">
              {language === 'hi-IN' ? 'अनुशंसित अगला कदम' : 'Recommended Next Action'}
            </span>
            <p className="font-bold text-content-primary mt-0.5">
              {triageResult.recommendation}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-content-muted leading-relaxed border-t border-surface-border pt-4">
            {triageResult.disclaimer}
          </p>

          {/* Footer Controls: Voice Playback & Print Slip */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-border pt-4">
            <button
              onClick={handleSpeakRecommendation}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                isPlayingAudio 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                  : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200'
              }`}
            >
              {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isPlayingAudio ? (language === 'hi-IN' ? 'सुनना बंद करें' : 'Stop Listening') : (language === 'hi-IN' ? 'ट्राइएज सुनें' : 'Listen to Triage')}</span>
            </button>

            <button
              onClick={handlePrintSlip}
              className="flex items-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary rounded-xl text-xs font-bold transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t('download_slip_btn')}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
