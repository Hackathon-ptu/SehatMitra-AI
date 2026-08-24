import React, { useState, useRef } from 'react';
import { apiClient } from '../../services/api';
import { UploadCloud, FileText, AlertCircle, FileCheck2, HelpCircle, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { generateConsultationSlip } from '../../utils/pdfGenerator';

interface LabReportAnalyzerProps {
  languageCode?: string;
}

interface BiomarkerValue {
  value: number | string;
  unit: string;
  reference_range: string;
  status: string;
}

interface AnalysisResult {
  filename: string;
  extracted_data: Record<string, BiomarkerValue>;
  explanation: string;
}

export const LabReportAnalyzer: React.FC<LabReportAnalyzerProps> = ({ languageCode = 'hi-IN' }) => {
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isHindi = languageCode === 'hi-IN';

  const handleDownloadSlip = () => {
    if (!analysisResult) return;

    const biomarkers = Object.entries(analysisResult.extracted_data || {}).map(([name, val]) => ({
      name,
      value: val.value,
      unit: val.unit,
      reference_range: val.reference_range,
      status: val.status
    }));

    const slipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SehatMitra-AI Consultation Slip - ${user?.full_name || 'Patient'}</title>
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
          <div><strong>Patient Name:</strong> ${user?.full_name || 'Patient'}</div>
          <div><strong>Record Type:</strong> Diagnostic Document</div>
          <div><strong>Test / Exam Date:</strong> Recent</div>
          <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary-card">
          <strong style="color: #065f46;">Clinical Summary:</strong>
          <p style="margin: 6px 0 0 0;">${analysisResult.explanation}</p>
        </div>

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
            ${(biomarkers || []).map(b => `
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

  const validateAndSetFile = (selectedFile: File) => {
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'dcm', 'dicom'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    
    if (!validExtensions.includes(fileExtension)) {
      setErrorMsg(isHindi 
        ? 'कृपया केवल JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP या DICOM फाइल ही अपलोड करें।'
        : 'Please upload only JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP, or DICOM files.'
      );
      return;
    }
    setErrorMsg(null);
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/reports/analyze?language=${languageCode.split('-')[0]}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const backendData = res.data;
      const extracted_data: Record<string, BiomarkerValue> = {};
      if (Array.isArray(backendData.biomarkers)) {
        backendData.biomarkers.forEach((bm: any) => {
          if (bm && bm.name) {
            extracted_data[bm.name] = {
              value: bm.value,
              unit: bm.unit || '',
              reference_range: bm.reference_range || '',
              status: bm.status || 'normal'
            };
          }
        });
      }

      const mappedResult: AnalysisResult = {
        filename: file.name,
        extracted_data,
        explanation: backendData.patient_summary || 'Report analyzed successfully.'
      };
      setAnalysisResult(mappedResult);
    } catch (err) {
      console.error(err);
      setErrorMsg(isHindi ? 'जांच रिपोर्ट का विश्लेषण करने में विफलता हुई। कृपया फिर से प्रयास करें।' : 'Failed to analyze the report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const getStatusBadge = (status: string) => {
    const cleanStatus = status?.toLowerCase();
    if (cleanStatus === 'normal') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">Normal</span>;
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
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
          {isHindi ? 'मल्टीमोडल मेडिकल लैब रिपोर्ट विश्लेषक' : 'Multimodal Medical Report Analyzer'}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          {isHindi 
            ? 'अपनी रक्त जांच रिपोर्ट, पर्चे या लैब रिपोर्ट की फोटो खींचें या अपलोड करें। AI प्रमुख स्वास्थ्य संकेतकों का विश्लेषण करेगा।' 
            : 'Capture or upload your blood tests, prescriptions, or report images. SehatMitra-AI will parse key medical biomarkers.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-850 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Screen */}
      {!analysisResult && !loading && (
        <div className="flex flex-col gap-6 items-center">
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex-1 p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none ${
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
              <UploadCloud className="w-10 h-10 text-brand-600" />
              <span className="text-sm font-bold text-content-primary">
                {isHindi ? 'दस्तावेज़/रिपोर्ट अपलोड करें' : 'Upload Medical Document'}
              </span>
              <span className="text-[10.5px] text-content-muted">
                {isHindi ? 'JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP, DICOM (अधिकतम 10MB)' : 'JPG, PNG, WEBP, PDF, HEIC, TIFF, BMP, DICOM (Max 10MB)'}
              </span>
            </div>

            {/* Camera Capture Box */}
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 p-8 rounded-2xl border-2 border-dashed border-surface-border bg-surface-card hover:bg-surface-elevated text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none"
            >
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <Camera className="w-10 h-10 text-brand-600" />
              <span className="text-sm font-bold text-content-primary">
                {isHindi ? 'कैमरा से फोटो खींचें' : 'Take Report Photo'}
              </span>
              <span className="text-[10.5px] text-content-muted">
                {isHindi ? 'मोबाइल कैमरा से सीधे स्कैन करें' : 'Scan directly using phone camera'}
              </span>
            </div>
          </div>

          {file && (
            <div className="w-full max-w-xl bg-surface-card border border-surface-border rounded-xl p-4 flex items-center justify-between shadow-subtle animate-fade-in">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-brand-600 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-content-primary truncate max-w-[200px] sm:max-w-[300px]">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-border text-content-secondary transition-colors"
                >
                  {isHindi ? 'हटाएं' : 'Remove'}
                </button>
                <button
                  onClick={handleUploadAndAnalyze}
                  className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 shadow-md transition-colors"
                >
                  {isHindi ? 'रिपोर्ट का विश्लेषण करें' : 'Analyze Report'}
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
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
          
          {/* Summary Banner */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
              <FileCheck2 className="w-5 h-5" />
              <span>{isHindi ? 'रिपोर्ट सारांश' : 'Biomarker Summary'}</span>
            </div>
            <p className="text-sm sm:text-base text-content-primary leading-relaxed whitespace-pre-wrap font-medium">
              {analysisResult.explanation}
            </p>
          </div>

          {/* Biomarkers Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-content-primary tracking-tight">
              {isHindi ? 'पहचाने गए स्वास्थ्य संकेतक (बायोमार्कर)' : 'Extracted Health Biomarkers'}
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
                      <span>{isHindi ? 'सामान्य रेंज: ' : 'Normal Range: '}{val.reference_range || 'N/A'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 text-center py-6 text-content-muted">
                  {isHindi ? 'कोई बायोमार्कर डेटा नहीं पाया गया।' : 'No biomarker data found.'}
                </div>
              )}
            </div>
          </div>

          {/* Doctor Discussion card */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex gap-4">
            <HelpCircle className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-sm text-blue-950 dark:text-blue-200">
                {isHindi ? 'डॉक्टर से परामर्श के लिए सहायता' : 'Assistance for Doctor Consultation'}
              </h4>
              <p className="text-xs sm:text-sm text-blue-900/90 dark:text-blue-300/90 leading-relaxed">
                {isHindi 
                  ? 'कृपया ध्यान दें कि यह AI-जनरेटेड सारांश है। अपने डॉक्टर से परामर्श करते समय इन रिपोर्टों को अवश्य साझा करें और उनसे सलाह लें।' 
                  : 'Please note that this is an AI-generated summary. Always share these reports and consult with your doctor.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4 border-t border-surface-border">
            <button
              onClick={handleDownloadSlip}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
            >
              📄 <span>{isHindi ? 'परामर्श पर्ची डाउनलोड करें' : 'Download Consultation Slip'}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-surface-border rounded-xl text-xs font-bold hover:bg-surface-elevated text-content-secondary shadow-sm transition-colors flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4 text-brand-600" />
              <span>{isHindi ? 'दूसरा रिपोर्ट अपलोड करें' : 'Upload Another Report'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
