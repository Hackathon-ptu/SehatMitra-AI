import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportState, ReportResultData } from '../types/report';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { ReportHeader } from '../components/report/ReportHeader';
import { ReportIntro } from '../components/report/ReportIntro';
import { ReportUploadArea } from '../components/report/ReportUploadArea';
import { SelectedFile } from '../components/report/SelectedFile';
import { ReportProcessing } from '../components/report/ReportProcessing';
import { ReportOverview } from '../components/report/ReportOverview';
import { ExplanationBlock } from '../components/report/ExplanationBlock';
import { LabValue } from '../components/report/LabValue';
import { DoctorDiscussion } from '../components/report/DoctorDiscussion';
import { ReportError } from '../components/report/ReportError';
import { SafetyDisclaimer } from '../components/risk/SafetyDisclaimer';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Button } from '../components/common/Button';
import { UploadCloud } from 'lucide-react';
import { reportService } from '../services/reportService';

export const ReportPage: React.FC = () => {
  const [state, setState] = useState<ReportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [languageName, setLanguageName] = useState<string>('English');
  const [reportResult, setReportResult] = useState<ReportResultData | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const found = AVAILABLE_LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageName(found.nativeName);
      }
    } catch {
      setLanguageName('English');
    }
  }, []);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setState('file-selected');
  };

  const handleExplainReport = async () => {
    if (!selectedFile) return;
    setState('processing');
    try {
      const result = await reportService.explainReport(selectedFile);
      setReportResult(result);
      setState('success');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to explain medical report.');
      setState('error');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setReportResult(null);
    setState('idle');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary transition-colors">
      <ReportHeader
        onBack={() => navigate('/chat')}
        selectedLanguageName={languageName}
      />

      <main className="flex-1 w-full max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col">
        {state === 'idle' && (
          <ScrollReveal className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center">
            <ReportIntro />
            <ReportUploadArea
              onFileSelected={handleFileSelected}
              onError={(msg) => {
                setErrorMsg(msg);
                setState('error');
              }}
            />
          </ScrollReveal>
        )}

        {state === 'file-selected' && selectedFile && (
          <ScrollReveal className="w-full max-w-xl mx-auto my-auto flex flex-col items-center">
            <ReportIntro />
            <SelectedFile
              file={selectedFile}
              onRemove={handleReset}
              onExplain={handleExplainReport}
            />
          </ScrollReveal>
        )}

        {state === 'processing' && <ReportProcessing />}

        {state === 'error' && (
          <ReportError
            message={errorMsg || undefined}
            onRetry={handleExplainReport}
            onUploadAnother={handleReset}
          />
        )}

        {state === 'success' && reportResult && (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 my-auto text-left">
            
            {/* Overview Summary */}
            <ScrollReveal>
              <ReportOverview data={reportResult} />
            </ScrollReveal>

            {/* Results Worth Discussing */}
            {reportResult.attentionItems.length > 0 && (
              <ScrollReveal delay={100} className="flex flex-col gap-4">
                <h3 className="text-base font-bold text-content-primary tracking-tight">
                  Results worth discussing
                </h3>
                <div className="flex flex-col gap-4">
                  {reportResult.attentionItems.map((item) => (
                    <ExplanationBlock key={item.id} item={item} />
                  ))}
                </div>
              </ScrollReveal>
            )}

            {/* Within Reported Range */}
            {reportResult.normalItems.length > 0 && (
              <ScrollReveal delay={200} className="flex flex-col gap-3">
                <h3 className="text-base font-bold text-content-primary tracking-tight">
                  Within reported reference range
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reportResult.normalItems.map((item) => (
                    <LabValue key={item.id} item={item} />
                  ))}
                </div>
              </ScrollReveal>
            )}

            {/* What to discuss with doctor */}
            <ScrollReveal delay={200}>
              <DoctorDiscussion points={reportResult.doctorDiscussionPoints} />
            </ScrollReveal>

            {/* Safety Disclaimer */}
            <ScrollReveal delay={300} className="pt-2">
              <SafetyDisclaimer message={reportResult.summaryText ? undefined : undefined} />
            </ScrollReveal>

            {/* Explain another report CTA */}
            <div className="flex justify-center pt-4 border-t border-surface-border">
              <Button
                variant="outline"
                size="md"
                onClick={handleReset}
                leftIcon={<UploadCloud className="w-4 h-4 text-brand-600" />}
              >
                Explain another report
              </Button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};
