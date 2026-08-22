import React, { useState, useEffect } from 'react';
import { historyService } from '../services/api';
import { Calendar, FileText, Activity, Clock, ShieldAlert } from 'lucide-react';

export const HistoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('consultations');
  const [consultations, setConsultations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const cData = await historyService.getConsultations();
        const rData = await historyService.getReports();
        setConsultations(cData);
        setReports(rData);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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

  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in text-left">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          आपका स्वास्थ्य इतिहास (Your Health History)
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          आपके पिछले परामर्शों और अपलोड की गई जांच रिपोर्टों का विवरण यहाँ सुरक्षित है।
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
          <span>परामर्श इतिहास ({consultations.length})</span>
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
          <span>जांच रिपोर्ट इतिहास ({reports.length})</span>
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
                  {item.risk_level && (
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRiskStyles(item.risk_level)}`}>
                      {item.risk_level} Risk
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 flex flex-col gap-2">
                    <span className="text-xs font-bold text-content-muted uppercase tracking-wider">डॉक्टर की सलाह (Recommendation)</span>
                    <p className="text-sm font-semibold text-content-primary">{item.recommendation || 'सामान्य आराम करें।'}</p>
                  </div>
                  {item.reasons && item.reasons.length > 0 && (
                    <div className="md:col-span-4 flex flex-col gap-1 border-t md:border-t-0 md:border-l border-surface-border/50 pt-2 md:pt-0 md:pl-4">
                      <span className="text-xs font-bold text-content-muted uppercase tracking-wider">लक्षण विश्लेषण</span>
                      <ul className="list-disc pl-4 text-xs text-content-secondary space-y-0.5">
                        {item.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface-card border border-surface-border rounded-2xl text-content-muted">
            कोई परामर्श इतिहास नहीं मिला।
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
          कोई जांच रिपोर्ट इतिहास नहीं मिला।
        </div>
      )}
    </div>
  );
};
