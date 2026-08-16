import { RiskLevel, RiskAssessmentData } from '../types/risk';
import { MOCK_RISK_ASSESSMENTS } from '../data/mockRisk';

export const riskService = {
  async getAssessment(level: RiskLevel = 'high'): Promise<RiskAssessmentData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_RISK_ASSESSMENTS[level]);
      }, 1000);
    });
  },
};
