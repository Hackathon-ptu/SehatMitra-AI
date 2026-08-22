import { Hospital, HospitalType, FacilityCategory } from '../types/hospital';
import { RiskLevel } from '../types/risk';
import { hospitalApi } from './api';

export const hospitalService = {
  async getNearby(
    lat: number,
    lon: number,
    riskLevel: RiskLevel = 'moderate'
  ): Promise<{
    primary: Hospital;
    others: Hospital[];
  }> {
    const res = await hospitalApi.getNearby(lat, lon, riskLevel);
    
    const hospitals: Hospital[] = res.hospitals.map((item: any, index: number) => {
      const typeLower = (item.type || '').toLowerCase();
      const hospitalType: HospitalType = typeLower.includes('private') ? 'private' : 'government';
      const category: FacilityCategory = item.emergency_available ? 'emergency_hospital' : 'phc';
      
      return {
        id: `hosp-${index}-${Date.now()}`,
        name: item.name,
        distance: `${item.distance_km.toFixed(1)} km`,
        distanceValue: item.distance_km,
        type: hospitalType,
        category: category,
        emergencyAvailable: item.emergency_available,
        address: item.address,
        recommendationReason: index === 0 ? `Highly matched for ${res.recommended_tier || 'your condition'}` : undefined,
        navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
        phone: 'N/A',
        hours: item.emergency_available ? '24/7' : '9:00 AM - 5:00 PM',
      };
    });

    const primary = hospitals[0] || {
      id: 'hosp-fallback',
      name: 'No nearby facilities found',
      distance: '0 km',
      distanceValue: 0,
      type: 'government' as HospitalType,
      category: 'phc' as FacilityCategory,
      emergencyAvailable: false,
      address: 'Please check your internet connection or search manually.',
    };

    return {
      primary,
      others: hospitals.slice(1),
    };
  },
};
