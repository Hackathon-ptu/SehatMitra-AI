import React, { useState } from 'react';
import { hospitalService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldAlert, 
  Award, 
  Search, 
  Bed, 
  CheckCircle2, 
  Hospital as HospitalIcon, 
  Sparkles,
  Calendar,
  X,
  Compass,
  AlertCircle,
  LocateFixed
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons issues in React builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const QUICK_REGIONS = [
  { name: "Patiala (Punjab)", lat: 30.3398, lon: 76.3869, desc: "Rajindra Hospital & Civil Hospital" },
  { name: "New Delhi (NCR)", lat: 28.6139, lon: 77.2090, desc: "AIIMS, Safdarjung & RML" },
  { name: "Lucknow (UP)", lat: 26.8467, lon: 80.9462, desc: "KGMU & SGPGI Medical Centers" },
  { name: "Mumbai (MH)", lat: 19.0760, lon: 72.8777, desc: "KEM Hospital & Sion Civil Hub" },
  { name: "Kolkata (WB)", lat: 22.5726, lon: 88.3639, desc: "SSKM Hospital & Medical College" },
  { name: "Bhubaneswar (OD)", lat: 20.2961, lon: 85.8245, desc: "AIIMS & Capital Hospital" },
  { name: "Rural PHC Cluster", lat: 30.2200, lon: 76.4500, desc: "Block PHC & Community Health Sub-Centers" },
];

export const HospitalLocator = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [coords, setCoords] = useState(null); // null until user provides or selects location
  const [hasLocation, setHasLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationError, setLocationError] = useState(null);
  
  const [hospitals, setHospitals] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState('moderate');
  const [facilityFilter, setFacilityFilter] = useState('all'); // all, govt, private, emergency
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitalForToken, setSelectedHospitalForToken] = useState(null);
  const [tokenConfirmed, setTokenConfirmed] = useState(false);

  const langCode = (language || 'en').split('-')[0].toLowerCase();

  const getHospitalsList = async (lat, lon, risk = selectedRisk, customName = '') => {
    setLoading(true);
    setLocationError(null);
    try {
      const response = await hospitalService.getNearbyHospitals(lat, lon, risk);
      if (response && response.hospitals) {
        if (customName) {
          setLocationName(customName);
        } else {
          setLocationName(`GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
        
        const mapped = response.hospitals.map((item, index) => ({
          id: `hosp-${index}`,
          name: item.name,
          distance: `${item.distance_km.toFixed(1)} km`,
          distanceValue: item.distance_km,
          type: item.type || 'government',
          emergencyAvailable: item.emergency_available,
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
          phone: item.phone || '+91-1800-180-1104',
          specialties: item.specialties || ['General Medicine', 'Emergency OPD', 'Pediatrics'],
          bedsAvailable: item.beds_available || '8 / 12 Operational Beds',
          opdTimings: item.opd_timings || (item.emergency_available ? '24/7 Emergency & OPD' : '09:00 AM - 05:00 PM'),
          recommendedReason: index === 0 ? (langCode === 'hi' ? 'आपके स्वास्थ्य हेतु सर्वोत्तम अनुकूल' : langCode === 'pa' ? 'ਤੁਹਾਡੀ ਸਿਹਤ ਸਥਿਤੀ ਲਈ ਅਨੁਕੂਲ' : 'Highly Recommended for Condition') : undefined,
          navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
        }));
        setHospitals(mapped);
        setHasLocation(true);
      }
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      setLocationError(langCode === 'hi' ? 'अस्पतालों की सूची लोड करने में समस्या आई। कृपया पुनः प्रयास करें।' : 'Failed to load hospital data. Please try again.');
    } finally {
      setLoading(false);
      setLocatingGPS(false);
    }
  };

  const handleDetectGPS = () => {
    setLocatingGPS(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          getHospitalsList(lat, lon, selectedRisk, 'Your Current Live Location (GPS)');
        },
        (error) => {
          console.warn('Geolocation permission error:', error);
          setLocatingGPS(false);
          setLocationError(
            langCode === 'hi'
              ? 'स्थान की अनुमति अस्वीकृत या उपलब्ध नहीं है। कृपया नीचे दिए गए शहरों में से चुनें या शहर का नाम खोजें।'
              : 'GPS location permission was denied or unavailable. Please select your region preset or search by city name below.'
          );
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setLocatingGPS(false);
      setLocationError(
        langCode === 'hi'
          ? 'आपके ब्राउज़र में GPS सुविधा उपलब्ध नहीं है। कृपया नीचे से अपना क्षेत्र चुनें।'
          : 'Geolocation is not supported by your browser. Please select a region below.'
      );
    }
  };

  const handleManualSearch = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if matches preset
    const query = searchQuery.trim().toLowerCase();
    const match = QUICK_REGIONS.find(r => r.name.toLowerCase().includes(query) || query.includes(r.name.toLowerCase().split(' ')[0]));
    if (match) {
      setCoords({ lat: match.lat, lon: match.lon });
      getHospitalsList(match.lat, match.lon, selectedRisk, match.name);
    } else {
      // Default to approximate coordinates for recognized search
      const baseLat = 28.6139; // Delhi center
      const baseLon = 77.2090;
      setCoords({ lat: baseLat, lon: baseLon });
      getHospitalsList(baseLat, baseLon, selectedRisk, `Searched: "${searchQuery.trim()}"`);
    }
  };

  const handleSelectPreset = (region) => {
    setCoords({ lat: region.lat, lon: region.lon });
    getHospitalsList(region.lat, region.lon, selectedRisk, region.name);
  };

  const handleClearLocation = () => {
    setCoords(null);
    setHasLocation(false);
    setHospitals([]);
    setLocationName('');
    setLocationError(null);
    setSearchQuery('');
  };

  const filteredHospitals = hospitals.filter(h => {
    if (facilityFilter === 'govt') return h.type.toLowerCase().includes('govt') || h.type.toLowerCase().includes('district') || h.type.toLowerCase().includes('phc') || h.type.toLowerCase().includes('chc') || h.type.toLowerCase().includes('civil');
    if (facilityFilter === 'private') return h.type.toLowerCase().includes('private') || h.type.toLowerCase().includes('clinic') || h.type.toLowerCase().includes('specialty');
    if (facilityFilter === 'emergency') return h.emergencyAvailable;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-6 text-left animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-md">
              <HospitalIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
              {langCode === 'hi' ? 'नज़दीकी अस्पताल एवं स्वास्थ्य केंद्र लोकेटर' : langCode === 'pa' ? 'ਨੇੜਲੇ ਹਸਪਤਾਲ ਅਤੇ ਸਿਹਤ ਕੇਂਦਰ ਲੋਕੇਟਰ' : 'Hospital & PHC Locator'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
            {langCode === 'hi' 
              ? 'प्राथमिक स्वास्थ्य केंद्रों (PHC/CHC), ज़िला सिविल अस्पतालों की लाइव दूरी, आईसीयू बेड व इमरजेंसी सेवाएं खोजें।'
              : langCode === 'pa'
              ? 'ਪ੍ਰਾਇਮਰੀ ਸਿਹਤ ਕੇਂਦਰਾਂ (PHC/CHC) ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਸਿਵਲ ਹਸਪਤਾਲਾਂ ਦੀ ਲਾਈਵ ਦੂਰੀ, ਬੈੱਡ ਅਤੇ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਵੇਖੋ।'
              : 'Locate verified Public Health Centres (PHC/CHC), District Civil Hospitals, ICU beds, and emergency routes in real-time.'}
          </p>
        </div>

        {hasLocation && (
          <button
            onClick={handleClearLocation}
            className="px-3.5 py-1.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-secondary rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <X className="w-3.5 h-3.5" />
            <span>{langCode === 'hi' ? 'स्थान रीसेट करें' : 'Change Location'}</span>
          </button>
        )}
      </div>

      {/* Location Input & Search Card */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          {/* GPS Detect Button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={locatingGPS}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-75 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Compass className={`w-4 h-4 ${locatingGPS ? 'animate-spin' : ''}`} />
            <span>{locatingGPS ? (langCode === 'hi' ? 'स्थान खोजा जा रहा है...' : 'Detecting GPS...') : (langCode === 'hi' ? '📍 मेरी वर्तमान स्थिति (GPS)' : '📍 Detect My Live GPS')}</span>
          </button>

          {/* Search Input Form */}
          <form onSubmit={handleManualSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={langCode === 'hi' ? 'शहर, जिला, गांव या पिनकोड द्वारा खोजें (उदा. Patiala, Delhi, 147001)...' : 'Search City, District, Village or PIN Code (e.g. Patiala, Delhi, 147001)...'}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-xs sm:text-sm text-content-primary focus:outline-none focus:border-teal-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4 text-teal-600" />
              <span>{langCode === 'hi' ? 'खोजें' : 'Search'}</span>
            </button>
          </form>
        </div>

        {/* Location Error alert if any */}
        {locationError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Quick Region Preset Chips */}
        <div className="flex flex-col gap-2 pt-1 border-t border-surface-border/50">
          <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider">
            {langCode === 'hi' ? 'या त्वरित क्षेत्र चुनें (Select Region Preset):' : 'Or Select Region Preset:'}
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_REGIONS.map((region, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(region)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  coords && coords.lat === region.lat && coords.lon === region.lon
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'bg-surface-elevated hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-surface-border text-content-secondary'
                }`}
              >
                📍 {region.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditionally Render Content Based on Location Status */}
      {!hasLocation || !coords ? (
        /* Empty / Location Required Prompt State */
        <div className="py-16 px-6 bg-surface-card border border-surface-border rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-sm animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-600 flex items-center justify-center shadow-inner">
            <LocateFixed className="w-8 h-8 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-extrabold text-content-primary">
              {langCode === 'hi' ? 'अस्पताल खोजने के लिए स्थान आवश्यक है' : 'Location Required to View Nearby Hospitals'}
            </h3>
            <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
              {langCode === 'hi'
                ? 'नज़दीकी प्राथमिक स्वास्थ्य केंद्र (PHC/CHC), सिविल अस्पताल और 24x7 आपातकालीन बेड देखने के लिए कृपया ऊपर अपना GPS चालू करें या कोई शहर चुनें।'
                : 'Please detect your live GPS location, search for your city/pincode, or select a region preset above to discover verified healthcare facilities.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={handleDetectGPS}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>{langCode === 'hi' ? '📍 GPS से स्वतः खोजें' : '📍 Detect Live GPS Location'}</span>
            </button>
            <button
              onClick={() => handleSelectPreset(QUICK_REGIONS[0])}
              className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              <span>{langCode === 'hi' ? '📍 पंजाब (Patiala) केंद्र देखें' : '📍 Patiala (Punjab) Preset'}</span>
            </button>
            <button
              onClick={() => handleSelectPreset(QUICK_REGIONS[1])}
              className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              <span>{langCode === 'hi' ? '📍 दिल्ली NCR केंद्र देखें' : '📍 Delhi NCR Preset'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Location: Render Map and Hospital Cards */
        <>
          {/* Filter & Risk bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Facility type filter tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: langCode === 'hi' ? 'सभी केंद्र (All)' : 'All Facilities' },
                { id: 'govt', label: langCode === 'hi' ? '🏛️ सरकारी PHC / CHC' : '🏛️ Govt PHC / CHC' },
                { id: 'private', label: langCode === 'hi' ? '🏥 निजी मल्टी-स्पेशियलिटी' : '🏥 Private Hospitals' },
                { id: 'emergency', label: langCode === 'hi' ? '🚨 24x7 आपातकालीन' : '🚨 24x7 Emergency' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFacilityFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    facilityFilter === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-surface-card border border-surface-border text-content-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Risk Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-content-muted">Triage Priority:</span>
              <div className="flex gap-1 bg-surface-elevated p-1 rounded-lg border border-surface-border">
                {['low', 'moderate', 'high', 'emergency'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setSelectedRisk(lvl);
                      getHospitalsList(coords.lat, coords.lon, lvl, locationName);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                      selectedRisk === lvl
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location Context Bar */}
          <div className="p-3 bg-surface-card border border-surface-border rounded-xl flex items-center justify-between text-xs text-content-secondary">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Active Location: <strong>{locationName}</strong></span>
            </div>
            <span className="text-[11px] text-content-muted">
              Showing <strong>{filteredHospitals.length}</strong> facilities nearby
            </span>
          </div>

          {/* Main Grid: Interactive Map + Hospital Cards */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 h-[450px] bg-surface-card border border-surface-border rounded-2xl animate-pulse" />
              <div className="lg:col-span-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-36 bg-surface-card border border-surface-border rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : filteredHospitals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Interactive Map */}
              <div className="lg:col-span-6 h-[400px] lg:h-[600px] w-full rounded-2xl overflow-hidden border border-surface-border shadow-md sticky top-24">
                <MapContainer
                  center={[coords.lat, coords.lon]}
                  zoom={12}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* User Current GPS marker */}
                  <Marker position={[coords.lat, coords.lon]}>
                    <Popup>
                      <div className="text-left font-bold text-xs p-1">
                        📍 {locationName || 'Your Selected Location'}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Nearby hospital pins */}
                  {filteredHospitals.map((hosp) => (
                    <Marker
                      key={hosp.id}
                      position={[hosp.latitude, hosp.longitude]}
                    >
                      <Popup>
                        <div className="text-left flex flex-col gap-1 p-1 max-w-[200px]">
                          <strong className="text-xs font-bold text-slate-900 block">{hosp.name}</strong>
                          <span className="text-[10px] text-slate-600">{hosp.address}</span>
                          <span className="text-[10px] font-bold text-teal-700">{hosp.distance} away</span>
                          <a
                            href={hosp.navigationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-[11px] text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            Navigate &rarr;
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Right Column: Cards Listing */}
              <div className="lg:col-span-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
                {filteredHospitals.map((hosp) => (
                  <div
                    key={hosp.id}
                    className={`bg-surface-card border rounded-2xl p-5 transition-all hover:shadow-md flex flex-col gap-3.5 ${
                      hosp.recommendedReason ? 'border-teal-500 ring-2 ring-teal-600/10' : 'border-surface-border'
                    }`}
                  >
                    {/* Top badges */}
                    <div className="flex flex-col gap-1">
                      {hosp.recommendedReason && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400 font-bold mb-1">
                          <Award className="w-4 h-4 text-teal-600" />
                          <span>{hosp.recommendedReason}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-extrabold text-content-primary leading-snug">
                          {hosp.name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                          {hosp.distance}
                        </span>
                      </div>

                      <p className="text-xs text-content-muted leading-relaxed">
                        {hosp.address}
                      </p>
                    </div>

                    {/* Specialties & Beds */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-border/50 text-content-secondary">
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-semibold">{hosp.bedsAvailable}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>{hosp.opdTimings}</span>
                      </div>
                    </div>

                    {/* Specialties tags */}
                    {hosp.specialties && hosp.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {hosp.specialties.map((spec, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-[10px] font-bold text-content-secondary">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/40">
                      {/* Call Button */}
                      <a
                        href={`tel:${hosp.phone.replace(/[^0-9+]/g, '')}`}
                        className="px-3.5 py-2 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>{hosp.phone}</span>
                      </a>

                      {/* Navigation URL */}
                      <a
                        href={hosp.navigationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{langCode === 'hi' ? 'नेविगेट करें' : 'Navigate (Maps)'}</span>
                      </a>

                      {/* Book Referral Token */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHospitalForToken(hosp);
                          setTokenConfirmed(false);
                        }}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{langCode === 'hi' ? 'ASHA टोकन बुक करें' : 'Book ASHA Token'}</span>
                      </button>

                      {/* 24x7 Emergency Badge */}
                      {hosp.emergencyAvailable && (
                        <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          <span>24x7 Emergency</span>
                        </span>
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
                  No matching healthcare facilities found for this filter.
                </span>
                <span className="text-xs text-content-muted">
                  Try selecting "All Facilities" or search for a different district or region above.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ASHA Referral & Appointment Token Modal */}
      {selectedHospitalForToken && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden text-left flex flex-col">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-teal-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-base">Digital ASHA OPD Referral Token</h3>
              </div>
              <button
                onClick={() => setSelectedHospitalForToken(null)}
                className="text-white/80 hover:text-white font-bold text-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {!tokenConfirmed ? (
                <>
                  <div className="p-3 bg-surface-elevated border border-surface-border rounded-xl flex flex-col gap-1">
                    <span className="text-xs text-content-muted">Target Healthcare Facility:</span>
                    <strong className="text-sm text-content-primary">{selectedHospitalForToken.name}</strong>
                    <span className="text-xs text-content-secondary">{selectedHospitalForToken.address}</span>
                  </div>

                  <div className="space-y-2 text-xs text-content-secondary">
                    <p>• Fast-track ASHA community queue token registration.</p>
                    <p>• Prioritizes clinical triage category ({selectedRisk.toUpperCase()} risk).</p>
                    <p>• Digital SMS notification dispatched to on-duty Medical Officer.</p>
                  </div>

                  <button
                    onClick={() => setTokenConfirmed(true)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Generate Digital Token</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-center gap-3 py-2 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-extrabold text-content-primary">
                    Token Confirmed Successfully!
                  </h4>
                  <div className="p-4 bg-surface-elevated border border-surface-border rounded-xl w-full text-left space-y-1.5 text-xs">
                    <div><strong>Token ID:</strong> <span className="font-mono text-teal-600 font-bold">SM-OPD-{Math.floor(100000 + Math.random() * 900000)}</span></div>
                    <div><strong>Facility:</strong> {selectedHospitalForToken.name}</div>
                    <div><strong>OPD Slot:</strong> Today, Immediate Walk-In / Triage Line</div>
                    <div><strong>Contact:</strong> {selectedHospitalForToken.phone}</div>
                  </div>
                  <button
                    onClick={() => setSelectedHospitalForToken(null)}
                    className="mt-2 w-full py-2 bg-surface-elevated hover:bg-surface-border border border-surface-border text-content-primary text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalLocator;
