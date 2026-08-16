import { ReportResultData } from '../types/report';
import { MOCK_REPORT_RESULT } from '../data/mockReport';

export const reportService = {
  async explainReport(_file: File): Promise<ReportResultData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_REPORT_RESULT);
      }, 1500);
    });
  },
};
