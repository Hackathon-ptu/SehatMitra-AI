import React, { useState } from 'react';
import { hospitalService } from '../services/api';
import { Navigation, MapPin, Phone, Clock, ArrowRight, ShieldAlert, Award } from 'lucide-react';

export const HospitalLocator = () => {
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState('moderate');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);

  const getHospitalsList = async (lat, lon) => {
    setLoading(true);
    try {
      const response = await hospitalService.getNearbyHospitals(lat, lon, selectedRisk);
      if (response && response.hospitals) {
        // Formulate coordinates into display name or set fallback text
        setLocationName(`अक्षांश: ${lat.toFixed(4)}, देशांतर: ${lon.toFixed(4)}`);
        
        // Map elements to standardized local formats
        const mapped = response.hospitals.map((item, index) => ({
          id: `hosp-${index}`,
          name: item.name,
          distance: `${item.distance_km.toFixed(1)} km`,
          distanceValue: item.distance_km,
          type: item.type || 'government',
          emergencyAvailable: item.emergency_available,
          address: item.address,
          recommendedReason: index === 0 ? `Highly matched for ${response.recommended_tier || 'your condition'}` : undefined,
          navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
          phone: item.phone || 'उपलब्ध नहीं',
          hours: item.emergency_available ? '24/7' : '9:00 AM - 5:00 PM',
        }));
        setHospitals(mapped);
      }
    } catch (err) {
      console.error(err);
      alert('अस्पताल सूची प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          getHospitalsList(lat, lon);
        },
        (error) => {
          console.warn('Geolocation blocked or failed. Using New Delhi fallback.', error);
          const fallbackLat = 28.6139;
          const fallbackLon = 77.2090;
          setCoords({ lat: fallbackLat, lon: fallbackLon });
          getHospitalsList(fallbackLat, fallbackLon);
        }
      );
    } else {
      const fallbackLat = 28.6139;
      const fallbackLon = 77.2090;
      setCoords({ lat: fallbackLat, lon: fallbackLon });
      getHospitalsList(fallbackLat, fallbackLon);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in text-left">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          नज़दीकी अस्पताल एवं स्वास्थ्य केंद्र खोजें (Find Nearby Hospitals)
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          तटस्थ स्वास्थ्य केंद्रों (PHC/CHC) एवं ज़िला अस्पतालों की वर्तमान स्थिति और दूरी का पता लगाएं।
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Risk Filter */}
        <div className="flex flex-col gap-2 flex-1">
          <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
            जोखिम स्तर का चयन करें (Simulate Risk Level)
          </span>
          <div className="flex flex-wrap gap-2">
            {['low', 'moderate', 'high', 'emergency'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedRisk(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  selectedRisk === lvl
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface-card border border-surface-border text-content-secondary hover:bg-surface-elevated'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-end">
          <button
            onClick={handleFetchLocation}
            className="w-full md:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            <span>अस्पताल खोजें (Find Hospitals)</span>
          </button>
        </div>
      </div>

      {/* Location Context Bar */}
      {locationName && (
        <div className="p-3 bg-surface-card border border-surface-border rounded-xl flex items-center gap-2 mb-6 text-xs text-content-secondary">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <span>आपकी खोजी गई स्थिति: <strong>{locationName}</strong></span>
        </div>
      )}

      {/* Grid listing */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-card border border-surface-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : hospitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* List display */}
          <div className="md:col-span-12 flex flex-col gap-4">
            {hospitals.map((hosp) => (
              <div
                key={hosp.id}
                className={`bg-surface-card border rounded-2xl p-5 sm:p-6 transition-all hover:shadow-md flex flex-col sm:flex-row gap-4 justify-between items-start ${
                  hosp.recommendedReason ? 'border-brand-500 ring-2 ring-brand-600/10' : 'border-surface-border'
                }`}
              >
                <div className="flex flex-col gap-2.5 flex-1">
                  {hosp.recommendedReason && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold">
                      <Award className="w-4 h-4" />
                      <span>{hosp.recommendedReason}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-content-primary leading-snug">
                      {hosp.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 border border-brand-200 text-brand-700">
                      {hosp.distance}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-elevated border border-surface-border text-content-secondary">
                      {hosp.type === 'government' ? 'सरकारी (Govt)' : 'निजी (Private)'}
                    </span>
                  </div>

                  <p className="text-xs text-content-muted leading-relaxed max-w-xl">
                    {hosp.address}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 border-t border-surface-border/50 text-content-secondary">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand-600" />
                      <span>फोन: {hosp.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>समय: {hosp.hours}</span>
                    </div>
                  </div>
                </div>

                {/* Right CTA */}
                <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                  <a
                    href={hosp.navigationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg border border-brand-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>मार्गदर्शन (Navigate)</span>
                  </a>
                  {hosp.emergencyAvailable && (
                    <div className="px-3 py-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-1.5 justify-center">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300">24Hr आपातकालीन सेवा</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-card border border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3">
          <MapPin className="w-12 h-12 text-content-disabled" />
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-sm font-bold text-content-primary">
              कोई अस्पताल डेटा लोड नहीं हुआ है
            </span>
            <span className="text-xs text-content-muted">
              उपरोक्त बटन पर क्लिक करके अस्पताल और प्राथमिक स्वास्थ्य केंद्रों का पता लगाएं।
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalLocator;
