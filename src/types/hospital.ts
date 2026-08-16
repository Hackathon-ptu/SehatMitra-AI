export type HospitalType = 'government' | 'private';
export type FacilityCategory = 'emergency_hospital' | 'phc' | 'general_hospital' | 'clinic';
export type FacilityType = 'Government' | 'Private' | 'Clinic' | 'Specialty Hospital';

export interface Hospital {
  id: string;
  name: string;
  distance: string;
  distanceValue: number;
  type: HospitalType;
  category: FacilityCategory;
  emergencyAvailable: boolean;
  address: string;
  recommendationReason?: string;
  navigationUrl?: string;
  phone?: string;
  hours?: string;
}
