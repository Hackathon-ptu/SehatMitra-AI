import React, { useState, useEffect } from 'react';
import { historyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, 
  FileText, 
  Activity, 
  Clock, 
  ShieldAlert, 
  MessageSquare, 
  Download, 
  User, 
  Sparkles, 
  Trash2, 
  LogIn, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const HistoryDashboard = () => {
  const { user, showAuthModal } = useAuth();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('consultations');
  const [consultations, setConsultations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const langCode = (language || 'en').split('-')[0].toLowerCase();

  const [token, setToken] = useState(
    () => localStorage.getItem('token') || localStorage.getItem('access_token')
  );

  const loadAllHistory = async () => {
    setLoading(true);
    let loadedConsultations = [];
    let loadedReports = [];

    // 1. Load local / guest records from localStorage
    try {
      const localConsultations = JSON.parse(localStorage.getItem('guest_consultations') || '[]');
      if (Array.isArray(localConsultations)) {
        loadedConsultations = [...localConsultations];
      }
    } catch (e) {
      console.warn("Failed to parse local consultations", e);
    }

    try {
      const localReports = JSON.parse(localStorage.getItem('guest_reports') || '[]');
      if (Array.isArray(localReports)) {
        loadedReports = [...localReports];
      }
    } catch (e) {
      console.warn("Failed to parse local reports", e);
    }

    // 2. If authenticated, fetch server records and merge
    const currentToken = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (currentToken) {
      try {
        const cData = await historyService.getConsultations();
        const rData = await historyService.getReports();

        if (Array.isArray(cData) && cData.length > 0) {
          // Merge unique server records with local
          const serverSessionIds = new Set(cData.map(c => c.session_id || c.id));
          const filteredLocal = loadedConsultations.filter(c => !serverSessionIds.has(c.session_id || c.id));
          loadedConsultations = [...cData, ...filteredLocal];
        }

        if (Array.isArray(rData) && rData.length > 0) {
          const serverReportIds = new Set(rData.map(r => r.id));
          const filteredLocalReports = loadedReports.filter(r => !serverReportIds.has(r.id));
          loadedReports = [...rData, ...filteredLocalReports];
        }
      } catch (err) {
        console.warn('Server history fetch error (using local cache):', err);
      }
    }

    // Sort by newest first
    loadedConsultations.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    loadedReports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    setConsultations(loadedConsultations);
    setReports(loadedReports);
    setLoading(false);
  };

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem('token') || localStorage.getItem('access_token'));
      loadAllHistory();
    };

    window.addEventListener('auth_state_changed', handleAuthChange);
    window.addEventListener('history_updated', loadAllHistory);
    window.addEventListener('storage', handleAuthChange);

    loadAllHistory();

    return () => {
      window.removeEventListener('auth_state_changed', handleAuthChange);
      window.removeEventListener('history_updated', loadAllHistory);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [token]);

  const handleClearHistory = () => {
    if (window.confirm(langCode === 'hi' ? 'क्या आप वाकई स्थानीय इतिहास हटाना चाहते हैं?' : 'Are you sure you want to clear local consultation history?')) {
      localStorage.removeItem('guest_consultations');
      localStorage.removeItem('guest_reports');
      loadAllHistory();
    }
  };

  const getRiskBadgeStyles = (level) => {
    switch (level?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-500 text-white font-extrabold animate-pulse';
      case 'high':
        return 'bg-rose-500 text-white font-extrabold';
      case 'medium':
      case 'moderate':
        return 'bg-amber-500 text-white font-bold';
      case 'low':
      default:
        return 'bg-emerald-500 text-white font-bold';
    }
  };

  const getStatusColor = (status) => {
    const clean = status?.toLowerCase();
    if (clean === 'normal') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (clean === 'high') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (clean === 'low') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (clean === 'critical') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-surface-elevated text-content-secondary border-surface-border';
  };

  const getChiefComplaint = (item) => {
    if (item.conversation_history && item.conversation_history.length > 0) {
      const firstUserMsg = item.conversation_history.find(
        (m) => m.role === 'user' || m.sender === 'user'
      );
      if (firstUserMsg) {
        return firstUserMsg.content || firstUserMsg.text || 'Clinical Consultation';
      }
    }
    if (item.reasons && item.reasons.length > 0) {
      return item.reasons[0];
    }
    return 'General Health Assessment';
  };

  const handleDownloadSlip = (item) => {
    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SehatMitra-AI Consultation Slip</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.6; }
          .prescription-card { border: 2px solid #0d9488; border-radius: 12px; padding: 24px; max-width: 750px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 24px; font-weight: bold; color: #0f766e; }
          .meta { font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #ccfbf1; color: #0f766e; font-weight: bold; font-size: 11px; text-transform: uppercase; }
          .section { margin-top: 16px; }
          .section-title { font-size: 14px; font-weight: bold; color: #0f766e; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .finding { background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 6px; border-left: 3px solid #0d9488; }
          .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="prescription-card">
          <div class="header">
            <div>
              <div class="title">SehatMitra AI</div>
              <div style="font-size: 12px; color: #64748b;">Community Healthcare Clinical Slip</div>
            </div>
            <div class="meta" style="text-align: right;">
              <strong>Slip ID:</strong> SM-HIST-${Math.floor(100000 + Math.random() * 900000)}<br/>
              <strong>Date:</strong> ${new Date(item.created_at || Date.now()).toLocaleDateString()}<br/>
              <strong>Time:</strong> ${new Date(item.created_at || Date.now()).toLocaleTimeString()}
            </div>
          </div>
          
          <div class="section">
            <span class="badge">Risk Priority: ${item.risk_level || 'Normal'}</span>
          </div>

          <div class="section">
            <div class="section-title">Chief Complaint</div>
            <p style="font-size: 14px; font-weight: 600; color: #334155; margin: 4px 0;">"${getChiefComplaint(item)}"</p>
          </div>

          <div class="section">
            <div class="section-title">Clinical Recommendation</div>
            <p style="font-size: 13.5px; font-weight: 500; color: #0f172a; margin: 4px 0;">${item.recommendation || 'General Rest and Doctor Follow-up.'}</p>
          </div>

          <div class="section">
            <div class="section-title">Recorded Symptoms & Clinical Notes</div>
            ${(item.reasons || []).map(r => `
              <div class="finding">• ${r}</div>
            `).join('')}
          </div>

          <div class="footer">
            * This digital decision support summary is generated by SehatMitra-AI for primary triage guidance. Always consult a verified medical officer for formal prescriptions.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
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
    <div className="max-w-5xl mx-auto p-4 animate-fade-in text-left flex flex-col gap-6">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
              {langCode === 'hi' ? 'स्वास्थ्य इतिहास एवं परामर्श रिकॉर्ड' : langCode === 'pa' ? 'ਸਿਹਤ ਇਤਿਹਾਸ ਅਤੇ ਸਲਾਹ ਰਿਕਾਰਡ' : 'Health History & Records'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
            {langCode === 'hi' 
              ? 'आपके पिछले वॉयस ट्राइएज परामर्श, लक्षण जांच एवं लैब रिपोर्ट का पूर्ण विवरण सुरक्षित है।'
              : langCode === 'pa'
              ? 'ਤੁਹਾਡੀ ਪਿਛਲੀ ਵੌਇਸ ਟ੍ਰਾਈਏਜ ਸਲਾਹ, ਲੱਛਣ ਜਾਂਚ ਅਤੇ ਲੈਬ ਰਿਪੋਰਟਾਂ ਦਾ ਵੇਰਵਾ ਇੱਥੇ ਸੁਰੱਖਿਅਤ ਹੈ।'
              : 'Review your past clinical voice triage intakes, AI diagnoses, doctor prescription slips, and uploaded lab report biomarker summaries.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllHistory}
            className="p-2 hover:bg-surface-elevated border border-surface-border text-content-secondary rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Refresh History"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          {consultations.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-red-50 text-red-600 border border-red-200 dark:border-red-900 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
              title="Clear Local History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local</span>
            </button>
          )}
        </div>
      </div>

      {/* Guest Sync Banner if not logged in */}
      {!token && (
        <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-teal-950 dark:text-teal-200">
                {langCode === 'hi' ? 'स्थानीय सत्र रिकॉर्ड प्रदर्शित हो रहे हैं' : 'Showing Local Session Records'}
              </span>
              <span className="text-[11px] text-teal-700 dark:text-teal-400">
                {langCode === 'hi' 
                  ? 'सभी डिवाइसों पर सुरक्षित बैकअप और सिंक्रोनाइज़ करने के लिए लॉगिन करें।' 
                  : 'Log in or sign up to permanently sync your medical records and prescriptions to your secure account.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => showAuthModal('login')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{langCode === 'hi' ? 'लॉगिन / रजिस्टर' : 'Login / Sign Up'}</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        <button
          onClick={() => setActiveTab('consultations')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none ${
            activeTab === 'consultations'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/60 dark:bg-teal-950/20 rounded-t-lg'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{langCode === 'hi' ? 'परामर्श इतिहास' : 'Consultation History'} ({consultations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none ${
            activeTab === 'reports'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/60 dark:bg-teal-950/20 rounded-t-lg'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{langCode === 'hi' ? 'जांच रिपोर्ट इतिहास' : 'Report History'} ({reports.length})</span>
        </button>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-card border border-surface-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'consultations' ? (
        consultations.length > 0 ? (
          <div className="space-y-4">
            {consultations.map((item, idx) => (
              <div
                key={item.id || item.session_id || idx}
                className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col gap-4"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-content-muted">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>{new Date(item.created_at || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <Clock className="w-4 h-4 text-teal-600 ml-2" />
                    <span>{new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {item.risk_level && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getRiskBadgeStyles(item.risk_level)}`}>
                      {item.risk_level} Priority
                    </span>
                  )}
                </div>

                {/* Complaint & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 flex flex-col gap-2">
                    <div className="text-xs font-bold text-content-muted uppercase tracking-wider mb-0.5">
                      {langCode === 'hi' ? 'मुख्य लक्षण शिकायत:' : 'Chief Complaint:'}
                      <span className="text-content-primary normal-case font-bold text-sm ml-1.5">
                        "{getChiefComplaint(item)}"
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
                      {langCode === 'hi' ? 'डॉक्टर / एआई अनुशंसा:' : 'Clinical Recommendation:'}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-content-primary leading-relaxed bg-surface-elevated p-2.5 rounded-xl border border-surface-border">
                      {item.recommendation || 'General Clinical Rest and Observation.'}
                    </p>
                  </div>

                  {/* Recorded symptom notes */}
                  {item.reasons && item.reasons.length > 0 && (
                    <div className="md:col-span-4 flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-surface-border/50 pt-2 md:pt-0 md:pl-4">
                      <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
                        {langCode === 'hi' ? 'दर्ज लक्षण विवरण:' : 'Recorded Notes:'}
                      </span>
                      <ul className="list-disc pl-4 text-xs text-content-secondary space-y-1">
                        {item.reasons.map((r, i) => (
                          <li key={i} className="leading-snug">{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2.5 justify-end border-t border-surface-border/40 pt-3">
                  <button
                    onClick={() => setSelectedConsultation(item)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-surface-border text-xs font-bold text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                    <span>{langCode === 'hi' ? 'बातचीत देखें' : 'View Transcript'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSlip(item)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{langCode === 'hi' ? 'पर्ची डाउनलोड करें' : 'Download Slip (PDF)'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3">
            <Activity className="w-12 h-12 text-content-disabled" />
            <span className="text-sm font-bold text-content-primary">
              {langCode === 'hi' ? 'कोई परामर्श इतिहास नहीं मिला।' : 'No consultation history found.'}
            </span>
            <span className="text-xs text-content-muted max-w-sm">
              {langCode === 'hi' 
                ? 'वॉयस ट्राइएज या लक्षण चैट में जाकर परामर्श पूरा करें।' 
                : 'Start a consultation in Voice Triage or Symptom Chat to automatically record and track health history.'}
            </span>
          </div>
        )
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-content-muted">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="font-extrabold text-content-primary truncate max-w-[200px] sm:max-w-[300px]">
                    {item.filename || 'Lab_Report_Scan.jpg'}
                  </span>
                  <Calendar className="w-4 h-4 text-teal-600 ml-2" />
                  <span>{new Date(item.created_at || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {item.explanation && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
                    {langCode === 'hi' ? 'निष्कर्ष (AI Summary):' : 'AI Clinical Summary:'}
                  </span>
                  <p className="text-xs sm:text-sm text-content-primary leading-relaxed bg-surface-elevated p-3 rounded-xl border border-surface-border">
                    {item.explanation}
                  </p>
                </div>
              )}

              {/* Biomarkers */}
              {item.extracted_data && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider block mb-2">
                    {langCode === 'hi' ? 'मुख्य बायोमार्कर मान:' : 'Extracted Biomarkers:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.isArray(item.extracted_data) ? (
                      item.extracted_data.map((bio, bIdx) => (
                        <div key={bIdx} className="bg-surface-bg border border-surface-border rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-content-primary truncate" title={bio.name || bio.parameter}>
                            {bio.name || bio.parameter}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-extrabold text-teal-600">{bio.value}</span>
                            <span className="text-[10px] text-content-muted font-bold">{bio.unit}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getStatusColor(bio.status)}`}>
                              {bio.status || 'Normal'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.entries(item.extracted_data).map(([key, val]) => (
                        <div key={key} className="bg-surface-bg border border-surface-border rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-content-primary truncate" title={key}>
                            {key}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-extrabold text-teal-600">{val?.value || val}</span>
                            <span className="text-[10px] text-content-muted font-bold">{val?.unit || ''}</span>
                          </div>
                          {val?.status && (
                            <div className="mt-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getStatusColor(val.status)}`}>
                                {val.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3">
          <FileText className="w-12 h-12 text-content-disabled" />
          <span className="text-sm font-bold text-content-primary">
            {langCode === 'hi' ? 'कोई जांच रिपोर्ट इतिहास नहीं मिला।' : 'No lab report history found.'}
          </span>
          <span className="text-xs text-content-muted max-w-sm">
            {langCode === 'hi' 
              ? 'रिपोर्ट एनालाइजर टैब में जाकर अपनी ब्लड टेस्ट या लैब रिपोर्ट अपलोड करें।' 
              : 'Upload a prescription or lab report in the Report Analyzer tab to extract biomarkers and track them here.'}
          </span>
        </div>
      )}

      {/* Conversation Transcript Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-teal-600 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <h3 className="font-bold text-sm sm:text-base">
                  {langCode === 'hi' ? 'परामर्श बातचीत प्रतिलिपि (Transcript)' : 'Consultation Transcript'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="text-white/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-bg/30">
              {selectedConsultation.conversation_history && selectedConsultation.conversation_history.length > 0 ? (
                selectedConsultation.conversation_history.map((msg, i) => {
                  const isUser = msg.role === 'user' || msg.sender === 'user';
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] font-bold text-content-muted uppercase mb-1 px-1">
                        {isUser ? 'Patient' : 'SehatMitra AI'}
                      </span>
                      <div
                        className={`text-xs sm:text-sm rounded-2xl px-4 py-2.5 max-w-[85%] leading-relaxed ${
                          isUser
                            ? 'bg-teal-600 text-white rounded-tr-none'
                            : 'bg-surface-card border border-surface-border text-content-primary rounded-tl-none shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-xs text-content-muted">No messages in transcript.</p>
              )}
            </div>

            <div className="p-4 border-t border-surface-border flex justify-between items-center bg-surface-card">
              <button
                onClick={() => handleDownloadSlip(selectedConsultation)}
                className="px-3.5 py-1.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Download Slip</span>
              </button>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HistoryDashboard;
