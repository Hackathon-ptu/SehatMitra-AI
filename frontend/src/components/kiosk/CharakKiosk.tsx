/**
 * CharakKiosk.tsx — Sprint 5
 * Charak-Kiosk: OPD Patient Self-Service Intake Interface (AIIA PS-26047)
 *
 * New in Sprint 5:
 *  • 12-Language selector (EN, HI, PA, BN, MR, TE, TA, GU, KN, ML, OR, UR)
 *  • ABHA QR scanner modal (webcam-based html5-qrcode)
 *  • Snap Old Prescription → OCR via /api/v1/kiosk/ocr-prescription
 *  • Voice medication extraction via IBM Granite
 *  • Dynamic UI label localization dictionary
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Flame,
  Activity,
  AlertTriangle,
  Mic,
  MicOff,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  X,
  User,
  Pill,
  Stethoscope,
  Timer,
  ExternalLink,
  Sun,
  Moon,
  Clock,
  Hospital,
  QrCode,
  Camera,
  Languages,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IntakeResponse {
  status: string;
  token_id: string;
  red_flag: boolean;
  red_flag_reason: string | null;
  cabin?: string;
  cockpit_url: string;
  saved_to_history?: boolean;
}

// ─── 12-Language Dictionary ───────────────────────────────────────────────────

type LangCode =
  | 'en-IN' | 'hi-IN' | 'pa-IN' | 'bn-IN' | 'mr-IN'
  | 'te-IN' | 'ta-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN'
  | 'or-IN' | 'ur-IN';

interface LangStrings {
  label: string;       // native name shown in selector
  flag: string;        // emoji flag
  patientName: string;
  age: string;
  gender: string;
  complaint: string;
  agni: string;
  koshtha: string;
  medicines: string;
  speak: string;
  stop: string;
  next: string;
  back: string;
  submit: string;
  scanAbha: string;
  snapRx: string;
  voiceMeds: string;
  placeholderName: string;
  placeholderComplaint: string;
  selectGender: string;
  male: string;
  female: string;
  other: string;
}

const LANG_DICT: Record<LangCode, LangStrings> = {
  'en-IN': {
    label: 'English', flag: '🌐',
    patientName: 'Patient Name', age: 'Age', gender: 'Gender',
    complaint: 'Voice Complaint', agni: 'Digestive Fire (Agni)',
    koshtha: 'Bowel Type (Koshtha)', medicines: 'Current Medicines',
    speak: 'Speak', stop: 'Stop', next: 'Next', back: 'Back',
    submit: 'Submit & Get Token', scanAbha: 'Scan ABHA QR',
    snapRx: 'Snap Old Prescription', voiceMeds: 'Voice Medicines',
    placeholderName: 'Full name...', placeholderComplaint: 'Describe your main complaint...',
    selectGender: 'Select...', male: 'Male', female: 'Female', other: 'Other',
  },
  'hi-IN': {
    label: 'हिंदी', flag: '🇮🇳',
    patientName: 'मरीज़ का नाम', age: 'आयु', gender: 'लिंग',
    complaint: 'मुख्य शिकायत', agni: 'पाचन शक्ति (अग्नि)',
    koshtha: 'मल प्रकृति (कोष्ठ)', medicines: 'वर्तमान दवाइयां',
    speak: 'बोलें', stop: 'रोकें', next: 'आगे', back: 'वापस',
    submit: 'जमा करें और टोकन पाएं', scanAbha: 'ABHA QR स्कैन करें',
    snapRx: 'पुरानी पर्ची की फ़ोटो', voiceMeds: 'दवाइयां बोलें',
    placeholderName: 'पूरा नाम...', placeholderComplaint: 'अपनी मुख्य तकलीफ़ बताएं...',
    selectGender: 'चुनें...', male: 'पुरुष', female: 'महिला', other: 'अन्य',
  },
  'pa-IN': {
    label: 'ਪੰਜਾਬੀ', flag: '🇮🇳',
    patientName: 'ਮਰੀਜ਼ ਦਾ ਨਾਮ', age: 'ਉਮਰ', gender: 'ਲਿੰਗ',
    complaint: 'ਮੁੱਖ ਸ਼ਿਕਾਇਤ', agni: 'ਪਾਚਨ ਸ਼ਕਤੀ (ਅਗਨੀ)',
    koshtha: 'ਟੱਟੀ ਕਿਸਮ (ਕੋਸ਼ਠ)', medicines: 'ਮੌਜੂਦਾ ਦਵਾਈਆਂ',
    speak: 'ਬੋਲੋ', stop: 'ਰੋਕੋ', next: 'ਅੱਗੇ', back: 'ਵਾਪਸ',
    submit: 'ਜਮ੍ਹਾਂ ਕਰੋ ਅਤੇ ਟੋਕਨ ਲਓ', scanAbha: 'ABHA QR ਸਕੈਨ ਕਰੋ',
    snapRx: 'ਪੁਰਾਣੀ ਪਰਚੀ ਦੀ ਫ਼ੋਟੋ', voiceMeds: 'ਦਵਾਈਆਂ ਬੋਲੋ',
    placeholderName: 'ਪੂਰਾ ਨਾਮ...', placeholderComplaint: 'ਆਪਣੀ ਮੁੱਖ ਸ਼ਿਕਾਇਤ ਦੱਸੋ...',
    selectGender: 'ਚੁਣੋ...', male: 'ਮਰਦ', female: 'ਔਰਤ', other: 'ਹੋਰ',
  },
  'bn-IN': {
    label: 'বাংলা', flag: '🇮🇳',
    patientName: 'রোগীর নাম', age: 'বয়স', gender: 'লিঙ্গ',
    complaint: 'প্রধান অভিযোগ', agni: 'পাচন শক্তি (অগ্নি)',
    koshtha: 'মলের ধরন (কোষ্ঠ)', medicines: 'বর্তমান ওষুধ',
    speak: 'বলুন', stop: 'থামুন', next: 'পরবর্তী', back: 'পিছনে',
    submit: 'জমা করুন এবং টোকেন নিন', scanAbha: 'ABHA QR স্ক্যান করুন',
    snapRx: 'পুরনো প্রেসক্রিপশনের ছবি', voiceMeds: 'ওষুধ বলুন',
    placeholderName: 'পুরো নাম...', placeholderComplaint: 'আপনার প্রধান সমস্যা বলুন...',
    selectGender: 'বেছে নিন...', male: 'পুরুষ', female: 'মহিলা', other: 'অন্যান্য',
  },
  'mr-IN': {
    label: 'मराठी', flag: '🇮🇳',
    patientName: 'रुग्णाचे नाव', age: 'वय', gender: 'लिंग',
    complaint: 'मुख्य तक्रार', agni: 'पाचन शक्ती (अग्नी)',
    koshtha: 'मल प्रकृती (कोष्ठ)', medicines: 'सध्याची औषधे',
    speak: 'बोला', stop: 'थांबा', next: 'पुढे', back: 'मागे',
    submit: 'सबमिट करा व टोकन मिळवा', scanAbha: 'ABHA QR स्कॅन करा',
    snapRx: 'जुन्या चिठ्ठीचा फोटो', voiceMeds: 'औषधे बोला',
    placeholderName: 'पूर्ण नाव...', placeholderComplaint: 'आपली मुख्य तक्रार सांगा...',
    selectGender: 'निवडा...', male: 'पुरुष', female: 'स्त्री', other: 'इतर',
  },
  'te-IN': {
    label: 'తెలుగు', flag: '🇮🇳',
    patientName: 'రోగి పేరు', age: 'వయస్సు', gender: 'లింగం',
    complaint: 'ప్రధాన ఫిర్యాదు', agni: 'జీర్ణ శక్తి (అగ్ని)',
    koshtha: 'మలం రకం (కోష్ఠ)', medicines: 'ప్రస్తుత మందులు',
    speak: 'మాట్లాడండి', stop: 'ఆపండి', next: 'తదుపరి', back: 'వెనుకకు',
    submit: 'సమర్పించండి మరియు టోకెన్ పొందండి', scanAbha: 'ABHA QR స్కాన్ చేయండి',
    snapRx: 'పాత ప్రిస్క్రిప్షన్ ఫోటో', voiceMeds: 'మందులు చెప్పండి',
    placeholderName: 'పూర్తి పేరు...', placeholderComplaint: 'మీ ప్రధాన సమస్య చెప్పండి...',
    selectGender: 'ఎంచుకోండి...', male: 'పురుషుడు', female: 'స్త్రీ', other: 'ఇతర',
  },
  'ta-IN': {
    label: 'தமிழ்', flag: '🇮🇳',
    patientName: 'நோயாளி பெயர்', age: 'வயது', gender: 'பாலினம்',
    complaint: 'முதன்மை புகார்', agni: 'செரிமான சக்தி (அக்னி)',
    koshtha: 'மல வகை (கோஷ்ட)', medicines: 'தற்போதைய மருந்துகள்',
    speak: 'பேசுங்கள்', stop: 'நிறுத்துங்கள்', next: 'அடுத்து', back: 'திரும்பு',
    submit: 'சமர்ப்பிக்கவும் & டோக்கன் பெறவும்', scanAbha: 'ABHA QR ஸ்கேன் செய்யவும்',
    snapRx: 'பழைய மருந்துச்சீட்டு புகைப்படம்', voiceMeds: 'மருந்துகள் சொல்லுங்கள்',
    placeholderName: 'முழு பெயர்...', placeholderComplaint: 'உங்கள் முதன்மை பிரச்சனையை சொல்லுங்கள்...',
    selectGender: 'தேர்ந்தெடுக்கவும்...', male: 'ஆண்', female: 'பெண்', other: 'மற்றவை',
  },
  'gu-IN': {
    label: 'ગુજરાતી', flag: '🇮🇳',
    patientName: 'દર્દીનું નામ', age: 'ઉંમર', gender: 'જાતિ',
    complaint: 'મુખ્ય ફરિયાદ', agni: 'પાચન શક્તિ (અગ્નિ)',
    koshtha: 'મળ પ્રકૃતિ (કોષ્ઠ)', medicines: 'હાલની દવાઓ',
    speak: 'બોલો', stop: 'રોકો', next: 'આગળ', back: 'પાછળ',
    submit: 'સબમિટ કરો અને ટોકન મેળવો', scanAbha: 'ABHA QR સ્કૅન કરો',
    snapRx: 'જૂની પ્રિસ્ક્રિપ્શનનો ફોટો', voiceMeds: 'દવાઓ બોલો',
    placeholderName: 'પૂરું નામ...', placeholderComplaint: 'તમારી મુખ્ય તકલીફ જણાવો...',
    selectGender: 'પસંદ કરો...', male: 'પુરુષ', female: 'સ્ત્રી', other: 'અન્ય',
  },
  'kn-IN': {
    label: 'ಕನ್ನಡ', flag: '🇮🇳',
    patientName: 'ರೋಗಿಯ ಹೆಸರು', age: 'ವಯಸ್ಸು', gender: 'ಲಿಂಗ',
    complaint: 'ಮುಖ್ಯ ದೂರು', agni: 'ಜೀರ್ಣ ಶಕ್ತಿ (ಅಗ್ನಿ)',
    koshtha: 'ಮಲ ಪ್ರಕೃತಿ (ಕೋಷ್ಠ)', medicines: 'ಪ್ರಸ್ತುತ ಔಷಧಗಳು',
    speak: 'ಮಾತನಾಡಿ', stop: 'ನಿಲ್ಲಿಸಿ', next: 'ಮುಂದೆ', back: 'ಹಿಂದೆ',
    submit: 'ಸಲ್ಲಿಸಿ ಮತ್ತು ಟೋಕನ್ ಪಡೆಯಿರಿ', scanAbha: 'ABHA QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    snapRx: 'ಹಳೆಯ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ', voiceMeds: 'ಔಷಧಗಳನ್ನು ಹೇಳಿ',
    placeholderName: 'ಪೂರ್ಣ ಹೆಸರು...', placeholderComplaint: 'ನಿಮ್ಮ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಹೇಳಿ...',
    selectGender: 'ಆಯ್ಕೆ ಮಾಡಿ...', male: 'ಪುರುಷ', female: 'ಮಹಿಳೆ', other: 'ಇತರೆ',
  },
  'ml-IN': {
    label: 'മലയാളം', flag: '🇮🇳',
    patientName: 'രോഗിയുടെ പേര്', age: 'പ്രായം', gender: 'ലിംഗം',
    complaint: 'പ്രധാന പരാതി', agni: 'ദഹന ശക്തി (അഗ്നി)',
    koshtha: 'മലം തരം (കോഷ്ഠ)', medicines: 'നിലവിലെ മരുന്നുകൾ',
    speak: 'സംസാരിക്കൂ', stop: 'നിർത്തൂ', next: 'അടുത്തത്', back: 'പിന്നോട്ട്',
    submit: 'സമർപ്പിക്കൂ & ടോക്കൺ നേടൂ', scanAbha: 'ABHA QR സ്കാൻ ചെയ്യൂ',
    snapRx: 'പഴയ പ്രിസ്ക്രിപ്ഷൻ ഫോട്ടോ', voiceMeds: 'മരുന്നുകൾ പറയൂ',
    placeholderName: 'പൂർണ്ണ പേര്...', placeholderComplaint: 'നിങ്ങളുടെ പ്രധാന പ്രശ്നം പറയൂ...',
    selectGender: 'തിരഞ്ഞെടുക്കൂ...', male: 'പുരുഷൻ', female: 'സ്ത്രീ', other: 'മറ്റുള്ളവ',
  },
  'or-IN': {
    label: 'ଓଡ଼ିଆ', flag: '🇮🇳',
    patientName: 'ରୋଗୀଙ୍କ ନାମ', age: 'ବୟସ', gender: 'ଲିଙ୍ଗ',
    complaint: 'ମୁଖ୍ୟ ଅଭିଯୋଗ', agni: 'ପାଚନ ଶକ୍ତି (ଅଗ୍ନି)',
    koshtha: 'ମଳ ପ୍ରକୃତି (କୋଷ୍ଠ)', medicines: 'ବର୍ତ୍ତମାନ ଔଷଧ',
    speak: 'କୁହନ୍ତୁ', stop: 'ବନ୍ଦ କରନ୍ତୁ', next: 'ପରବର୍ତ୍ତୀ', back: 'ପଛକୁ',
    submit: 'ଦାଖଲ କରନ୍ତୁ ଏବଂ ଟୋକେନ ନିଅନ୍ତୁ', scanAbha: 'ABHA QR ସ୍କ୍ୟାନ କରନ୍ତୁ',
    snapRx: 'ପୁରୁଣା ପ୍ରେସ୍କ୍ରିପ୍ସନ ଫଟୋ', voiceMeds: 'ଔଷଧ କୁହନ୍ତୁ',
    placeholderName: 'ପୂର୍ଣ ନାମ...', placeholderComplaint: 'ଆପଣଙ୍କ ମୁଖ୍ୟ ସମସ୍ୟା କୁହନ୍ତୁ...',
    selectGender: 'ବାଛନ୍ତୁ...', male: 'ପୁରୁଷ', female: 'ମହିଳା', other: 'ଅନ୍ୟ',
  },
  'ur-IN': {
    label: 'اردو', flag: '🇮🇳',
    patientName: 'مریض کا نام', age: 'عمر', gender: 'جنس',
    complaint: 'اہم شکایت', agni: 'ہاضمے کی طاقت (اگنی)',
    koshtha: 'پاخانے کی قسم (کوشٹھ)', medicines: 'موجودہ دوائیں',
    speak: 'بولیں', stop: 'روکیں', next: 'آگے', back: 'پیچھے',
    submit: 'جمع کریں اور ٹوکن لیں', scanAbha: 'ABHA QR اسکین کریں',
    snapRx: 'پرانے نسخے کی تصویر', voiceMeds: 'دوائیں بولیں',
    placeholderName: 'پورا نام...', placeholderComplaint: 'اپنی اہم تکلیف بتائیں...',
    selectGender: 'منتخب کریں...', male: 'مرد', female: 'عورت', other: 'دیگر',
  },
};

const LANG_ORDER: LangCode[] = [
  'en-IN','hi-IN','pa-IN','bn-IN','mr-IN','te-IN',
  'ta-IN','gu-IN','kn-IN','ml-IN','or-IN','ur-IN',
];

// ─── Localized Complaint Categories ─────────────────────────────────────────

interface ComplaintCat {
  id: string;
  complaint: string;
  emoji: string;
  label: string;   // primary label (localized)
  sub: string;     // secondary descriptor (localized)
}

const COMPLAINT_I18N: Record<LangCode, ComplaintCat[]> = {
  'en-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'Stomach',   sub: 'Acidity / Gas'      },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'Joint Pain', sub: 'Knee / Back'        },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'Cough',      sub: 'Breathlessness'     },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'Diabetes',   sub: 'Urination / Sugar'  },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'High BP',    sub: 'Headache'           },
  ],
  'hi-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'पेट',           sub: 'एसिडिटी / गैस'       },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'जोड़ों का दर्द', sub: 'घुटने / पीठ'         },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'खांसी',          sub: 'सांस फूलना'           },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'शुगर / मधुमेह',  sub: 'बार-बार पेशाब'        },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'उच्च बीपी',      sub: 'सिरदर्द'              },
  ],
  'pa-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'ਪੇਟ',          sub: 'ਐਸਿਡਿਟੀ / ਗੈਸ'      },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'ਜੋੜਾਂ ਦਾ ਦਰਦ', sub: 'ਗੋਡੇ / ਪਿੱਠ'         },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'ਖੰਘ',           sub: 'ਸਾਹ ਚੜ੍ਹਨਾ'          },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ਸ਼ੂਗਰ',         sub: 'ਵਾਰ-ਵਾਰ ਪਿਸ਼ਾਬ'      },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ਹਾਈ ਬੀਪੀ',     sub: 'ਸਿਰਦਰਦ'              },
  ],
  'bn-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'পেট',          sub: 'অ্যাসিডিটি / গ্যাস'  },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'জয়েন্টের ব্যথা',sub: 'হাঁটু / পিঠ'         },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'কাশি',          sub: 'শ্বাসকষ্ট'            },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ডায়াবেটিস',    sub: 'বারবার প্রস্রাব'       },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'হাই বিপি',      sub: 'মাথাব্যথা'            },
  ],
  'mr-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'पोट',          sub: 'आम्लपित्त / गॅस'      },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'सांधेदुखी',    sub: 'गुडघे / पाठ'          },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'खोकला',        sub: 'दम लागणे'              },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'मधुमेह',       sub: 'वारंवार लघवी'          },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'उच्च बीपी',    sub: 'डोकेदुखी'              },
  ],
  'te-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'కడుపు',        sub: 'యాసిడిటీ / గ్యాస్'   },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'కీళ్ళ నొప్పి', sub: 'మోకాలు / వెన్ను'      },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'దగ్గు',         sub: 'శ్వాస తీసుకోవడం'      },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'మధుమేహం',      sub: 'తరచుగా మూత్రం'        },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'అధిక రక్తపోటు', sub: 'తలనొప్పి'             },
  ],
  'ta-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'வயிறு',        sub: 'அமிலம் / வாயு'        },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'மூட்டு வலி',   sub: 'முழங்கால் / முதுகு'   },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'இருமல்',        sub: 'மூச்சுத் திணறல்'      },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'நீரிழிவு',     sub: 'அடிக்கடி சிறுநீர்'   },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'உயர் ரத்த அழுத்தம்', sub: 'தலைவலி'        },
  ],
  'gu-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'પેટ',          sub: 'એસિડિટી / ગૅસ'       },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'સાંધાનો દુ:ખાવો', sub: 'ઘૂંટણ / પીઠ'       },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'ઉધરસ',         sub: 'શ્વાસ ચઢવો'            },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ડાયાબિટીસ',    sub: 'વારંવાર પેશાબ'         },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ઉચ્ચ BP',       sub: 'માથાનો દુ:ખાવો'       },
  ],
  'kn-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'ಹೊಟ್ಟೆ',        sub: 'ಆಮ್ಲೀಯತೆ / ಗ್ಯಾಸ್'    },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'ಕೀಲು ನೋವು',    sub: 'ಮೊಣಕಾಲು / ಬೆನ್ನು'     },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'ಕೆಮ್ಮು',         sub: 'ಉಸಿರಾಟ ತೊಂದರೆ'        },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ಮಧುಮೇಹ',       sub: 'ಆಗಾಗ ಮೂತ್ರ'           },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ', sub: 'ತಲೆನೋವು'            },
  ],
  'ml-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'വയറ്',         sub: 'അമ്ലത / വായു'          },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'സന്ധിവേദന',   sub: 'കാൽമുട്ട് / പുറം'     },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'ചുമ',          sub: 'ശ്വാസതടസ്സം'           },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'പ്രമേഹം',      sub: 'ഇടക്കിടെ മൂത്രം'     },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ഉയർന്ന BP',    sub: 'തലവേദന'                },
  ],
  'or-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'ପେଟ',          sub: 'ଏସିଡ / ଗ୍ୟାସ'        },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'ଗଣ୍ଠି ଯନ୍ତ୍ରଣା', sub: 'ଆଣ୍ଠୁ / ପିଠ'         },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'କାଶ',           sub: 'ଶ୍ୱାସ ଅଟକା'           },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ମଧୁମେହ',       sub: 'ବାରମ୍ବାର ପ୍ରସ୍ରାବ'    },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ଉଚ୍ଚ ବିପି',     sub: 'ମୁଣ୍ଡ ବ୍ୟଥା'          },
  ],
  'ur-IN': [
    { id: 'gastritis',    complaint: 'stomach_pain',  emoji: '🫃', label: 'پیٹ',           sub: 'تیزابیت / گیس'        },
    { id: 'arthritis',    complaint: 'joint_pain',    emoji: '🦴', label: 'جوڑوں کا درد',  sub: 'گھٹنا / پیٹھ'         },
    { id: 'cough',        complaint: 'cough',         emoji: '🫁', label: 'کھانسی',        sub: 'سانس لینا مشکل'       },
    { id: 'diabetes',     complaint: 'diabetes',      emoji: '🩸', label: 'ذیابیطس',       sub: 'بار بار پیشاب'         },
    { id: 'hypertension', complaint: 'hypertension',  emoji: '💓', label: 'ہائی بی پی',    sub: 'سر درد'                },
  ],
};

const AGNI_OPTIONS = [
  {
    id: 'mandagni', label: 'Mandagni', sublabel: 'Slow / Heavy', hindi: 'मंदाग्नि', desc: 'भारीपन, नींद', emoji: '🌊',
    active_light: 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 text-blue-900',
    active_dark:  'border-blue-400 bg-blue-900/40 ring-2 ring-blue-400',
    inactive_light:'border-slate-300 bg-white hover:border-blue-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-blue-600 text-white',
  },
  {
    id: 'vishamagni', label: 'Vishamagni', sublabel: 'Irregular / Gas', hindi: 'विषमाग्नि', desc: 'अनियमित, गैस', emoji: '💨',
    active_light: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 text-amber-900',
    active_dark:  'border-amber-400 bg-amber-900/40 ring-2 ring-amber-400',
    inactive_light:'border-slate-300 bg-white hover:border-amber-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-amber-600 text-white',
  },
  {
    id: 'tikshnagni', label: 'Tikshnagni', sublabel: 'Intense / Acidic', hindi: 'तीक्ष्णाग्नि', desc: 'जलन, एसिडिटी', emoji: '🔥',
    active_light: 'border-red-500 bg-red-50 ring-2 ring-red-400 text-red-900',
    active_dark:  'border-red-400 bg-red-900/40 ring-2 ring-red-400',
    inactive_light:'border-slate-300 bg-white hover:border-red-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-red-600 text-white',
  },
  {
    id: 'samagni', label: 'Samagni', sublabel: 'Balanced', hindi: 'समाग्नि', desc: 'सामान्य', emoji: '✅',
    active_light: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 text-emerald-900',
    active_dark:  'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400',
    inactive_light:'border-slate-300 bg-white hover:border-emerald-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-emerald-600 text-white',
  },
];

const KOSHTHA_OPTIONS = [
  {
    id: 'krura', label: 'Krura', sublabel: 'Hard / Constipated', hindi: 'क्रूर', emoji: '🪨',
    active_light: 'border-stone-500 bg-stone-50 ring-2 ring-stone-400 text-stone-900',
    active_dark:  'border-stone-400 bg-stone-900/40 ring-2 ring-stone-400',
    inactive_light:'border-slate-300 bg-white hover:border-stone-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-stone-500 text-white',
  },
  {
    id: 'madhyama', label: 'Madhyama', sublabel: 'Regular / Normal', hindi: 'मध्यम', emoji: '🟢',
    active_light: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 text-emerald-900',
    active_dark:  'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400',
    inactive_light:'border-slate-300 bg-white hover:border-emerald-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-emerald-500 text-white',
  },
  {
    id: 'mridu', label: 'Mridu', sublabel: 'Loose / Soft', hindi: 'मृदु', emoji: '💧',
    active_light: 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-400 text-cyan-900',
    active_dark:  'border-cyan-400 bg-cyan-900/40 ring-2 ring-cyan-400',
    inactive_light:'border-slate-300 bg-white hover:border-cyan-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-cyan-500 text-white',
  },
];

const ALLOPATHIC_QUICK = [
  'Metformin', 'Amlodipine', 'Atorvastatin', 'Metoprolol',
  'Pantoprazole', 'Aspirin', 'Losartan', 'Glibenclamide',
];

const AYURVEDIC_QUICK = [
  'Ashwagandha', 'Triphala', 'Brahmi', 'Neem',
  'Tulsi', 'Shatavari', 'Guggul', 'Haritaki',
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const OPD_NAME = import.meta.env.VITE_KIOSK_OPD_NAME || 'Civil Hospital OPD';

// ─── Interaction preview helper ───────────────────────────────────────────────

const KNOWN_INTERACTIONS: Record<string, string[]> = {
  warfarin:  ['turmeric', 'ginger', 'garlic', 'ginkgo', 'guggul'],
  aspirin:   ['willow bark', 'ginger', 'turmeric'],
  metformin: ['gymnema', 'bitter melon'],
  losartan:  ['licorice', 'hawthorn'],
};

function previewInteractions(allopathic: string[], ayurvedic: string[]): string[] {
  const warnings: string[] = [];
  allopathic.forEach((drug) => {
    const key = drug.toLowerCase();
    for (const [d, herbs] of Object.entries(KNOWN_INTERACTIONS)) {
      if (key.includes(d)) {
        ayurvedic.forEach((herb) => {
          if (herbs.some((h) => herb.toLowerCase().includes(h))) {
            warnings.push(`${drug} + ${herb}: potential interaction — consult doctor`);
          }
        });
      }
    }
  });
  return warnings;
}

// ─── Live clock helper ────────────────────────────────────────────────────────

const LiveClock: React.FC<{ dark: boolean }> = ({ dark }) => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
      <Clock className="w-3.5 h-3.5" />
      {time}
    </div>
  );
};

// ─── ABHA QR Scanner Modal ────────────────────────────────────────────────────

interface AbhaQrModalProps {
  dark: boolean;
  onClose: () => void;
  onScan: (name: string, age: string, abhaId: string) => void;
}

const AbhaQrModal: React.FC<AbhaQrModalProps> = ({ dark, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualAbha, setManualAbha] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAge, setManualAge] = useState('');

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanning(true);
      })
      .catch(() => setError('Camera not available. Enter ABHA ID manually.'));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Simple QR decode attempt via BarcodeDetector (Chrome/Edge 83+)
  useEffect(() => {
    if (!scanning) return;
    const BarcodeDetector = (window as any).BarcodeDetector;
    if (!BarcodeDetector) return;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    let rafId: number;
    const tick = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue as string;
            // ABHA QR v2 is JSON: {"hidn":"<id>","name":"<n>","dob":"<d>","gender":"<g>"}
            try {
              const parsed = JSON.parse(raw);
              const abhaId = parsed.hidn || parsed.healthId || raw;
              const name = parsed.name || '';
              const dobYear = parsed.dob ? new Date().getFullYear() - parseInt(parsed.dob.split('-')[0] || '0') : 0;
              onScan(name, dobYear > 0 ? String(dobYear) : '', abhaId);
              return;
            } catch {
              onScan('', '', raw);
              return;
            }
          }
        } catch { /* ignore */ }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [scanning, onScan]);

  const handleManualSubmit = () => {
    if (!manualAbha.trim()) return;
    onScan(manualName, manualAge, manualAbha.trim());
  };

  const bg = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const inp = dark
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 ${bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" />
            <h3 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-900'}`}>Scan ABHA QR</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {error ? (
          <p className="text-sm text-amber-500">{error}</p>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-emerald-400 rounded-lg opacity-70" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/70">
              Point camera at ABHA QR card
            </p>
          </div>
        )}

        <div className={`text-xs text-center font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          — or enter manually —
        </div>

        <div className="space-y-2">
          <input
            placeholder="ABHA ID / Health ID"
            value={manualAbha}
            onChange={e => setManualAbha(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inp}`}
          />
          <div className="flex gap-2">
            <input
              placeholder="Name"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inp}`}
            />
            <input
              placeholder="Age"
              type="number"
              value={manualAge}
              onChange={e => setManualAge(e.target.value)}
              className={`w-20 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inp}`}
            />
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={!manualAbha.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            Use This ABHA ID
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Snap Prescription Modal ──────────────────────────────────────────────────

interface SnapRxModalProps {
  dark: boolean;
  onClose: () => void;
  onDrugsExtracted: (drugs: string[]) => void;
}

const SnapRxModal: React.FC<SnapRxModalProps> = ({ dark, onClose, onDrugsExtracted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStreaming(true);
      })
      .catch(() => setCamError('Camera not available. Use file upload instead.'));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setCaptured(c.toDataURL('image/jpeg', 0.85));
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCaptured(reader.result as string);
    reader.readAsDataURL(file);
  };

  const sendForOcr = async () => {
    if (!captured) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/ocr-prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: captured.split(',')[1] }),
      });
      if (!res.ok) throw new Error('OCR failed');
      const data = await res.json();
      const drugs: string[] = data.drugs || [];
      onDrugsExtracted(drugs);
    } catch (err: any) {
      // Graceful fallback: parse from common drug names in raw text if backend unavailable
      onDrugsExtracted([]);
    } finally {
      setProcessing(false);
    }
  };

  const bg = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 ${bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-900'}`}>Snap Old Prescription</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {camError && <p className="text-sm text-amber-500">{camError}</p>}

        {!captured ? (
          <>
            {streaming && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              {streaming && (
                <button
                  onClick={snap}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" /> Capture
                </button>
              )}
              <label className={`flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors ${dark ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                📁 Upload File
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </>
        ) : (
          <>
            <img src={captured} alt="Captured prescription" className="w-full rounded-xl object-contain max-h-48" />
            <div className="flex gap-2">
              <button
                onClick={() => { setCaptured(null); setStreaming(false); }}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${dark ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Retake
              </button>
              <button
                onClick={sendForOcr}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : '🔍 Extract Drugs'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

interface CharakKioskProps {
  onCockpitOpen?: (tokenId: string) => void;
  onRedFlag?: (reason: string) => void;
}

export const CharakKiosk: React.FC<CharakKioskProps> = ({ onCockpitOpen, onRedFlag }) => {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(false);

  // ── Language ───────────────────────────────────────────────────────────────
  const [langCode, setLangCode] = useState<LangCode>('en-IN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const L = LANG_DICT[langCode];
  // Complaint categories that re-render instantly when language changes
  const complaintCategories = COMPLAINT_I18N[langCode] ?? COMPLAINT_I18N['en-IN'];

  // ── Step 0 ─────────────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [age, setAge]                 = useState('');
  const [gender, setGender]           = useState('');
  const [patientId, setPatientId]     = useState(() => `PT-${Date.now()}`);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [abhaId, setAbhaId]           = useState('');

  // ── Step 1 (voice/complaint) ───────────────────────────────────────────────
  const [complaint, setComplaint]     = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef                = useRef<any>(null);

  // ── Step 2 (Dashavidha) ───────────────────────────────────────────────────
  const [agni, setAgni]       = useState('');
  const [koshtha, setKoshtha] = useState('');
  const [painScale, setPainScale] = useState(3);

  // ── Step 3 (medicines) ───────────────────────────────────────────────────
  const [allopathicMeds, setAllopathicMeds] = useState<string[]>([]);
  const [ayurvedicMeds, setAyurvedicMeds]   = useState<string[]>([]);
  const [alloInput, setAlloInput]           = useState('');
  const [ayurInput, setAyurInput]           = useState('');
  const [isVoiceMeds, setIsVoiceMeds]       = useState(false);
  const voiceMedRecRef                      = useRef<any>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [showSnapModal, setShowSnapModal] = useState(false);

  // ── Flow control ──────────────────────────────────────────────────────────
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [result, setResult] = useState<IntakeResponse | null>(null);

  // ── Auto-reset countdown (15 s after token generation) ───────────────────
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetKioskRef = useRef<() => void>(() => {});

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setCountdown(15);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setTimeout(() => resetKioskRef.current(), 0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  // Close lang menu on outside click
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = () => setShowLangMenu(false);
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, [showLangMenu]);

  const interactionWarnings = previewInteractions(allopathicMeds, ayurvedicMeds);

  // ── Voice complaint ───────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported. Please type your complaint.'); return; }
    const rec = new SR();
    rec.lang = langCode;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setComplaint(t);
    };
    rec.onend  = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [langCode]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Voice medicines ───────────────────────────────────────────────────────

  const startVoiceMeds = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported.'); return; }
    const rec = new SR();
    rec.lang = langCode;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = async (e: any) => {
      const transcript: string = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      // Send to Granite for normalization
      try {
        const res = await fetch(`${API_BASE}/api/v1/kiosk/parse-medicines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript }),
        });
        if (res.ok) {
          const data = await res.json();
          const drugs: string[] = data.drugs || [];
          drugs.forEach(d => {
            setAllopathicMeds(prev => prev.includes(d) ? prev : [...prev, d]);
          });
        }
      } catch {
        // Fallback: split on common separators
        const words = transcript.split(/,|\s+and\s+|\s+aur\s+/i)
          .map(w => w.trim())
          .filter(w => w.length > 2);
        words.forEach(d => setAllopathicMeds(prev => prev.includes(d) ? prev : [...prev, d]));
      }
      setIsVoiceMeds(false);
    };
    rec.onend = () => setIsVoiceMeds(false);
    rec.onerror = () => setIsVoiceMeds(false);
    voiceMedRecRef.current = rec;
    rec.start();
    setIsVoiceMeds(true);
  }, [langCode]);

  const stopVoiceMeds = useCallback(() => {
    voiceMedRecRef.current?.stop();
    setIsVoiceMeds(false);
  }, []);

  // ── Medicine toggles ──────────────────────────────────────────────────────

  const toggleAllopathic = (med: string) =>
    setAllopathicMeds((p) => p.includes(med) ? p.filter((m) => m !== med) : [...p, med]);
  const toggleAyurvedic = (med: string) =>
    setAyurvedicMeds((p) => p.includes(med) ? p.filter((m) => m !== med) : [...p, med]);

  const addAlloCustom = () => {
    const t = alloInput.trim();
    if (t && !allopathicMeds.includes(t)) setAllopathicMeds((p) => [...p, t]);
    setAlloInput('');
  };
  const addAyurCustom = () => {
    const t = ayurInput.trim();
    if (t && !ayurvedicMeds.includes(t)) setAyurvedicMeds((p) => [...p, t]);
    setAyurInput('');
  };

  // ── ABHA QR callback ─────────────────────────────────────────────────────

  const handleAbhaScan = (name: string, ageVal: string, id: string) => {
    if (name) setPatientName(name);
    if (ageVal) setAge(ageVal);
    if (id) { setAbhaId(id); setPatientId(id); }
    setShowAbhaModal(false);
  };

  // ── OCR callback ──────────────────────────────────────────────────────────

  const handleOcrDrugs = (drugs: string[]) => {
    drugs.forEach(d => {
      const norm = d.trim();
      if (norm) setAllopathicMeds(prev => prev.includes(norm) ? prev : [...prev, norm]);
    });
    setShowSnapModal(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!patientName.trim()) { setError('Patient name is required.'); return; }
    if (!selectedCategory)    { setError('Please select a complaint category.'); return; }
    setLoading(true);
    setError('');
    try {
      const body = {
        patient_id:               patientId,
        patient_name:             patientName.trim(),
        age:                      age ? parseInt(age, 10) : null,
        gender:                   gender || null,
        chief_complaint_key:      selectedCategory,
        raw_symptoms:             complaint ? [complaint] : [selectedCategory],
        pain_scale:               painScale,
        appetite_level:           5,
        digestive_issue:          agni === 'tikshnagni' ? 8 : agni === 'mandagni' ? 6 : agni === 'vishamagni' ? 7 : 3,
        bristol_stool:            koshtha === 'krura' ? 1 : koshtha === 'mridu' ? 6 : 4,
        vitals:                   {},
        current_allopathic_drugs: allopathicMeds,
        current_herbal_remedies:  ayurvedicMeds,
      };
      const authToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/v1/kiosk/intake`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || 'Intake submission failed');
      }
      const data: IntakeResponse = await res.json();
      setResult(data);
      setStep(4);
      startCountdown();
      if (data.red_flag && onRedFlag) {
        onRedFlag(data.red_flag_reason || 'Red-flag symptoms detected.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetKiosk = () => {
    clearCountdown();
    setPatientName(''); setAge(''); setGender(''); setAbhaId('');
    setPatientId(`PT-${Date.now()}`); setSelectedCategory('');
    setComplaint(''); setIsListening(false);
    setAgni(''); setKoshtha(''); setPainScale(3);
    setAllopathicMeds([]); setAyurvedicMeds([]);
    setAlloInput(''); setAyurInput('');
    setStep(0); setResult(null); setError('');
  };
  resetKioskRef.current = resetKiosk;

  // ─── Theme helpers ────────────────────────────────────────────────────────

  const th = {
    screen:    dark ? 'bg-slate-950 text-white'        : 'bg-slate-100 text-slate-900',
    card:      dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200',
    header:    dark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200',
    input:     dark
      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:ring-emerald-500 focus:border-emerald-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500',
    select:    dark
      ? 'bg-slate-800 border-slate-600 text-white focus:ring-emerald-500'
      : 'bg-white border-slate-300 text-slate-900 focus:ring-emerald-500',
    textarea:  dark
      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:ring-emerald-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500',
    label:     dark ? 'text-slate-400' : 'text-slate-500',
    stepLabel: dark ? 'text-emerald-400' : 'text-emerald-600',
    heading:   dark ? 'text-white'      : 'text-slate-900',
    subtext:   dark ? 'text-slate-400'  : 'text-slate-500',
    dotDone:   'bg-emerald-600 border-emerald-600 text-white',
    dotActive: dark ? 'bg-emerald-500 border-emerald-400 text-white ring-2 ring-emerald-400/40'
                    : 'bg-emerald-600 border-emerald-500 text-white ring-2 ring-emerald-400/40',
    dotPending:dark ? 'bg-slate-800 border-slate-600 text-slate-500'
                    : 'bg-slate-100 border-slate-300 text-slate-400',
    dotLine:   dark ? 'bg-slate-700' : 'bg-slate-200',
    dotLineDone: 'bg-emerald-500',
    backBtn:   dark
      ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
    countdown: dark ? 'bg-slate-700/60 border-slate-600' : 'bg-amber-50 border-amber-200',
    countdownText: dark ? 'text-slate-300' : 'text-amber-800',
    countdownNum:  dark ? 'text-amber-300' : 'text-amber-600',
    tokenCard: (isRed: boolean) => isRed
      ? (dark ? 'border-red-500 bg-red-900/30' : 'border-red-400 bg-red-50')
      : (dark ? 'border-emerald-500 bg-emerald-900/30' : 'border-emerald-500 bg-emerald-50'),
    tokenNum: (isRed: boolean) => isRed
      ? (dark ? 'text-red-300' : 'text-red-600')
      : (dark ? 'text-emerald-300' : 'text-emerald-700'),
    tokenSub: dark ? 'text-slate-400' : 'text-slate-500',
    interactionCard: dark ? 'bg-amber-900/30 border-amber-500/60' : 'bg-amber-50 border-amber-300',
    errorCard: dark ? 'bg-red-900/30 border-red-500/60 text-red-300' : 'bg-red-50 border-red-300 text-red-700',
  };

  // ─── Step renderers ────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-7">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 1 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.patientName}</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>मरीज़ की जानकारी दर्ज करें</p>
      </div>

      {/* ABHA QR quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAbhaModal(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            dark ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
                 : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" /> {L.scanAbha}
        </button>
        {abhaId && (
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${dark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
            <CheckCircle2 className="w-3 h-3" /> ABHA: {abhaId.slice(0, 14)}…
          </span>
        )}
      </div>

      {/* Name / age / gender */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-1.5 ${th.label}`}>
            <User className="inline w-3.5 h-3.5 mr-1" />{L.patientName} *
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder={L.placeholderName}
            className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 ${th.input}`}
          />
        </div>
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-1.5 ${th.label}`}>{L.age}</label>
          <input
            type="number" value={age} onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 45"
            className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 ${th.input}`}
          />
        </div>
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-1.5 ${th.label}`}>{L.gender}</label>
          <select
            value={gender} onChange={(e) => setGender(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 ${th.select}`}
          >
            <option value="">{L.selectGender}</option>
            <option value="male">{L.male}</option>
            <option value="female">{L.female}</option>
            <option value="other">{L.other}</option>
          </select>
        </div>
      </div>

      {/* Category cards — dynamically localized */}
      <div>
        <label className={`text-xs font-semibold uppercase tracking-wider block mb-3 ${th.label}`}>
          Chief Complaint — Quick Tap *
        </label>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {complaintCategories.map((cat) => {
            const isSelected = selectedCategory === cat.complaint;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.complaint)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? (dark ? 'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400'
                             : 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 shadow-sm')
                    : (dark ? 'border-slate-600 bg-slate-800 hover:border-emerald-600'
                             : 'border-slate-200 bg-white hover:border-emerald-400 shadow-sm')
                }`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className={`text-xs font-bold leading-tight text-center ${dark ? 'text-white' : 'text-slate-800'}`}>{cat.label}</span>
                <span className={`text-[10px] leading-tight text-center ${th.subtext}`}>{cat.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 2 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.complaint}</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>मुख्य शिकायत बताएं — speak or type</p>
      </div>

      {/* Big mic button */}
      <div className="flex flex-col items-center gap-4 py-3">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-all shadow-xl font-bold text-sm ${
            isListening
              ? 'border-red-500 bg-red-900/40 text-red-300 animate-pulse shadow-red-500/30'
              : (dark
                  ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 shadow-emerald-500/20'
                  : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-emerald-200')
          }`}
        >
          {isListening ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          <span className="text-xs">{isListening ? L.stop : L.speak}</span>
        </button>
        {isListening && (
          <div className="flex gap-1 items-end h-8">
            {[4, 7, 5, 9, 6, 8, 4, 6, 9].map((h, i) => (
              <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce" style={{ height: `${h * 3}px`, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={`text-xs font-semibold uppercase tracking-wider block mb-1.5 ${th.label}`}>
          {L.complaint} (voice transcript or type)
        </label>
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          rows={4}
          placeholder={L.placeholderComplaint}
          className={`w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 resize-none ${th.textarea}`}
        />
        {complaint && (
          <p className="mt-1 text-xs text-emerald-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Complaint recorded
          </p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-7">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 3 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>Dashavidha Assessment</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>पाचन व दर्द — Pictorial Ayurvedic Parameters</p>
      </div>

      {/* Agni */}
      <div>
        <p className={`text-sm font-bold mb-3 flex items-center gap-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Flame className="w-4 h-4 text-orange-400" /> {L.agni}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AGNI_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAgni(opt.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                agni === opt.id
                  ? (dark ? opt.active_dark : opt.active_light)
                  : (dark ? opt.inactive_dark : opt.inactive_light)
              }`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div>
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{opt.label}</div>
                <div className={`text-xs ${th.subtext}`}>{opt.sublabel}</div>
                <div className={`text-[10px] mt-0.5 ${th.subtext}`}>{opt.hindi}</div>
                <div className={`text-[10px] ${th.subtext}`}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Koshtha */}
      <div>
        <p className={`text-sm font-bold mb-3 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          🚽 {L.koshtha}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {KOSHTHA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setKoshtha(opt.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                koshtha === opt.id
                  ? (dark ? opt.active_dark : opt.active_light)
                  : (dark ? opt.inactive_dark : opt.inactive_light)
              }`}
            >
              <span className="text-4xl">{opt.emoji}</span>
              <div>
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{opt.label}</div>
                <div className={`text-xs ${th.subtext}`}>{opt.sublabel}</div>
                <div className={`text-[10px] ${th.subtext}`}>{opt.hindi}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pain VAS Slider */}
      <div>
        <p className={`text-sm font-bold mb-3 flex items-center gap-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Activity className="w-4 h-4 text-emerald-500" />
          Pain Scale (VAS) — दर्द का स्तर:{' '}
          <span className={`ml-1 ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>{painScale} / 10</span>
        </p>
        <div className="relative px-1">
          <input
            type="range" min={1} max={10} value={painScale}
            onChange={(e) => setPainScale(parseInt(e.target.value, 10))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${
                painScale >= 7 ? '#ef4444' : painScale >= 4 ? '#f59e0b' : '#10b981'
              } 0%, ${
                painScale >= 7 ? '#ef4444' : painScale >= 4 ? '#f59e0b' : '#10b981'
              } ${(painScale - 1) / 9 * 100}%, ${dark ? '#334155' : '#e2e8f0'} ${(painScale - 1) / 9 * 100}%, ${dark ? '#334155' : '#e2e8f0'} 100%)`,
            }}
          />
          <div className={`flex justify-between text-xs mt-1.5 ${th.subtext}`}>
            <span>1 — Mild</span><span>5 — Moderate</span><span>10 — Severe</span>
          </div>
        </div>
        <div className={`mt-2 text-xs font-bold text-center py-1.5 rounded-lg ${
          painScale >= 7 ? (dark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600') :
          painScale >= 4 ? (dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-700') :
          (dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
        }`}>
          {painScale >= 7 ? '🔴 Severe Pain — Priority Flag' : painScale >= 4 ? '🟡 Moderate Pain' : '🟢 Mild Pain'}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 4 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.medicines}</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>दवाइयां चुनें — enables Herb-Drug interaction check</p>
      </div>

      {/* Quick intake shortcuts */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowSnapModal(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            dark ? 'border-blue-600 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                 : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> {L.snapRx}
        </button>
        <button
          onClick={isVoiceMeds ? stopVoiceMeds : startVoiceMeds}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            isVoiceMeds
              ? 'border-red-500 bg-red-900/30 text-red-300 animate-pulse'
              : (dark ? 'border-purple-600 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                      : 'border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100')
          }`}
        >
          {isVoiceMeds ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {isVoiceMeds ? 'Stop' : L.voiceMeds}
        </button>
      </div>

      {/* Allopathic */}
      <div>
        <p className={`text-sm font-bold mb-2 flex items-center gap-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Pill className="w-4 h-4 text-blue-500" /> Allopathic Medicines
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {ALLOPATHIC_QUICK.map((med) => (
            <button key={med} onClick={() => toggleAllopathic(med)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                allopathicMeds.includes(med)
                  ? (dark ? 'border-blue-400 bg-blue-900/40 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                  : (dark ? 'border-slate-600 bg-slate-800 text-slate-400 hover:border-blue-500' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400')
              }`}
            >
              {allopathicMeds.includes(med) ? '✓ ' : ''}{med}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={alloInput} onChange={(e) => setAlloInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAlloCustom()}
            placeholder="Add custom allopathic drug..."
            className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${th.input}`}
          />
          <button onClick={addAlloCustom} className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"><Plus className="w-4 h-4" /></button>
        </div>
        {allopathicMeds.filter(m => !ALLOPATHIC_QUICK.includes(m)).map((med) => (
          <span key={med} className={`inline-flex items-center gap-1 px-3 py-1 mt-2 mr-1.5 rounded-full text-xs ${dark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
            {med} <button onClick={() => toggleAllopathic(med)}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>

      {/* Ayurvedic */}
      <div>
        <p className={`text-sm font-bold mb-2 flex items-center gap-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Flame className="w-4 h-4 text-emerald-500" /> Ayurvedic / Herbal Medicines
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {AYURVEDIC_QUICK.map((herb) => (
            <button key={herb} onClick={() => toggleAyurvedic(herb)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                ayurvedicMeds.includes(herb)
                  ? (dark ? 'border-emerald-400 bg-emerald-900/40 text-emerald-300' : 'border-emerald-500 bg-emerald-50 text-emerald-700')
                  : (dark ? 'border-slate-600 bg-slate-800 text-slate-400 hover:border-emerald-500' : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400')
              }`}
            >
              {ayurvedicMeds.includes(herb) ? '✓ ' : ''}{herb}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={ayurInput} onChange={(e) => setAyurInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAyurCustom()}
            placeholder="Add custom Ayurvedic herb..."
            className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${th.input}`}
          />
          <button onClick={addAyurCustom} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Interaction preview */}
      {interactionWarnings.length > 0 && (
        <div className={`p-4 rounded-xl border ${th.interactionCard}`}>
          <p className={`font-bold text-sm mb-2 flex items-center gap-2 ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
            <ShieldAlert className="w-4 h-4" /> Herb-Drug Interaction Preview
          </p>
          <ul className="space-y-1">
            {interactionWarnings.map((w, i) => (
              <li key={i} className={`text-xs flex items-start gap-1.5 ${dark ? 'text-amber-200' : 'text-amber-700'}`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />{w}
              </li>
            ))}
          </ul>
          <p className={`text-xs mt-2 italic ${dark ? 'text-amber-400' : 'text-amber-600'}`}>Full analysis will run on server after submission.</p>
        </div>
      )}

      {error && (
        <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${th.errorCard}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );

  const renderCompletion = () => {
    if (!result) return null;
    const isRed = result.red_flag;
    // Estimated wait: red-flag → immediate, otherwise ~5 min per queue slot (simple heuristic)
    const estWait = isRed ? 'Immediate' : '~5–15 min';
    const cabin = result.cabin || (isRed ? 'Emergency Bay' : 'Cabin 1 – General');
    return (
      <div className="space-y-5">
        {isRed && (
          <div className="p-4 rounded-xl bg-red-900/50 border-2 border-red-500 flex items-start gap-3 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-extrabold text-base">🚨 CRITICAL — Emergency Alert</p>
              <p className="text-red-200 text-sm mt-0.5">{result.red_flag_reason || 'Red-flag symptoms detected. Immediate medical attention required.'}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className={`w-16 h-16 ${isRed ? 'text-red-400' : 'text-emerald-500'}`} />
          <h2 className={`text-2xl font-extrabold ${th.heading}`}>Token Assigned!</h2>
          <div className={`px-10 py-6 rounded-2xl border-2 text-center shadow-lg w-full max-w-xs ${th.tokenCard(isRed)}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${th.tokenSub}`}>OPD Token</p>
            <p className={`text-5xl font-black tracking-wider ${th.tokenNum(isRed)}`}>{result.token_id}</p>
            <p className={`text-xs mt-2 ${th.tokenSub}`}>
              {isRed ? '🔴 Priority — High Urgency' : '🟢 Standard Queue'}
            </p>
          </div>

          {/* Cabin + Wait Time info strip */}
          <div className={`w-full grid grid-cols-2 gap-3`}>
            <div className={`rounded-xl border px-4 py-3 text-center ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${th.label}`}>Assigned Cabin</p>
              <p className={`text-sm font-extrabold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>🏥 {cabin}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${th.label}`}>Est. Wait Time</p>
              <p className={`text-sm font-extrabold ${isRed ? (dark ? 'text-red-300' : 'text-red-600') : (dark ? 'text-amber-300' : 'text-amber-700')}`}>
                ⏱ {estWait}
              </p>
            </div>
          </div>

          <p className={`text-sm text-center max-w-sm ${th.subtext}`}>
            Please proceed to the waiting area. Show this token to the reception.
          </p>
        </div>

        {countdown !== null && (
          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${th.countdown}`}>
            <div className={`flex items-center gap-2 text-sm ${th.countdownText}`}>
              <Timer className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Screen resets in <span className={`font-black tabular-nums ${th.countdownNum}`}>{countdown}s</span></span>
            </div>
            <button onClick={resetKiosk} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shrink-0">
              Reset Now
            </button>
          </div>
        )}

        <button
          onClick={() => { clearCountdown(); onCockpitOpen?.(result.token_id); }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-base transition-all shadow-lg shadow-emerald-900/40"
        >
          <Stethoscope className="w-5 h-5" /> Inspect in Doctor Cockpit
        </button>

        <button onClick={resetKiosk} className={`w-full py-3 rounded-xl border font-semibold text-sm transition-colors ${th.backBtn}`}>
          नया मरीज़ / New Patient
        </button>
      </div>
    );
  };

  // ── Step indicator ─────────────────────────────────────────────────────────

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
            s < step  ? th.dotDone :
            s === step ? th.dotActive :
            th.dotPending
          }`}>
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s + 1}
          </div>
          {s < 3 && (
            <div className={`h-0.5 w-8 rounded transition-all ${s < step ? th.dotLineDone : th.dotLine}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const canProceed = [
    patientName.trim().length > 0 && !!selectedCategory,
    true, true, true,
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${th.screen}`}>

      {/* ── Kiosk Top Bar ──────────────────────────────────────────────────── */}
      <header className={`shrink-0 border-b px-5 py-3 flex items-center justify-between gap-4 ${th.header}`}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className={`font-extrabold text-sm tracking-tight truncate ${th.heading}`}>
              {OPD_NAME} • Charak-Kiosk
            </span>
            <span className={`text-[10px] font-medium ${th.subtext}`}>
              AIIA PS-26047 · ICD-11 + NAMASTE · Sub-3-min workflow
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <LiveClock dark={dark} />

          {/* 12-Language selector */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLangMenu(v => !v); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                dark ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                     : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
              title="Select Language"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{LANG_DICT[langCode].flag}</span>
              <span className="hidden sm:inline">{LANG_DICT[langCode].label}</span>
              <span className="text-[10px] opacity-60">▼</span>
            </button>

            {showLangMenu && (
              <div
                className={`absolute right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl p-2 grid grid-cols-3 gap-1 min-w-[220px] ${
                  dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {LANG_ORDER.map(code => (
                  <button
                    key={code}
                    onClick={() => { setLangCode(code); setShowLangMenu(false); }}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      langCode === code
                        ? (dark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-500')
                        : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50')
                    }`}
                  >
                    <span>{LANG_DICT[code].flag}</span>
                    <span className="truncate">{LANG_DICT[code].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Light / Dark toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className={`p-2 rounded-xl border transition-all ${
              dark ? 'border-slate-600 bg-slate-800 text-amber-400 hover:bg-slate-700'
                   : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
            }`}
            aria-label={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Intake Area ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className={`rounded-2xl border shadow-xl p-6 ${th.card}`}>
            {step < 4 && <StepDots />}

            {step === 0 && renderStep0()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderCompletion()}

            {/* Navigation buttons */}
            {step < 4 && (
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-semibold text-sm transition-colors ${th.backBtn}`}
                  >
                    <ChevronLeft className="w-4 h-4" /> {L.back}
                  </button>
                )}
                <button
                  onClick={step === 3 ? handleSubmit : () => setStep((s) => s + 1)}
                  disabled={!canProceed[step] || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                    canProceed[step] && !loading
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                      : (dark ? 'bg-slate-700 border border-slate-600 text-slate-500' : 'bg-slate-100 border border-slate-200 text-slate-400') + ' cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing Intake...</>
                  ) : step === 3 ? (
                    <><CheckCircle2 className="w-4 h-4" /> {L.submit}</>
                  ) : (
                    <>{L.next} <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Hackathon Evaluator Floating Pill ─────────────────────────────── */}
      {result && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <a
            href={`/doctor-cockpit/${encodeURIComponent(result.token_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => clearCountdown()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900/90 backdrop-blur border border-emerald-600/60 text-emerald-300 text-xs font-bold rounded-full shadow-xl shadow-slate-900/50 hover:bg-slate-800 transition-all"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            👨‍⚕️ Switch to Doctor Cockpit — {result.token_id}
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAbhaModal && (
        <AbhaQrModal dark={dark} onClose={() => setShowAbhaModal(false)} onScan={handleAbhaScan} />
      )}
      {showSnapModal && (
        <SnapRxModal dark={dark} onClose={() => setShowSnapModal(false)} onDrugsExtracted={handleOcrDrugs} />
      )}
    </div>
  );
};

export default CharakKiosk;
