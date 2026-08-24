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
  const [selectedLanguage, setSelectedLanguage] = useState(languageCode.split('-')[0] || 'hi');

  const handleDownloadSlip = () => {
    const reportData = analysisResult;
    if (!reportData) return;

    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SehatMitra-AI Consultation Slip - ${reportData.patient_name || 'Patient'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 22px; font-weight: bold; color: #065f46; margin: 0; }
          .badge { background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; }
          .summary-card { background: #f0fdf4; border-left: 4px solid #059669; padding: 14px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; color: #475569; }
          td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
          .status-badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          .status-normal { background: #dcfce7; color: #166534; }
          .status-low { background: #fef3c7; color: #92400e; }
          .status-high { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">SehatMitra-AI Clinical Triage & Lab Slip</h1>
            <div style="font-size: 12px; color: #64748b;">Rural Digital Health Infrastructure • AI Pathological Review</div>
          </div>
          <div class="badge">TRIAGE SUMMARY</div>
        </div>

        <div class="meta-grid">
          <div><strong>Patient Name:</strong> ${reportData.patient_name || 'N/A'}</div>
          <div><strong>Record Type:</strong> ${reportData.report_type || 'Diagnostic Document'}</div>
          <div><strong>Test / Exam Date:</strong> ${reportData.test_date || 'Recent'}</div>
          <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary-card">
          <strong style="color: #065f46;">Clinical Summary:</strong>
          <p style="margin: 6px 0 0 0;">${reportData.patient_summary}</p>
        </div>

        ${reportData.diet_lifestyle_tips?.length ? `
          <div style="margin-bottom: 20px;">
            <strong style="font-size: 13px; color: #334155;">Dietary & Lifestyle Advice:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
              ${reportData.diet_lifestyle_tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <h3 style="font-size: 14px; margin-bottom: 8px;">Key Findings & Measurable Parameters:</h3>
        <table>
          <thead>
            <tr>
              <th>Parameter / Finding</th>
              <th>Observed Value</th>
              <th>Unit</th>
              <th>Reference / Norm</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.biomarkers || []).map(b => `
              <tr>
                <td><strong>${b.name}</strong></td>
                <td>${b.value}</td>
                <td>${b.unit || '-'}</td>
                <td>${b.reference_range || '-'}</td>
                <td><span class="status-badge status-${(b.status || 'normal').toLowerCase()}">${(b.status || 'NORMAL').toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          * This summary is prepared by SehatMitra-AI as a digital decision-support aid. Always consult a verified medical practitioner for prescription and formal diagnosis.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(slipHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'dcm', 'dicom'];
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setErrorMsg(languageCode === 'en-IN' 
        ? 'Please upload only JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP, or DICOM files.'
        : 'कृपया केवल JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP या DICOM फाइल ही अपलोड करें।'
      );
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
    e.preventDefault();
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
      const response = await reportService.uploadReport(file, selectedLanguage);
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
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Language Selector Dropdown */}
          <div className="flex flex-col gap-1.5 w-full max-w-xl text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-content-muted">
              {languageCode === 'en-IN' ? 'Select Analysis Language' : 'विश्लेषण की भाषा चुनें'}
            </label>
            <select 
              value={selectedLanguage} 
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-surface-card border border-surface-border text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 text-content-primary"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
          </div>

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
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.tiff,.tif,.bmp,.dcm,.dicom"
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
                {languageCode === 'en-IN' 
                  ? 'We accept JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP and DICOM documents (max 10MB)' 
                  : 'हम JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP और DICOM दस्तावेज़ स्वीकार करते हैं (अधिकतम 10MB)'}
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
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 text-left">
          {/* Metadata Bar */}
          {(analysisResult.patient_name || analysisResult.test_date || analysisResult.report_type) && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analysisResult.patient_name && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted block">{languageCode === 'en-IN' ? 'Patient Name' : 'मरीज का नाम'}</span>
                  <span className="text-sm font-bold text-content-primary">{analysisResult.patient_name}</span>
                </div>
              )}
              {analysisResult.test_date && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted block">{languageCode === 'en-IN' ? 'Test Date' : 'जांच की तारीख'}</span>
                  <span className="text-sm font-bold text-content-primary">{analysisResult.test_date}</span>
                </div>
              )}
              {analysisResult.report_type && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted block">{languageCode === 'en-IN' ? 'Report Type' : 'जांच का प्रकार'}</span>
                  <span className="text-sm font-bold text-content-primary">{analysisResult.report_type}</span>
                </div>
              )}
            </div>
          )}

          {/* Summary Banner */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
              <FileCheck2 className="w-5 h-5" />
              <span>{t.reportSummary}</span>
            </div>
            <p className="text-sm sm:text-base text-content-primary leading-relaxed whitespace-pre-wrap">
              {analysisResult.patient_summary}
            </p>
          </div>

          {/* Critical Flags Callout */}
          {analysisResult.critical_flags && analysisResult.critical_flags.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{languageCode === 'en-IN' ? 'Critical Findings & Flags' : 'महत्वपूर्ण चेतावनी संकेत'}</span>
              </div>
              <ul className="list-disc pl-5 text-sm text-red-900/90 dark:text-red-200/90 space-y-1">
                {analysisResult.critical_flags.map((flag, idx) => (
                  <li key={idx} className="font-semibold">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Biomarkers Table */}
          <div className="bg-surface-card border border-surface-border rounded-2xl shadow-sm overflow-hidden flex flex-col gap-1.5 p-6">
            <h3 className="text-base font-bold text-content-primary tracking-tight mb-2">
              {t.biomarkers}
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase text-content-muted font-bold">
                    <th className="pb-3 pr-4">{languageCode === 'en-IN' ? 'Test Name' : 'जांच का नाम'}</th>
                    <th className="pb-3 px-4">{languageCode === 'en-IN' ? 'Value' : 'मूल्य'}</th>
                    <th className="pb-3 px-4">{languageCode === 'en-IN' ? 'Reference Range' : 'संदर्भ सीमा'}</th>
                    <th className="pb-3 pl-4 text-right">{languageCode === 'en-IN' ? 'Status' : 'स्थिति'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-sm">
                  {analysisResult.biomarkers && analysisResult.biomarkers.length > 0 ? (
                    analysisResult.biomarkers.map((biomarker, idx) => (
                      <tr key={idx} className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="py-3 pr-4 font-bold text-content-primary">{biomarker.name}</td>
                        <td className="py-3 px-4 text-brand-600 font-extrabold">{biomarker.value} <span className="text-xs text-content-muted font-normal">{biomarker.unit}</span></td>
                        <td className="py-3 px-4 text-content-secondary font-medium">{biomarker.reference_range || 'N/A'}</td>
                        <td className="py-3 pl-4 text-right">{getStatusBadge(biomarker.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-content-muted">
                        {languageCode === 'en-IN' ? 'No biomarker data found.' : 'कोई बायोमार्कर डेटा नहीं पाया गया।'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Diet & Lifestyle Suggestions */}
          {analysisResult.diet_lifestyle_tips && analysisResult.diet_lifestyle_tips.length > 0 && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>{languageCode === 'en-IN' ? 'Actionable Wellness & Diet Recommendations' : 'आहार और जीवन शैली संबंधी सिफारिशें'}</span>
              </div>
              <ul className="list-disc pl-5 text-sm text-emerald-900/90 dark:text-emerald-200/90 space-y-1">
                {analysisResult.diet_lifestyle_tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

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

          {/* CTA: Actions */}
          <div className="flex justify-center gap-4 pt-4 border-t border-surface-border">
            <button
              onClick={handleDownloadSlip}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
            >
              📄 <span>{t.pdfDownload}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-surface-border rounded-xl text-xs font-bold hover:bg-surface-elevated text-content-secondary shadow-sm transition-colors flex items-center gap-2"
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
