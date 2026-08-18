import { RiskLevel, RiskAssessmentData, RiskReasonItem } from '../types/risk';
import { riskApi } from './api';

export const riskService = {
  async getAssessment(sessionId: number, symptomsData: Record<string, any>): Promise<RiskAssessmentData> {
    const res = await riskApi.assessRisk(sessionId, symptomsData);
    
    // Map backend reasons string array to RiskReasonItem array
    const reasons: RiskReasonItem[] = (res.reasons || []).map((text: string, index: number) => ({
      id: `reason-${index}`,
      text: text,
    }));

    // Map symptomsData to InformationItem array
    const infoConsidered = Object.entries(symptomsData).map(([key, val]) => {
      let displayValue = '';
      if (Array.isArray(val)) {
        displayValue = val.join(', ');
      } else if (typeof val === 'object' && val !== null) {
        displayValue = JSON.stringify(val);
      } else {
        displayValue = String(val);
      }
      return {
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        value: displayValue,
      };
    });

    const level: RiskLevel = res.risk_level;

    return {
      level,
      title: `${level.charAt(0).toUpperCase() + level.slice(1)} Risk Level`,
      summary: res.recommendation || 'Please read the clinical guidance carefully.',
      reasons,
      recommendationTitle: 'Recommended Care Action',
      recommendationDescription: res.recommendation,
      primaryActionLabel: level === 'emergency' ? 'Find Emergency Care' : 'Find Nearby Hospital',
      primaryActionRoute: '/hospitals',
      secondaryActionLabel: 'Retake Health Interview',
      informationConsidered: infoConsidered,
    };
  },
};
