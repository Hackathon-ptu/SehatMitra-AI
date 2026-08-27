import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { historyService } from '../services/api';
import { Calendar, FileText, Activity, Clock, ShieldAlert, MessageSquare, Download } from 'lucide-react';


const DASHBOARD_TRANSLATIONS = {
  en: {
    title: "Your Health History",
    subtitle: "Your past consultations and uploaded lab report history details are secure here.",
    consultations_tab: "Consultation History",
    reports_tab: "Report History",
    no_consultations: "No consultation history found.",
    no_reports: "No report history found.",
    recommendation: "Doctor Recommendation",
    symptoms: "Symptoms Analysis",
    chief_complaint: "Chief Complaint:",
    open_chat: "Open Chat",
    download_slip: "Download Slip",
    chat_transcript: "Conversation Transcript",
    close: "Close",
    guest_prompt: "Please log in to view your consultation and report history."
  },
  hi: {
    title: "आपका स्वास्थ्य इतिहास",
    subtitle: "आपके पिछले परामर्शों और अपलोड की गई जांच रिपोर्टों का विवरण यहाँ सुरक्षित है।",
    consultations_tab: "परामर्श इतिहास",
    reports_tab: "जांच रिपोर्ट इतिहास",
    no_consultations: "कोई परामर्श इतिहास नहीं मिला।",
    no_reports: "कोई जांच रिपोर्ट इतिहास नहीं मिला।",
    recommendation: "डॉक्टर की सलाह",
    symptoms: "लक्षण विश्लेषण",
    chief_complaint: "मुख्य शिकायत:",
    open_chat: "चैट खोलें",
    download_slip: "स्लिप डाउनलोड करें",
    chat_transcript: "बातचीत की प्रतिलिपि",
    close: "बंद करें",
    guest_prompt: "कृपया अपना परामर्श और जांच रिपोर्ट इतिहास देखने के लिए लॉग इन करें।"
  },
  bn: {
    title: "আপনার স্বাস্থ্য ইতিহাস",
    subtitle: "আপনার অতীত পরামর্শ এবং আপলোড করা ল্যাব রিপোর্টের ইতিহাস এখানে সুরক্ষিত আছে।",
    consultations_tab: "পরামর্শের ইতিহাস",
    reports_tab: "রিপোর্ট ইতিহাস",
    no_consultations: "কোনো পরামর্শের ইতিহাস পাওয়া যায়নি।",
    no_reports: "কোনো রিপোর্টের ইতিহাস পাওয়া যায়নি।",
    recommendation: "চিকিৎসকের পরামর্শ",
    symptoms: "উপসর্গ বিশ্লেষণ",
    chief_complaint: "প্রধান অভিযোগ:",
    open_chat: "চ্যাট খুলুন",
    download_slip: "স্লিপ ডাউনলোড করুন",
    chat_transcript: "কথোপকথনের প্রতিলিপি",
    close: "বন্ধ করুন",
    guest_prompt: "আপনার পরামর্শ এবং ল্যাব রিপোর্টের ইতিহাস দেখতে অনুগ্রহ করে লগ ইন করুন।"
  },
  pa: {
    title: "ਤੁਹਾਡਾ ਸਿਹਤ ਇਤਿਹਾਸ",
    subtitle: "ਤੁਹਾਡੀ ਪਿਛਲੀ ਸਲਾਹ ਅਤੇ ਅੱਪਲੋਡ ਕੀਤੀ ਲੈਬ ਰਿਪੋਰਟ ਦਾ ਇਤਿਹਾਸ ਇੱਥੇ ਸੁਰੱਖਿਅਤ ਹੈ।",
    consultations_tab: "ਸਲਾਹ ਦਾ ਇਤਿਹਾਸ",
    reports_tab: "ਰਿਪੋਰਟ ਦਾ ਇਤਿਹਾਸ",
    no_consultations: "ਕੋਈ ਸਲਾਹ ਦਾ ਇਤਿਹਾਸ ਨਹੀਂ ਮਿਲਿਆ।",
    no_reports: "ਕੋਈ ਰਿਪੋਰਟ ਦਾ ਇਤਿਹਾਸ ਨਹੀਂ ਮਿਲਿਆ।",
    recommendation: "ਡਾਕਟਰ ਦੀ ਸਲਾਹ",
    symptoms: "ਲੱਛਣ ਵਿਸ਼ਲੇਸ਼ਣ",
    chief_complaint: "ਮੁੱਖ ਸ਼ਿਕਾਇਤ:",
    open_chat: "ਚੈਟ ਖੋਲ੍ਹੋ",
    download_slip: "ਸਲਿੱਪ ਡਾਊਨਲੋਡ ਕਰੋ",
    chat_transcript: "ਗੱਲਬਾਤ ਦੀ ਟ੍ਰਾਂਸਕ੍ਰਿਪਟ",
    close: "ਬੰਦ ਕਰੋ",
    guest_prompt: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਲਾਹ ਅਤੇ ਰਿਪੋਰਟ ਦਾ ਇਤਿਹਾਸ ਦੇਖਣ ਲਈ ਲੌਗ ਇਨ ਕਰੋ।"
  }
};

