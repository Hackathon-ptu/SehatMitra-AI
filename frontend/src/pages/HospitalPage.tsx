import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital } from '../types/hospital';
import { RiskLevel } from '../types/risk';
import { hospitalService } from '../services/hospitalService';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { HospitalHeader } from '../components/hospital/HospitalHeader';
import { LocationContext } from '../components/hospital/LocationContext';
import { HospitalCard } from '../components/hospital/HospitalCard';
import { HospitalMapPreview } from '../components/hospital/HospitalMapPreview';
import { HospitalSkeleton } from '../components/hospital/HospitalSkeleton';
import { HospitalDetailsModal } from '../components/hospital/HospitalDetailsModal';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Flame, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';

export const HospitalPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRisk, setActiveRisk] = useState<RiskLevel>('moderate');
  const [languageName, setLanguageName] = useState<string>('English');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [hospitalsData, setHospitalsData] = useState<{ primary: Hospital; others: Hospital[] } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Read risk level from storage
    const savedRisk = localStorage.getItem('risk_level') as RiskLevel;
    if (savedRisk) {
      setActiveRisk(savedRisk);
    }
  }, []);

  useEffect(() => {
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const found = AVAILABLE_LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageName(found.nativeName);
      }
    } catch {
      setLanguageName('English');
    }

    const fetchHospitals = async (lat: number, lon: number, risk: RiskLevel) => {
      setIsLoading(true);
      try {
        const data = await hospitalService.getNearby(lat, lon, risk);
        setHospitalsData(data);
      } catch (err) {
        console.error('Failed to fetch hospitals from backend', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchHospitals(position.coords.latitude, position.coords.longitude, activeRisk);
        },
        (error) => {
          console.warn('Geolocation blocked or failed. Using New Delhi fallback.', error);
          fetchHospitals(28.6139, 77.2090, activeRisk);
        }
      );
    } else {
      fetchHospitals(28.6139, 77.2090, activeRisk);
    }
  }, [activeRisk]);

  const primary = hospitalsData?.primary || {
    id: 'placeholder-primary',
    name: 'Loading facility...',
    distance: '0 km',
    distanceValue: 0,
    type: 'government',
    category: 'phc',
    emergencyAvailable: false,
    address: '',
  };

  const others = hospitalsData?.others || [];

  const getRiskBanner = () => {
    switch (activeRisk) {
      case 'emergency':
        return (
          <div className="p-3.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-950 dark:text-red-200 text-xs font-semibold flex items-center gap-2 mb-4 shadow-subtle">
            <Flame className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>You may need urgent medical attention. Primary emergency care facility highlighted below.</span>
          </div>
        );
      case 'moderate':
        return (
          <div className="p-3.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 mb-4 shadow-subtle">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>A nearby primary healthcare facility (PHC) may be a good next step.</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary transition-colors">
      <HospitalHeader
        onBack={() => navigate('/risk-assessment')}
        selectedLanguageName={languageName}
      />

      <main className="flex-1 w-full max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        {isLoading ? (
          <div className="w-full max-w-3xl mx-auto my-auto">
            <HospitalSkeleton />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6">
            
            {/* Dev Mode Risk Level Switcher */}
            <div className="w-full p-2 rounded-md bg-surface-card border border-surface-border flex flex-wrap items-center justify-between gap-2 text-xs shadow-subtle">
              <span className="font-semibold text-content-muted px-2">
                Simulate Risk Flow:
              </span>
              <div className="flex items-center gap-1">
                {(['low', 'moderate', 'high', 'emergency'] as RiskLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveRisk(lvl)}
                    className={cn(
                      'px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[11px] transition-colors',
                      activeRisk === lvl
                        ? 'bg-brand-600 text-white shadow-subtle'
                        : 'bg-surface-elevated text-content-secondary hover:bg-brand-50 hover:text-brand-600 border border-surface-border'
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Guidance */}
            <ScrollReveal className="flex flex-col gap-1 text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
                Here are healthcare facilities near you.
              </h1>
              <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
                Based on your assessment, we’ve highlighted an option that may be relevant to your situation.
              </p>
            </ScrollReveal>

            {/* Context Banner */}
            {getRiskBanner()}

            {/* Location Bar */}
            <ScrollReveal delay={100}>
              <LocationContext />
            </ScrollReveal>

            {/* 2-Column Split Desktop Layout (1440px / 1024px) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Recommendations (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6 text-left">
                
                {/* Primary Recommended Facility */}
                <ScrollReveal delay={100} className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Recommended Nearby
                  </span>
                  <HospitalCard
                    hospital={primary}
                    isPrimary
                    onViewDetails={setSelectedHospital}
                  />
                </ScrollReveal>

                {/* Other Nearby Options */}
                {others.length > 0 && (
                  <ScrollReveal delay={200} className="flex flex-col gap-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                      Other Nearby Options
                    </span>
                    <div className="flex flex-col gap-3">
                      {others.map((hosp) => (
                        <HospitalCard
                          key={hosp.id}
                          hospital={hosp}
                          onViewDetails={setSelectedHospital}
                        />
                      ))}
                    </div>
                  </ScrollReveal>
                )}

              </div>

              {/* Right Column: Map Preview Placeholder (5 cols) */}
              <ScrollReveal delay={200} className="lg:col-span-5 h-full min-h-[360px] sticky top-20">
                <HospitalMapPreview primaryHospital={primary} />
              </ScrollReveal>

            </div>

          </div>
        )}
      </main>

      {/* Details Slide-out Drawer / Modal */}
      <HospitalDetailsModal
        hospital={selectedHospital}
        onClose={() => setSelectedHospital(null)}
      />
    </div>
  );
};
