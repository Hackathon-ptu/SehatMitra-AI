export type ReportState = 'idle' | 'file-selected' | 'processing' | 'success' | 'error';

export type LabValueStatus =
  | 'normal'
  | 'below_normal'
  | 'above_normal'
  | 'needs_attention'
  | 'abnormal'
  | 'critical'
  | 'unknown';

export type LabStatusType = 'normal' | 'abnormal' | 'critical';

export interface LabValueItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: LabValueStatus;
  explanation: string;
  possibleContext?: string;
  nextStep?: string;
}

export interface ReportResultData {
  reportType: string;
  reportDate: string;
  fileName: string;
  fileSize: string;
  summaryText: string;
  attentionItems: LabValueItem[];
  normalItems: LabValueItem[];
  doctorDiscussionPoints: string[];
}
