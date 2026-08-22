import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UI_TRANSLATIONS } from '../constants/translations';
import { Phone, AlertTriangle, MapPin, X, Info, HelpCircle } from 'lucide-react';

export const EmergencySOSModal = ({ isOpen, onClose, selectedLanguage = 'hi-IN' }) => {
  const { user } = useAuth();
  const [coords, setCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const t = UI_TRANSLATIONS[selectedLanguage] || UI_TRANSLATIONS['hi-IN'] || UI_TRANSLATIONS['en-IN'];

  useEffect(() => {
    if (isOpen) {
      setGpsLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setGpsLoading(false);
          },
          (error) => {
            console.warn("Geolocation permission or reading failed:", error);
            setGpsLoading(false);
          }
        );
      } else {
        setGpsLoading(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mapUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : '';
  const messageText = `EMERGENCY ALERT: I need immediate medical help. My location: ${mapUrl || 'Unknown coordinates'}`;
  
  const formattedPhone = user?.emergency_contact_phone ? user.emergency_contact_phone.replace(/\D/g, '') : '';
  
  const whatsappUrl = `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(messageText)}`;

  // First Aid Content Registry in multiple languages
  const firstAidInfo = {
    'hi-IN': [
      {
        title: "बेहोशी / सांस न लेना (CPR)",
        guidelines: "सांस न आने पर तुरंत CPR शुरू करें। 30 बार छाती को ज़ोर से दबाएं (Chest Compressions), फिर 2 बार मुंह से सांस दें (Rescue Breaths)। एम्बुलेंस आने तक इसे जारी रखें।"
      },
      {
        title: "गंभीर रक्तस्राव (Severe Bleeding)",
        guidelines: "साफ कपड़े से घाव पर सीधा दबाव (Direct Pressure) डालें। घायल अंग को ऊपर की ओर उठाएं। रक्तस्राव रोकने के लिए पट्टी कसकर बांधें।"
      },
      {
        title: "सीने में दर्द / दिल का दौरा (Chest Pain / Heart Attack)",
        guidelines: "मरीज को शांत स्थिति में बैठाएं। तंग कपड़े ढीले करें। सांस लेने में आसानी हो, ऐसा स्थान दें। बिना डॉक्टर सलाह के पानी या दवा न दें।"
      },
      {
        title: "दौरे (Seizures / Fits)",
        guidelines: "आसपास की नुकीली चीजें हटा लें। मरीज को करवट दिलाकर लिटाएं ताकि लार बाहर निकल सके। मुंह में कोई भी वस्तु न डालें।"
      }
    ],
    'en-IN': [
      {
        title: "Unconscious / Not Breathing (CPR)",
        guidelines: "Start CPR immediately: 30 hard chest compressions followed by 2 rescue breaths. Repeat continuously until professional help arrives."
      },
      {
        title: "Severe Bleeding",
        guidelines: "Apply direct pressure to the wound with a clean cloth. Elevate the injured limb if possible. Keep constant pressure."
      },
      {
        title: "Chest Pain / Heart Attack",
        guidelines: "Keep the patient sitting calmly. Loosen any tight clothing. Do not give food or water. Seek emergency transport immediately."
      },
      {
        title: "Seizures",
        guidelines: "Clear surrounding objects to prevent injury. Turn the patient gently onto their side. Do not force anything into their mouth."
      }
    ]
  };

  const protocols = firstAidInfo[selectedLanguage] || firstAidInfo['en-IN'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-surface-card border-2 border-red-500 rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
            <h2 className="font-extrabold text-base tracking-wide uppercase">
              {t.sosTitle || "Emergency SOS Help"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[500px] text-left">
          
          {/* Quick Dial Grid */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href="tel:108"
              className="col-span-2 py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg rounded-2xl shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              <Phone className="w-6 h-6 fill-white" />
              <span>{t.callAmbulance || "CALL 108 AMBULANCE"}</span>
            </a>

            <a
              href="tel:112"
              className="py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-red-500" />
              <span>112 Emergency</span>
            </a>

            <a
              href="tel:102"
              className="py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-pink-500" />
              <span>102 Pregnancy</span>
            </a>

            <a
              href="tel:104"
              className="col-span-2 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>104 Medical Advisory Helpline</span>
            </a>
          </div>

          {/* GPS Geolocation Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wider block mb-1">
                Your GPS Coordinates
              </span>
              {gpsLoading ? (
                <span className="text-xs text-slate-500 font-semibold animate-pulse block">
                  Fetching accurate live location...
                </span>
              ) : coords ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono text-slate-600 truncate block">
                    Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                  </span>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    🗺️ View on Google Maps
                  </a>
                </div>
              ) : (
                <span className="text-xs text-red-500 font-semibold block">
                  Geolocation permission denied or timed out.
                </span>
              )}
            </div>
          </div>

          {/* Emergency Contact Alerts */}
          {user?.emergency_contact_phone ? (
            <div className="p-4 rounded-2xl border-2 border-dashed border-red-300 bg-red-50/30 flex flex-col gap-3">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider block">
                  {t.contactAlert || "Alert Emergency Contact"}
                </span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {user.emergency_contact_name} ({user.emergency_contact_phone})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 active:scale-[0.99]"
                >
                  🟢 WhatsApp Live Map
                </a>
                <a
                  href={smsUrl}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 active:scale-[0.99]"
                >
                  💬 Send SOS SMS
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                No emergency contact registered yet. Please add one under <strong>My Medical Profile</strong> to enable 1-tap WhatsApp alert dispatch.
              </p>
            </div>
          )}

          {/* First Aid Guidance Accordion */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider mb-2">
              Immediate First-Aid Protocols
            </h3>
            {protocols.map((section, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{section.title}</span>
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </button>
                {expandedSection === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/50">
                    {section.guidelines}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
