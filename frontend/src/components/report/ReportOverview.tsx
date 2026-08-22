import React from 'react';
import { ReportResultData } from '../../types/report';
import { FileText, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ReportOverviewProps {
  data: ReportResultData;
}

export const ReportOverview: React.FC<ReportOverviewProps> = ({ data }) => {
  return (
    <div className="flex flex-col gap-4 w-full text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          Here’s what we found.
        </h2>
        <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
          These are the important values we could identify from your report.
        </p>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-content-primary">{data.reportType}</span>
            <span className="text-xs text-content-muted flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Report Date: {data.reportDate}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-surface-border pt-3 sm:pt-0 sm:pl-4">
          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{data.attentionItems.length} Need attention</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{data.normalItems.length} Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
