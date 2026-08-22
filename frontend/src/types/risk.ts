export type RiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export interface RiskFactor {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
}

export interface RiskReasonItem {
  id: string;
  text: string;
  detail?: string;
}

export interface InformationItem {
  label: string;
  value: string;
}

export interface RiskAssessmentData {
  level: RiskLevel;
  title: string;
  summary: string;
  reasons: RiskReasonItem[];
  recommendationTitle: string;
  recommendationDescription: string;
  primaryActionLabel: string;
  primaryActionRoute: string;
  secondaryActionLabel?: string;
  informationConsidered: InformationItem[];
}
