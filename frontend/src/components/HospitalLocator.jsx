import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hospitalService } from '../services/api';
import { Navigation, MapPin, Phone, Clock, ShieldAlert, Award } from 'lucide-react';
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

const LOCAL_TRANSLATIONS = {
  en: {
    title: "Find Nearby Hospitals & Health Centers",
    subtitle: "Locate public health centers (PHC/CHC) and district hospitals, including their active status and distance.",
    risk_label: "Select Risk Level",
    find_btn: "Find Hospitals",
    searched_location: "Your searched location: ",
    you_are_here: "You are here",
    navigate: "Navigate",
    government: "Government",
    private: "Private",
    phone: "Phone",
    hours: "Hours",
    hours_standard: "9:00 AM - 5:00 PM",
    emergency_24h: "24Hr Emergency",
    no_hospitals: "No hospital data loaded",
    click_to_locate: "Click the button above to locate nearby hospitals and primary health centers.",
    phone_na: "N/A",
    gps_lat_lon: "Latitude: {lat}, Longitude: {lon}",
    highly_matched: "Highly matched for your condition",
    error_fetch: "Failed to fetch hospital list. Please try again."
  },
  hi: {
    title: "नज़दीकी अस्पताल एवं स्वास्थ्य केंद्र खोजें",
    subtitle: "प्राथमिक स्वास्थ्य केंद्रों (PHC/CHC) एवं ज़िला अस्पतालों की वर्तमान स्थिति और दूरी का पता लगाएं।",
    risk_label: "जोखिम स्तर का चयन करें",
    find_btn: "अस्पताल खोजें",
    searched_location: "आपकी खोजी गई स्थिति: ",
    you_are_here: "आपकी स्थिति",
    navigate: "मार्गदर्शन",
    government: "सरकारी",
    private: "निजी",
    phone: "फोन",
    hours: "समय",
    hours_standard: "सुबह 9:00 - शाम 5:00",
    emergency_24h: "24Hr आपातकालीन",
    no_hospitals: "कोई अस्पताल डेटा लोड नहीं हुआ है",
    click_to_locate: "उपरोक्त बटन पर क्लिक करके अस्पताल और प्राथमिक स्वास्थ्य केंद्रों का पता लगाएं।",
    phone_na: "उपलब्ध नहीं",
    gps_lat_lon: "अक्षांश: {lat}, देशांतर: {lon}",
    highly_matched: "आपके स्वास्थ्य के अनुकूल",
    error_fetch: "अस्पताल सूची प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।"
  },
  bn: {
    title: "নিকটবর্তী হাসপাতাল ও স্বাস্থ্য কেন্দ্র খুঁজুন",
    subtitle: "জনস্বাস্থ্য কেন্দ্র (PHC/CHC) এবং জেলা হাসপাতালের বর্তমান অবস্থা ও দূরত্ব সনাক্ত করুন।",
    risk_label: "ঝুঁকির মাত্রা নির্বাচন করুন",
    find_btn: "হাসপাতাল খুঁজুন",
    searched_location: "আপনার অনুসন্ধান করা অবস্থান: ",
    you_are_here: "আপনি এখানে আছেন",
    navigate: "পথনির্দেশ",
    government: "সরকারি",
    private: "বেসরকারি",
    phone: "ফোন",
    hours: "সময়",
    hours_standard: "সকাল ৯:০০ - বিকেল ৫:০০",
    emergency_24h: "২৪ ঘণ্টা জরুরি সেবা",
    no_hospitals: "কোনো হাসপাতালের তথ্য লোড করা হয়নি",
    click_to_locate: "নিকটবর্তী হাসপাতাল এবং প্রাথমিক স্বাস্থ্য কেন্দ্রগুলি সনাক্ত করতে উপরের বোতামটি ক্লিক করুন।",
    phone_na: "পাওয়া যায়নি",
    gps_lat_lon: "অক্ষাংশ: {lat}, দ্রাঘিমাংশ: {lon}",
    highly_matched: "আপনার অবস্থার জন্য অত্যন্ত উপযোগী",
    error_fetch: "হাসপাতালের তালিকা পেতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
  },
  pa: {
    title: "ਨੇੜਲੇ ਹਸਪਤਾਲ ਅਤੇ ਸਿਹਤ ਕੇਂਦਰ ਲੱਭੋ",
    subtitle: "ਪਬਲਿਕ ਸਿਹਤ ਕੇਂਦਰਾਂ (PHC/CHC) ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਹਸਪਤਾਲਾਂ ਦੀ ਮੌਜੂਦਾ ਸਥਿਤੀ ਅਤੇ ਦੂਰੀ ਦਾ ਪਤਾ ਲਗਾਓ।",
    risk_label: "ਜੋਖਮ ਦਾ ਪੱਧਰ ਚੁਣੋ",
    find_btn: "ਹਸਪਤਾਲ ਲੱਭੋ",
    searched_location: "ਤੁਹਾਡੀ ਖੋਜੀ ਗਈ ਸਥਿਤੀ: ",
    you_are_here: "ਤੁਸੀਂ ਇੱਥੇ ਹੋ",
    navigate: "ਮਾਰਗਦਰਸ਼ਨ",
    government: "ਸਰਕਾਰੀ",
    private: "ਨਿੱਜੀ",
    phone: "ਫ਼ੋਨ",
    hours: "ਸਮਾਂ",
    hours_standard: "ਸਵੇਰੇ 9:00 - ਸ਼ਾਮ 5:00",
    emergency_24h: "24 ਘੰਟੇ ਐਮਰਜੈਂਸੀ",
    no_hospitals: "ਕੋਈ ਹਸਪਤਾਲ ਡੇਟਾ ਲੋਡ ਨਹੀਂ ਕੀਤਾ ਗਿਆ",
    click_to_locate: "ਨੇੜਲੇ ਹਸਪਤਾਲਾਂ ਅਤੇ ਪ੍ਰਾਇਮਰੀ ਸਿਹਤ ਕੇਂਦਰਾਂ ਦਾ ਪਤਾ ਲਗਾਉਣ ਲਈ ਉੱਪਰ ਦਿੱਤੇ ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।",
    phone_na: "ਉਪਲਬਧ ਨਹੀਂ",
    gps_lat_lon: "ਅਕਸ਼ਾਂਸ਼: {lat}, ਰੇਖਾਂਸ਼: {lon}",
    highly_matched: "ਤੁਹਾਡੀ ਸਿਹਤ ਸਥਿਤੀ ਲਈ ਅਨੁਕੂਲ",
    error_fetch: "ਹਸਪਤਾਲ ਦੀ ਸੂਚੀ ਪ੍ਰਾਪਤ ਕਰਨ ਵਿੱਚ ਅਸਫਲ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  }
};

export const HospitalLocator = () => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState('moderate');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);

  const activeLang = i18n.language || 'en';
  const primaryLang = activeLang.split('-')[0].toLowerCase();
  const trans = LOCAL_TRANSLATIONS[primaryLang] || LOCAL_TRANSLATIONS.en;

  const getHospitalsList = async (lat, lon) => {
    setLoading(true);
    try {
      const response = await hospitalService.getNearbyHospitals(lat, lon, selectedRisk);
      if (response && response.hospitals) {
        setLocationName(trans.gps_lat_lon.replace('{lat}', lat.toFixed(4)).replace('{lon}', lon.toFixed(4)));
        
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
          recommendedReason: index === 0 ? trans.highly_matched : undefined,
          navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
          phone: item.phone || trans.phone_na,
          hours: item.emergency_available ? '24/7' : trans.hours_standard,
        }));
        setHospitals(mapped);
      }
    } catch (err) {
      console.error(err);
      alert(trans.error_fetch);
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
    <div className="max-w-6xl mx-auto p-4 animate-fade-in text-left">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          {trans.title}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          {trans.subtitle}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Risk Filter */}
        <div className="flex flex-col gap-2 flex-1">
          <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
            {trans.risk_label}
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
            <span>{trans.find_btn}</span>
          </button>
        </div>
      </div>

      {/* Location Context Bar */}
      {locationName && (
        <div className="p-3 bg-surface-card border border-surface-border rounded-xl flex items-center gap-2 mb-6 text-xs text-content-secondary">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <span>{trans.searched_location}<strong>{locationName}</strong></span>
        </div>
      )}

      {/* Main Grid: Map & Details Listing */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-card border border-surface-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : hospitals.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Map */}
          <div className="lg:col-span-6 h-[400px] lg:h-[550px] w-full rounded-2xl overflow-hidden border border-surface-border shadow-md">
            {coords && (
              <MapContainer
                center={[coords.lat, coords.lon]}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User Current GPS marker */}
                <Marker position={[coords.lat, coords.lon]}>
                  <Popup>{trans.you_are_here}</Popup>
                </Marker>

                {/* Nearby hospital pins */}
                {hospitals.map((hosp) => (
                  <Marker
                    key={hosp.id}
                    position={[hosp.latitude, hosp.longitude]}
                  >
                    <Popup>
                      <div className="text-left flex flex-col gap-1 p-1">
                        <strong className="text-sm block">{hosp.name}</strong>
                        <span className="text-xs text-content-muted">{hosp.address}</span>
                        <span className="text-xs font-bold text-brand-600">{trans.phone}: {hosp.phone}</span>
                        <a
                          href={hosp.navigationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          {trans.navigate} &rarr;
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Right Column: List display */}
          <div className="lg:col-span-6 flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
            {hospitals.map((hosp) => (
              <div
                key={hosp.id}
                className={`bg-surface-card border rounded-2xl p-5 transition-all hover:shadow-md flex flex-col gap-3 ${
                  hosp.recommendedReason ? 'border-brand-500 ring-2 ring-brand-600/10' : 'border-surface-border'
                }`}
              >
                <div className="flex flex-col gap-1">
                  {hosp.recommendedReason && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold mb-1">
                      <Award className="w-4 h-4" />
                      <span>{hosp.recommendedReason}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-content-primary leading-snug">
                      {hosp.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 border border-brand-200 text-brand-700">
                      {hosp.distance}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-elevated border border-surface-border text-content-secondary">
                      {hosp.type === 'government' ? trans.government : trans.private}
                    </span>
                  </div>

                  <p className="text-xs text-content-muted leading-relaxed">
                    {hosp.address}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 border-t border-surface-border/50 text-content-secondary mt-1.5">
                    <span>{trans.phone}: {hosp.phone}</span>
                    <span>{trans.hours}: {hosp.hours}</span>
                  </div>
                </div>

                {/* Navigation and emergency badge */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={hosp.navigationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg border border-brand-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{trans.navigate}</span>
                  </a>
                  {hosp.emergencyAvailable && (
                    <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-1.5 justify-center">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300">{trans.emergency_24h}</span>
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
              {trans.no_hospitals}
            </span>
            <span className="text-xs text-content-muted">
              {trans.click_to_locate}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalLocator;
