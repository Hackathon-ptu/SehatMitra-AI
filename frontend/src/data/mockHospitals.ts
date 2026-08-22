import { Hospital } from '../types/hospital';
import { RiskLevel } from '../types/risk';

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Civil Hospital Kapurthala',
    distance: '1.8 km',
    distanceValue: 1.8,
    type: 'government',
    category: 'emergency_hospital',
    emergencyAvailable: true,
    address: 'Sultanpur Road, Kapurthala, Punjab 144601',
    recommendationReason: 'Closest government emergency hospital',
    navigationUrl: 'https://maps.google.com/?q=Civil+Hospital+Kapurthala',
    phone: '+91 1822 232 400',
    hours: '24/7 Emergency Care',
  },
  {
    id: 'hosp-2',
    name: 'Community Health Centre & PHC',
    distance: '1.2 km',
    distanceValue: 1.2,
    type: 'government',
    category: 'phc',
    emergencyAvailable: false,
    address: 'Main Bazaar Road, Kapurthala, Punjab 144601',
    recommendationReason: 'Nearest primary healthcare facility (PHC)',
    navigationUrl: 'https://maps.google.com/?q=Community+Health+Centre+Kapurthala',
    phone: '+91 1822 230 112',
    hours: '8:00 AM – 4:00 PM (OPD)',
  },
  {
    id: 'hosp-3',
    name: 'City Medical Care & Emergency Unit',
    distance: '2.6 km',
    distanceValue: 2.6,
    type: 'private',
    category: 'emergency_hospital',
    emergencyAvailable: true,
    address: 'GT Road Near Bus Stand, Kapurthala, Punjab 144601',
    recommendationReason: 'Private specialty care with 24/7 emergency',
    navigationUrl: 'https://maps.google.com/?q=City+Medical+Care+Kapurthala',
    phone: '+91 1822 245 888',
    hours: '24/7 Emergency Care',
  },
  {
    id: 'hosp-4',
    name: 'Sardar Patel Family Healthcare Centre',
    distance: '3.4 km',
    distanceValue: 3.4,
    type: 'private',
    category: 'clinic',
    emergencyAvailable: false,
    address: 'Urban Estate Phase 1, Kapurthala, Punjab 144601',
    recommendationReason: 'General physician consultation clinic',
    navigationUrl: 'https://maps.google.com/?q=Sardar+Patel+Healthcare+Kapurthala',
    phone: '+91 1822 250 333',
    hours: '9:00 AM – 7:00 PM',
  },
];

export function getRecommendedHospitals(riskLevel: RiskLevel): {
  primary: Hospital;
  others: Hospital[];
} {
  let sorted = [...MOCK_HOSPITALS];

  if (riskLevel === 'emergency') {
    // Prioritize emergencyAvailable === true, then distance
    sorted.sort((a, b) => {
      if (a.emergencyAvailable !== b.emergencyAvailable) {
        return a.emergencyAvailable ? -1 : 1;
      }
      return a.distanceValue - b.distanceValue;
    });
  } else if (riskLevel === 'moderate') {
    // Prioritize PHC / primary care, then distance
    sorted.sort((a, b) => {
      if (a.category === 'phc' && b.category !== 'phc') return -1;
      if (b.category === 'phc' && a.category !== 'phc') return 1;
      return a.distanceValue - b.distanceValue;
    });
  } else {
    // High / Low: Sort by distance
    sorted.sort((a, b) => a.distanceValue - b.distanceValue);
  }

  const primary = sorted[0];
  const others = sorted.slice(1);

  return { primary, others };
}
