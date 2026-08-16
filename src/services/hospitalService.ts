import { Hospital } from '../types/hospital';
import { RiskLevel } from '../types/risk';
import { getRecommendedHospitals } from '../data/mockHospitals';

export const hospitalService = {
  async getNearby(riskLevel: RiskLevel = 'high'): Promise<{
    primary: Hospital;
    others: Hospital[];
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getRecommendedHospitals(riskLevel));
      }, 600);
    });
  },
};