export const HistoryDashboard = () => {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('consultations');
  const [consultations, setConsultations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const activeLang = i18n.language || 'en';
  const primaryLang = activeLang.split('-')[0].toLowerCase();
  const trans = DASHBOARD_TRANSLATIONS[primaryLang] || DASHBOARD_TRANSLATIONS.en;

  // Reactive token: re-check whenever auth state changes (login/logout)
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || localStorage.getItem('access_token')
  );

  useEffect(() => {
    const syncToken = () => {
      setToken(localStorage.getItem('token') || localStorage.getItem('access_token'));
    };
    // Listen for auth state changes dispatched by AuthContext and the response interceptor
    window.addEventListener('auth_state_changed', syncToken);
    window.addEventListener('storage', syncToken);
    // Also re-check on mount in case token was set after initial render
    syncToken();
    return () => {
      window.removeEventListener('auth_state_changed', syncToken);
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const cData = await historyService.getConsultations();
        const rData = await historyService.getReports();
        setConsultations(Array.isArray(cData) ? cData : []);
        setReports(Array.isArray(rData) ? rData : []);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto p-4 animate-fade-in text-left">
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
            {trans.title}
          </h2>
          <p className="text-xs sm:text-sm text-content-muted">
            {trans.subtitle}
          </p>
        </div>
        <div className="text-center py-12 bg-surface-card border border-surface-border rounded-2xl text-content-muted font-semibold">
          {trans.guest_prompt}
        </div>
      </div>
    );
  }

  const getRiskStyles = (level) => {
    switch (level?.toLowerCase()) {
      case 'emergency':
      case 'high':
        return 'bg-red-500 text-white';
      case 'moderate':
      case 'amber':
        return 'bg-amber-500 text-white';
      case 'low':
      case 'green':
      default:
        return 'bg-green-500 text-white';
    }
  };

  const getStatusColor = (status) => {
    const clean = status?.toLowerCase();
    if (clean === 'normal') return 'bg-green-500 text-white';
    if (clean === 'high') return 'bg-amber-500 text-white';
    if (clean === 'low') return 'bg-blue-500 text-white';
    if (clean === 'critical') return 'bg-red-500 text-white';
    return 'bg-surface-elevated text-content-secondary';
  };

  const getChiefComplaint = (item) => {
    if (item.conversation_history && item.conversation_history.length > 0) {
      const firstUserMsg = item.conversation_history.find(
        (m) => m.role === 'user' || m.sender === 'user'
      );
      if (firstUserMsg) {
        return firstUserMsg.content || firstUserMsg.text || 'General Consultation';
      }
    }
    if (item.reasons && item.reasons.length > 0) {
      return item.reasons[0];
    }
    return 'General Consultation';
  };

  const handleDownloadSlip = (item) => {
    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SehatMitra-AI Consultation Slip</title>
        <style>
          body { font-family: sans-serif; padding: 30px; color: #333; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0d9488; }
          .meta-info { margin-bottom: 20px; font-size: 13px; color: #666; }
          .section-title { font-size: 16px; font-weight: bold; color: #0d9488; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          .finding { background: #f9f9f9; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; border: 1px solid #eee; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SehatMitra-AI Health Consultation</div>
          <div>Digital Health Decision Support Slip</div>
        </div>
        
        <div class="meta-info">
          <div><strong>Date:</strong> ${new Date(item.created_at).toLocaleString()}</div>
          <div><strong>Risk Assessment:</strong> ${item.risk_level || 'Normal'}</div>
          <div><strong>Chief Complaint:</strong> ${getChiefComplaint(item)}</div>
        </div>

        <div class="section-title">Clinical Recommendation</div>
        <p style="font-size: 14px; font-weight: 500;">${item.recommendation || 'General Rest and Clinical Follow-up.'}</p>

        <div class="section-title">Recorded Symptoms & Findings</div>
        ${(item.reasons || []).map(r => `
          <div class="finding">• ${r}</div>
        `).join('')}

        <div class="footer">
          * This summary is prepared by SehatMitra-AI as a digital decision-support aid. Always consult a verified medical practitioner for prescription and formal diagnosis.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([slipHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in text-left">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          {trans.title}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          {trans.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border mb-6">
        <button
          onClick={() => setActiveTab('consultations')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all focus:outline-none ${
activeTab === 'consultations'
? 'border-brand-600 text-brand-600'
: 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{trans.consultations_tab} ({consultations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all focus:outline-none ${
activeTab === 'reports'
? 'border-brand-600 text-brand-600'
: 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{trans.reports_tab} ({reports.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
<div key={i} className="h-28 bg-surface-card border border-surface-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'consultations' ? (
        consultations.length > 0 ? (
          <div className="space-y-4">
{consultations.map((item) => (
<div
key={item.id}
className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col gap-4"
>
<div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
  <div className="flex items-center gap-2 text-xs font-bold text-content-muted">
    <Calendar className="w-4 h-4 text-brand-600" />
    <span>{new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    <Clock className="w-4 h-4 text-brand-600 ml-2" />
    <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  <div className="flex items-center gap-2">
    {item.risk_level && (
      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRiskStyles(item.risk_level)}`}>
        {item.risk_level} Risk
      </span>
    )}
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
  <div className="md:col-span-8 flex flex-col gap-2">
    <div className="text-xs font-bold text-content-muted uppercase tracking-wider mb-1">
      {trans.chief_complaint} <span className="text-content-primary normal-case font-semibold text-sm ml-1">{getChiefComplaint(item)}</span>
    </div>
    <span className="text-xs font-bold text-content-muted uppercase tracking-wider">{trans.recommendation}</span>
    <p className="text-sm font-semibold text-content-primary">{item.recommendation || 'General Clinical Rest.'}</p>
  </div>
  {item.reasons && item.reasons.length > 0 && (
    <div className="md:col-span-4 flex flex-col gap-1 border-t md:border-t-0 md:border-l border-surface-border/50 pt-2 md:pt-0 md:pl-4">
      <span className="text-xs font-bold text-content-muted uppercase tracking-wider">{trans.symptoms}</span>
      <ul className="list-disc pl-4 text-xs text-content-secondary space-y-0.5">
        {item.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )}
</div>

<div className="flex items-center gap-2.5 justify-end border-t border-surface-border/30 pt-3">
  <button
    onClick={() => setSelectedConsultation(item)}
    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-bold text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-all cursor-pointer select-none"
  >
    <MessageSquare className="w-3.5 h-3.5" />
    <span>{trans.open_chat}</span>
  </button>
  <button
    onClick={() => handleDownloadSlip(item)}
    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer select-none"
  >
    <Download className="w-3.5 h-3.5" />
    <span>{trans.download_slip}</span>
  </button>
</div>
</div>
))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface-card border border-surface-border rounded-2xl text-content-muted">
{trans.no_consultations}
          </div>
        )
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((item) => (
<div
key={item.id}
className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col gap-4"
>
<div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
<div className="flex items-center gap-2 text-xs font-bold text-content-muted">
  <FileText className="w-4 h-4 text-brand-600" />
  <span className="truncate max-w-[200px] sm:max-w-[300px]">{item.filename}</span>
  <Calendar className="w-4 h-4 text-brand-600 ml-2" />
  <span>{new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</span>
</div>
</div>

{item.explanation && (
<div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-content-muted uppercase tracking-wider">निष्कर्ष (AI Summary)</span>
  <p className="text-sm text-content-primary leading-relaxed">{item.explanation}</p>
</div>
)}

{item.extracted_data && Object.keys(item.extracted_data).length > 0 && (
<div className="pt-2">
                  <span className="text-xs font-bold text-content-muted uppercase tracking-wider block mb-2">मुख्य बायोमार्कर मान</span>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {Object.entries(item.extracted_data).map(([key, val]) => (
      <div key={key} className="bg-surface-bg border border-surface-border rounded-xl p-3 flex flex-col gap-1">
        <span className="text-[11px] font-bold text-content-primary truncate" title={key}>{key}</span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-base font-extrabold text-brand-600">{val.value}</span>
          <span className="text-[9px] text-content-muted font-bold">{val.unit}</span>
        </div>
        <div className="mt-1">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${getStatusColor(val.status)}`}>
            {val.status}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>
)}
</div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-card border border-surface-border rounded-2xl text-content-muted">
          {trans.no_reports}
        </div>
      )}

      {/* Conversation Transcript Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-scale-in overflow-hidden">
<div className="p-4 border-b border-surface-border flex justify-between items-center bg-gradient-to-r from-brand-600 to-brand-700 text-white">
<h3 className="font-bold text-base">{trans.chat_transcript}</h3>
<button
onClick={() => setSelectedConsultation(null)}
className="text-white/80 hover:text-white font-bold text-sm"
>
                ✕
</button>
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-bg/30">
{selectedConsultation.conversation_history && selectedConsultation.conversation_history.length > 0 ? (
selectedConsultation.conversation_history.map((msg, i) => (
  <div
    key={i}
    className={`flex flex-col ${
      msg.role === 'user' || msg.sender === 'user' ? 'items-end' : 'items-start'
    }`}
  >
    <div
      className={`text-sm rounded-2xl px-4 py-2.5 max-w-[85%] ${
        msg.role === 'user' || msg.sender === 'user'
          ? 'bg-teal-700 text-white rounded-tr-none'
          : 'bg-surface-card border border-surface-border text-content-primary rounded-tl-none'
      }`}
    >
      <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
    </div>
  </div>
))
) : (
<p className="text-center text-sm text-content-muted">No messages in transcript.</p>
)}
</div>
<div className="p-4 border-t border-surface-border flex justify-end">
<button
onClick={() => setSelectedConsultation(null)}
className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"
>
{trans.close}
</button>
</div>
          </div>
        </div>
      )}
    </div>
  );
};

