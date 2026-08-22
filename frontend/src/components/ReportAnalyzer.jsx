import React, { useState, useRef } from 'react';
import { reportService } from '../services/api';
import { UploadCloud, FileText, CheckCircle, AlertCircle, FileCheck2, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateConsultationSlip } from '../utils/pdfGenerator';
import { UI_TRANSLATIONS } from '../constants/translations';

export const ReportAnalyzer = ({ languageCode = 'hi-IN' }) => {
  const { user } = useAuth();
  const t = UI_TRANSLATIONS[languageCode] || UI_TRANSLATIONS['hi-IN'] || UI_TRANSLATIONS['en-IN'];
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleDownloadSlip = () => {
    if (!analysisResult) return;
    const patientProfile = user || {
      patient_id: "GUEST-001",
      full_name: "Anonymous Patient",
      age: "N/A",
      gender: "N/A",
      blood_group: "N/A",
      village_town: "N/A",
      district: "N/A",
      chronic_conditions: [],
      allergies: []
    };
    const symptoms = Object.entries(analysisResult.extracted_data || {})
      .map(([param, val]) => `${param}: ${val.value} ${val.unit} (${val.status})`)
      .join('; ');
    const hasCritical = Object.values(analysisResult.extracted_data || {}).some(v => v.status?.toLowerCase() === 'critical');
    const hasHigh = Object.values(analysisResult.extracted_data || {}).some(v => v.status?.toLowerCase() === 'high');
    const riskTier = hasCritical ? 'Critical' : hasHigh ? 'High' : 'Moderate';

    const consultationData = {
      risk_tier: riskTier,
      symptoms: symptoms || "Medical report analyzer session",
      recommendation: analysisResult.explanation
    };
    generateConsultationSlip(patientProfile, consultationData, { name: 'Hindi / English' });
  };

  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg('कृपया केवल JPG, PNG या PDF फाइल ही अपलोड करें।');
      return;
    }
    setErrorMsg(null);
    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await reportService.uploadReport(file);
      setAnalysisResult(response);
    } catch (err) {
      console.error(err);
      setErrorMsg('जांच रिपोर्ट का विश्लेषण करने में विफलता हुई। कृपया फिर से प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const getStatusBadge = (status) => {
    const cleanStatus = status?.toLowerCase();
    if (cleanStatus === 'normal') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500 text-white">Normal</span>;
    }
    if (cleanStatus === 'high') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">High</span>;
    }
    if (cleanStatus === 'low') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white">Low</span>;
    }
    if (cleanStatus === 'critical') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white animate-pulse">Critical</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-elevated text-content-secondary">{status}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in text-left">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          {t.reportTitle}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          {t.reportDesc}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Screen */}
      {!analysisResult && !loading && (
        <div className="flex flex-col gap-6 items-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 select-none ${
              dragOver
                ? 'border-brand-600 bg-brand-50/80 shadow-lg scale-[1.01]'
                : 'border-surface-border bg-surface-card hover:bg-surface-elevated'
            }`}
          >
            <input
              type="file"
              ref={inputRef}
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-base font-bold text-content-primary">
                {dragOver ? (languageCode === 'en-IN' ? 'Drop file here' : 'फाइल को यहाँ छोड़ें') : t.uploadBtn}
              </span>
              <span className="text-xs text-content-muted leading-relaxed">
                {languageCode === 'en-IN' ? 'We accept JPG, PNG and PDF documents (max 10MB)' : 'हम JPG, PNG और PDF दस्तावेज़ स्वीकार करते हैं (अधिकतम 10MB)'}
              </span>
            </div>
          </div>

          {file && (
            <div className="w-full max-w-xl bg-surface-card border border-surface-border rounded-xl p-4 flex items-center justify-between shadow-subtle">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-brand-600 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-content-primary truncate max-w-[240px] sm:max-w-[320px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-content-muted">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-elevated text-content-secondary transition-colors"
                >
                  {languageCode === 'en-IN' ? 'Remove' : 'हटाएं'}
                </button>
                <button
                  onClick={handleUploadAndAnalyze}
                  className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 shadow-md transition-colors"
                >
                  {t.analyzeBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <div className="h-32 bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between animate-pulse">
            <div className="h-5 bg-surface-elevated rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-3 bg-surface-elevated rounded w-full" />
              <div className="h-3 bg-surface-elevated rounded w-5/6" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-card border border-surface-border rounded-2xl p-5 flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                  <div className="h-4 bg-surface-elevated rounded w-10" />
                </div>
                <div className="h-3 bg-surface-elevated rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Result Screen */}
      {analysisResult && (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
          {/* Summary Banner */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
              <FileCheck2 className="w-5 h-5" />
              <span>{t.reportSummary}</span>
            </div>
            <p className="text-sm sm:text-base text-content-primary leading-relaxed whitespace-pre-wrap">
              {analysisResult.explanation}
            </p>
          </div>

          {/* Biomarkers Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-content-primary tracking-tight">
              {t.biomarkers}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysisResult.extracted_data && Object.keys(analysisResult.extracted_data).length > 0 ? (
                Object.entries(analysisResult.extracted_data).map(([key, val]) => (
                  <div
                    key={key}
                    className="bg-surface-card border border-surface-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-bold text-content-primary leading-snug">
                        {key}
                      </span>
                      {getStatusBadge(val.status)}
                    </div>
                    <div className="flex items-baseline gap-1 pt-1 border-t border-surface-border/50">
                      <span className="text-2xl font-extrabold text-brand-600">
                        {val.value}
                      </span>
                      <span className="text-xs text-content-muted font-semibold">
                        {val.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-content-muted flex flex-col gap-0.5">
                      <span>{languageCode === 'en-IN' ? 'Normal Range: ' : 'सामान्य रेंज: '}{val.reference_range || 'N/A'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 text-center py-6 text-content-muted">
                  {languageCode === 'en-IN' ? 'No biomarker data found.' : 'कोई बायोमार्कर डेटा नहीं पाया गया।'}
                </div>
              )}
            </div>
          </div>

          {/* Doctor Discussion card */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex gap-4">
            <HelpCircle className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-sm text-blue-950 dark:text-blue-200">
                {languageCode === 'en-IN' ? 'Assistance for Doctor Consultation' : 'डॉक्टर से परामर्श के लिए सहायता'}
              </h4>
              <p className="text-xs sm:text-sm text-blue-900/90 dark:text-blue-300/90 leading-relaxed">
                {languageCode === 'en-IN' 
                  ? 'Please note that this is an AI-generated summary. Always share these reports and consult with your doctor.' 
                  : 'कृपया ध्यान दें कि यह AI-जनरेटेड सारांश है। अपने डॉक्टर से परामर्श करते समय इन रिपोर्टों को अवश्य साझा करें और उनसे सलाह लें।'}
              </p>
            </div>
          </div>

          {/* CTA: Upload another */}
          <div className="flex justify-center gap-4 pt-4 border-t border-surface-border">
            <button
              onClick={handleDownloadSlip}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
            >
              📄 <span>{t.pdfDownload}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-surface-border rounded-xl text-xs font-bold hover:bg-surface-elevated text-content-secondary shadow-sm transition-colors flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4 text-brand-600" />
              <span>{t.uploadAnother}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAnalyzer;
