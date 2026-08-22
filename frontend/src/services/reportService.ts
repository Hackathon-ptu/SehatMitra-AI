import { ReportResultData, LabValueItem, LabValueStatus } from '../types/report';
import { reportApi } from './api';

export const reportService = {
  async explainReport(file: File): Promise<ReportResultData> {
    const res = await reportApi.uploadReport(file);
    
    const attentionItems: LabValueItem[] = [];
    const normalItems: LabValueItem[] = [];
    
    // Parse extracted_data and separate into attention vs normal items
    if (res.extracted_data) {
      Object.entries(res.extracted_data).forEach(([key, val]: [string, any], index: number) => {
        const itemStatus = (val.status || '').toLowerCase();
        let status: LabValueStatus = 'normal';
        if (itemStatus.includes('low')) {
          status = 'below_normal';
        } else if (itemStatus.includes('high')) {
          status = 'above_normal';
        } else if (itemStatus.includes('attention') || itemStatus.includes('abnormal')) {
          status = 'needs_attention';
        }

        const labItem: LabValueItem = {
          id: `lab-${index}-${Date.now()}`,
          name: key,
          value: String(val.value),
          unit: val.unit || '',
          referenceRange: val.reference_range || '',
          status,
          explanation: `Your ${key} is ${val.status}.`,
          possibleContext: status !== 'normal' ? `A lower value of ${key} can sometimes relate to dietary factors or temporary conditions.` : undefined,
          nextStep: status !== 'normal' ? 'Discuss with your doctor to check if any action is needed.' : undefined,
        };

        if (status === 'normal') {
          normalItems.push(labItem);
        } else {
          attentionItems.push(labItem);
        }
      });
    }

    const doctorDiscussionPoints = attentionItems.map(
      (item) => `What could be the primary reason for my low ${item.name}?`
    );
    if (doctorDiscussionPoints.length === 0) {
      doctorDiscussionPoints.push('All parameters look normal, is there any other preventative test I should consider?');
    }

    return {
      reportType: 'Hematology Report / Blood Test',
      reportDate: new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
      fileName: res.filename || file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      summaryText: res.explanation || 'Report processed successfully.',
      attentionItems,
      normalItems,
      doctorDiscussionPoints,
    };
  },
};
