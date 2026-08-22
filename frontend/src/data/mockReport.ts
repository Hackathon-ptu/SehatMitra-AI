import { ReportResultData } from '../types/report';

export const MOCK_REPORT_RESULT: ReportResultData = {
  reportType: 'Complete Blood Count (CBC) & Fasting Glucose',
  reportDate: '12 Aug 2026',
  fileName: 'blood-report-scan.pdf',
  fileSize: '2.4 MB',
  summaryText: 'We identified 4 key test parameters from your blood test report. 2 values fall outside standard reference ranges.',
  attentionItems: [
    {
      id: 'lab-1',
      name: 'Hemoglobin',
      value: '9.2',
      unit: 'g/dL',
      referenceRange: '12.0 – 16.0 g/dL',
      status: 'below_normal',
      explanation: 'Your hemoglobin level is lower than the standard reference range shown on your report.',
      possibleContext: 'Lower hemoglobin can be associated with several factors, including iron deficiency or nutritional levels.',
      nextStep: 'Discuss this result with your doctor to evaluate whether nutritional support or further tests are appropriate.',
    },
    {
      id: 'lab-2',
      name: 'Fasting Blood Glucose',
      value: '112',
      unit: 'mg/dL',
      referenceRange: '70 – 99 mg/dL',
      status: 'above_normal',
      explanation: 'Your fasting blood sugar level is slightly above the typical reference range.',
      possibleContext: 'Slightly elevated fasting sugar may be influenced by recent dietary intake, fasting duration, or metabolic factors.',
      nextStep: 'A doctor can advise whether a repeat test or dietary monitoring is recommended.',
    },
  ],
  normalItems: [
    {
      id: 'lab-3',
      name: 'WBC (White Blood Cells)',
      value: '7,400',
      unit: '/µL',
      referenceRange: '4,000 – 11,000 /µL',
      status: 'normal',
      explanation: 'Your white blood cell count is within the standard reference range reported by the laboratory.',
    },
    {
      id: 'lab-4',
      name: 'Platelet Count',
      value: '210,000',
      unit: '/µL',
      referenceRange: '150,000 – 450,000 /µL',
      status: 'normal',
      explanation: 'Your platelet count falls comfortably within normal reference limits.',
    },
  ],
  doctorDiscussionPoints: [
    'Your hemoglobin level (9.2 g/dL) is below the reported reference range.',
    'Your fasting blood glucose (112 mg/dL) is slightly above the standard fasting range.',
    'Ask your physician whether dietary changes or blood iron testing are recommended.',
    'Bring this original lab report scan to your consultation.',
  ],
};
