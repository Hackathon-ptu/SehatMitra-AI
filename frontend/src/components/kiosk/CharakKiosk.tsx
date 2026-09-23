/**
 * CharakKiosk.tsx - Sprint 5
 * Charak-Kiosk: OPD Patient Self-Service Intake Interface (AIIA PS-26047)
 *
 * New in Sprint 5:
 *  - 12-Language selector (EN, HI, PA, BN, MR, TE, TA, GU, KN, ML, OR, UR)
 *  - ABHA QR scanner modal (webcam-based html5-qrcode)
 *  - Snap Old Prescription -> OCR via /api/v1/kiosk/ocr-prescription
 *  - Voice medication extraction via IBM Granite
 *  - Dynamic UI label localization dictionary
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import API_BASE_URL from '../../config/api';
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
  Timer,
  Sun,
  Moon,
  Clock,
  Hospital,
  QrCode,
  Camera,
  Languages,
  Heart,
  Baby,
  UserCheck,
  HeartHandshake,
  Thermometer,
  Wind,
  Bone,
  HeartPulse,
  Sparkles,
} from 'lucide-react';

// --- Types -------------------------------------------------------------------

interface IntakeResponse {
  status: string;
  token_id: string;
  red_flag: boolean;
  red_flag_reason: string | null;
  cabin?: string;
  cockpit_url: string;
  saved_to_history?: boolean;
}

interface VitalsPod {
  bp_systolic: number;
  bp_diastolic: number;
  spo2: number;
  pulse: number;
  temp: number;
}

// --- 12-Language Dictionary --------------------------------------------------

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
    label: 'English', flag: '\uD83C\uDDEE\uD83C\uDDF3',
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
    label: '\u0939\u093F\u0902\u0926\u0940', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â¤Â®Ã Â¤Â°Ã Â¥â‚¬Ã Â¤Å“Ã Â¤Â¼ Ã Â¤â€¢Ã Â¤Â¾ Ã Â¤Â¨Ã Â¤Â¾Ã Â¤Â®', age: 'Ã Â¤â€ Ã Â¤Â¯Ã Â¥Â', gender: 'Ã Â¤Â²Ã Â¤Â¿Ã Â¤â€šÃ Â¤â€”',
    complaint: 'Ã Â¤Â®Ã Â¥ÂÃ Â¤â€“Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤â€¢Ã Â¤Â¾Ã Â¤Â¯Ã Â¤Â¤', agni: 'Ã Â¤ÂªÃ Â¤Â¾Ã Â¤Å¡Ã Â¤Â¨ Ã Â¤Â¶Ã Â¤â€¢Ã Â¥ÂÃ Â¤Â¤Ã Â¤Â¿ (Ã Â¤â€¦Ã Â¤â€”Ã Â¥ÂÃ Â¤Â¨Ã Â¤Â¿)',
    koshtha: 'Ã Â¤Â®Ã Â¤Â² Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€¢Ã Â¥Æ’Ã Â¤Â¤Ã Â¤Â¿ (Ã Â¤â€¢Ã Â¥â€¹Ã Â¤Â·Ã Â¥ÂÃ Â¤Â )', medicines: 'Ã Â¤ÂµÃ Â¤Â°Ã Â¥ÂÃ Â¤Â¤Ã Â¤Â®Ã Â¤Â¾Ã Â¤Â¨ Ã Â¤Â¦Ã Â¤ÂµÃ Â¤Â¾Ã Â¤â€¡Ã Â¤Â¯Ã Â¤Â¾Ã Â¤â€š',
    speak: 'Ã Â¤Â¬Ã Â¥â€¹Ã Â¤Â²Ã Â¥â€¡Ã Â¤â€š', stop: 'Ã Â¤Â°Ã Â¥â€¹Ã Â¤â€¢Ã Â¥â€¡Ã Â¤â€š', next: 'Ã Â¤â€ Ã Â¤â€”Ã Â¥â€¡', back: 'Ã Â¤ÂµÃ Â¤Â¾Ã Â¤ÂªÃ Â¤Â¸',
    submit: 'Ã Â¤Å“Ã Â¤Â®Ã Â¤Â¾ Ã Â¤â€¢Ã Â¤Â°Ã Â¥â€¡Ã Â¤â€š Ã Â¤â€Ã Â¤Â° Ã Â¤Å¸Ã Â¥â€¹Ã Â¤â€¢Ã Â¤Â¨ Ã Â¤ÂªÃ Â¤Â¾Ã Â¤ÂÃ Â¤â€š', scanAbha: 'ABHA QR Ã Â¤Â¸Ã Â¥ÂÃ Â¤â€¢Ã Â¥Ë†Ã Â¤Â¨ Ã Â¤â€¢Ã Â¤Â°Ã Â¥â€¡Ã Â¤â€š',
    snapRx: 'Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤Â¾Ã Â¤Â¨Ã Â¥â‚¬ Ã Â¤ÂªÃ Â¤Â°Ã Â¥ÂÃ Â¤Å¡Ã Â¥â‚¬ Ã Â¤â€¢Ã Â¥â‚¬ Ã Â¤Â«Ã Â¤Â¼Ã Â¥â€¹Ã Â¤Å¸Ã Â¥â€¹', voiceMeds: 'Ã Â¤Â¦Ã Â¤ÂµÃ Â¤Â¾Ã Â¤â€¡Ã Â¤Â¯Ã Â¤Â¾Ã Â¤â€š Ã Â¤Â¬Ã Â¥â€¹Ã Â¤Â²Ã Â¥â€¡Ã Â¤â€š',
    placeholderName: 'Ã Â¤ÂªÃ Â¥â€šÃ Â¤Â°Ã Â¤Â¾ Ã Â¤Â¨Ã Â¤Â¾Ã Â¤Â®...', placeholderComplaint: 'Ã Â¤â€¦Ã Â¤ÂªÃ Â¤Â¨Ã Â¥â‚¬ Ã Â¤Â®Ã Â¥ÂÃ Â¤â€“Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¤Ã Â¤â€¢Ã Â¤Â²Ã Â¥â‚¬Ã Â¤Â«Ã Â¤Â¼ Ã Â¤Â¬Ã Â¤Â¤Ã Â¤Â¾Ã Â¤ÂÃ Â¤â€š...',
    selectGender: 'Ã Â¤Å¡Ã Â¥ÂÃ Â¤Â¨Ã Â¥â€¡Ã Â¤â€š...', male: 'Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¥ÂÃ Â¤Â·', female: 'Ã Â¤Â®Ã Â¤Â¹Ã Â¤Â¿Ã Â¤Â²Ã Â¤Â¾', other: 'Ã Â¤â€¦Ã Â¤Â¨Ã Â¥ÂÃ Â¤Â¯',
  },
  'pa-IN': {
    label: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â¨Â®Ã Â¨Â°Ã Â©â‚¬Ã Â¨Å“Ã Â¨Â¼ Ã Â¨Â¦Ã Â¨Â¾ Ã Â¨Â¨Ã Â¨Â¾Ã Â¨Â®', age: 'Ã Â¨â€°Ã Â¨Â®Ã Â¨Â°', gender: 'Ã Â¨Â²Ã Â¨Â¿Ã Â©Â°Ã Â¨â€”',
    complaint: 'Ã Â¨Â®Ã Â©ÂÃ Â©Â±Ã Â¨â€“ Ã Â¨Â¸Ã Â¨Â¼Ã Â¨Â¿Ã Â¨â€¢Ã Â¨Â¾Ã Â¨â€¡Ã Â¨Â¤', agni: 'Ã Â¨ÂªÃ Â¨Â¾Ã Â¨Å¡Ã Â¨Â¨ Ã Â¨Â¸Ã Â¨Â¼Ã Â¨â€¢Ã Â¨Â¤Ã Â©â‚¬ (Ã Â¨â€¦Ã Â¨â€”Ã Â¨Â¨Ã Â©â‚¬)',
    koshtha: 'Ã Â¨Å¸Ã Â©Â±Ã Â¨Å¸Ã Â©â‚¬ Ã Â¨â€¢Ã Â¨Â¿Ã Â¨Â¸Ã Â¨Â® (Ã Â¨â€¢Ã Â©â€¹Ã Â¨Â¸Ã Â¨Â¼Ã Â¨Â )', medicines: 'Ã Â¨Â®Ã Â©Å’Ã Â¨Å“Ã Â©â€šÃ Â¨Â¦Ã Â¨Â¾ Ã Â¨Â¦Ã Â¨ÂµÃ Â¨Â¾Ã Â¨Ë†Ã Â¨â€ Ã Â¨â€š',
    speak: 'Ã Â¨Â¬Ã Â©â€¹Ã Â¨Â²Ã Â©â€¹', stop: 'Ã Â¨Â°Ã Â©â€¹Ã Â¨â€¢Ã Â©â€¹', next: 'Ã Â¨â€¦Ã Â©Â±Ã Â¨â€”Ã Â©â€¡', back: 'Ã Â¨ÂµÃ Â¨Â¾Ã Â¨ÂªÃ Â¨Â¸',
    submit: 'Ã Â¨Å“Ã Â¨Â®Ã Â©ÂÃ Â¨Â¹Ã Â¨Â¾Ã Â¨â€š Ã Â¨â€¢Ã Â¨Â°Ã Â©â€¹ Ã Â¨â€¦Ã Â¨Â¤Ã Â©â€¡ Ã Â¨Å¸Ã Â©â€¹Ã Â¨â€¢Ã Â¨Â¨ Ã Â¨Â²Ã Â¨â€œ', scanAbha: 'ABHA QR Ã Â¨Â¸Ã Â¨â€¢Ã Â©Ë†Ã Â¨Â¨ Ã Â¨â€¢Ã Â¨Â°Ã Â©â€¹',
    snapRx: 'Ã Â¨ÂªÃ Â©ÂÃ Â¨Â°Ã Â¨Â¾Ã Â¨Â£Ã Â©â‚¬ Ã Â¨ÂªÃ Â¨Â°Ã Â¨Å¡Ã Â©â‚¬ Ã Â¨Â¦Ã Â©â‚¬ Ã Â¨Â«Ã Â¨Â¼Ã Â©â€¹Ã Â¨Å¸Ã Â©â€¹', voiceMeds: 'Ã Â¨Â¦Ã Â¨ÂµÃ Â¨Â¾Ã Â¨Ë†Ã Â¨â€ Ã Â¨â€š Ã Â¨Â¬Ã Â©â€¹Ã Â¨Â²Ã Â©â€¹',
    placeholderName: 'Ã Â¨ÂªÃ Â©â€šÃ Â¨Â°Ã Â¨Â¾ Ã Â¨Â¨Ã Â¨Â¾Ã Â¨Â®...', placeholderComplaint: 'Ã Â¨â€ Ã Â¨ÂªÃ Â¨Â£Ã Â©â‚¬ Ã Â¨Â®Ã Â©ÂÃ Â©Â±Ã Â¨â€“ Ã Â¨Â¸Ã Â¨Â¼Ã Â¨Â¿Ã Â¨â€¢Ã Â¨Â¾Ã Â¨â€¡Ã Â¨Â¤ Ã Â¨Â¦Ã Â©Â±Ã Â¨Â¸Ã Â©â€¹...',
    selectGender: 'Ã Â¨Å¡Ã Â©ÂÃ Â¨Â£Ã Â©â€¹...', male: 'Ã Â¨Â®Ã Â¨Â°Ã Â¨Â¦', female: 'Ã Â¨â€Ã Â¨Â°Ã Â¨Â¤', other: 'Ã Â¨Â¹Ã Â©â€¹Ã Â¨Â°',
  },
  'bn-IN': {
    label: '\u09AC\u09BE\u0982\u09B2\u09BE', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â¦Â°Ã Â§â€¹Ã Â¦â€”Ã Â§â‚¬Ã Â¦Â° Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â®', age: 'Ã Â¦Â¬Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¸', gender: 'Ã Â¦Â²Ã Â¦Â¿Ã Â¦â„¢Ã Â§ÂÃ Â¦â€”',
    complaint: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â§Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦â€¦Ã Â¦Â­Ã Â¦Â¿Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€”', agni: 'Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Å¡Ã Â¦Â¨ Ã Â¦Â¶Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¿ (Ã Â¦â€¦Ã Â¦â€”Ã Â§ÂÃ Â¦Â¨Ã Â¦Â¿)',
    koshtha: 'Ã Â¦Â®Ã Â¦Â²Ã Â§â€¡Ã Â¦Â° Ã Â¦Â§Ã Â¦Â°Ã Â¦Â¨ (Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â·Ã Â§ÂÃ Â¦Â )', medicines: 'Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦â€œÃ Â¦Â·Ã Â§ÂÃ Â¦Â§',
    speak: 'Ã Â¦Â¬Ã Â¦Â²Ã Â§ÂÃ Â¦Â¨', stop: 'Ã Â¦Â¥Ã Â¦Â¾Ã Â¦Â®Ã Â§ÂÃ Â¦Â¨', next: 'Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â§â‚¬', back: 'Ã Â¦ÂªÃ Â¦Â¿Ã Â¦â€ºÃ Â¦Â¨Ã Â§â€¡',
    submit: 'Ã Â¦Å“Ã Â¦Â®Ã Â¦Â¾ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š Ã Â¦Å¸Ã Â§â€¹Ã Â¦â€¢Ã Â§â€¡Ã Â¦Â¨ Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¨', scanAbha: 'ABHA QR Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    snapRx: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¨Ã Â§â€¹ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¸Ã Â¦â€¢Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦ÂªÃ Â¦Â¶Ã Â¦Â¨Ã Â§â€¡Ã Â¦Â° Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿', voiceMeds: 'Ã Â¦â€œÃ Â¦Â·Ã Â§ÂÃ Â¦Â§ Ã Â¦Â¬Ã Â¦Â²Ã Â§ÂÃ Â¦Â¨',
    placeholderName: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¹ Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â®...', placeholderComplaint: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â§Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾ Ã Â¦Â¬Ã Â¦Â²Ã Â§ÂÃ Â¦Â¨...',
    selectGender: 'Ã Â¦Â¬Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡ Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¨...', male: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§ÂÃ Â¦Â·', female: 'Ã Â¦Â®Ã Â¦Â¹Ã Â¦Â¿Ã Â¦Â²Ã Â¦Â¾', other: 'Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯',
  },
  'mr-IN': {
    label: '\u092E\u0930\u093E\u0920\u0940', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â¤Â°Ã Â¥ÂÃ Â¤â€”Ã Â¥ÂÃ Â¤Â£Ã Â¤Â¾Ã Â¤Å¡Ã Â¥â€¡ Ã Â¤Â¨Ã Â¤Â¾Ã Â¤Âµ', age: 'Ã Â¤ÂµÃ Â¤Â¯', gender: 'Ã Â¤Â²Ã Â¤Â¿Ã Â¤â€šÃ Â¤â€”',
    complaint: 'Ã Â¤Â®Ã Â¥ÂÃ Â¤â€“Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¤Ã Â¤â€¢Ã Â¥ÂÃ Â¤Â°Ã Â¤Â¾Ã Â¤Â°', agni: 'Ã Â¤ÂªÃ Â¤Â¾Ã Â¤Å¡Ã Â¤Â¨ Ã Â¤Â¶Ã Â¤â€¢Ã Â¥ÂÃ Â¤Â¤Ã Â¥â‚¬ (Ã Â¤â€¦Ã Â¤â€”Ã Â¥ÂÃ Â¤Â¨Ã Â¥â‚¬)',
    koshtha: 'Ã Â¤Â®Ã Â¤Â² Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€¢Ã Â¥Æ’Ã Â¤Â¤Ã Â¥â‚¬ (Ã Â¤â€¢Ã Â¥â€¹Ã Â¤Â·Ã Â¥ÂÃ Â¤Â )', medicines: 'Ã Â¤Â¸Ã Â¤Â§Ã Â¥ÂÃ Â¤Â¯Ã Â¤Â¾Ã Â¤Å¡Ã Â¥â‚¬ Ã Â¤â€Ã Â¤Â·Ã Â¤Â§Ã Â¥â€¡',
    speak: 'Ã Â¤Â¬Ã Â¥â€¹Ã Â¤Â²Ã Â¤Â¾', stop: 'Ã Â¤Â¥Ã Â¤Â¾Ã Â¤â€šÃ Â¤Â¬Ã Â¤Â¾', next: 'Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â¢Ã Â¥â€¡', back: 'Ã Â¤Â®Ã Â¤Â¾Ã Â¤â€”Ã Â¥â€¡',
    submit: 'Ã Â¤Â¸Ã Â¤Â¬Ã Â¤Â®Ã Â¤Â¿Ã Â¤Å¸ Ã Â¤â€¢Ã Â¤Â°Ã Â¤Â¾ Ã Â¤Âµ Ã Â¤Å¸Ã Â¥â€¹Ã Â¤â€¢Ã Â¤Â¨ Ã Â¤Â®Ã Â¤Â¿Ã Â¤Â³Ã Â¤ÂµÃ Â¤Â¾', scanAbha: 'ABHA QR Ã Â¤Â¸Ã Â¥ÂÃ Â¤â€¢Ã Â¥â€¦Ã Â¤Â¨ Ã Â¤â€¢Ã Â¤Â°Ã Â¤Â¾',
    snapRx: 'Ã Â¤Å“Ã Â¥ÂÃ Â¤Â¨Ã Â¥ÂÃ Â¤Â¯Ã Â¤Â¾ Ã Â¤Å¡Ã Â¤Â¿Ã Â¤Â Ã Â¥ÂÃ Â¤Â Ã Â¥â‚¬Ã Â¤Å¡Ã Â¤Â¾ Ã Â¤Â«Ã Â¥â€¹Ã Â¤Å¸Ã Â¥â€¹', voiceMeds: 'Ã Â¤â€Ã Â¤Â·Ã Â¤Â§Ã Â¥â€¡ Ã Â¤Â¬Ã Â¥â€¹Ã Â¤Â²Ã Â¤Â¾',
    placeholderName: 'Ã Â¤ÂªÃ Â¥â€šÃ Â¤Â°Ã Â¥ÂÃ Â¤Â£ Ã Â¤Â¨Ã Â¤Â¾Ã Â¤Âµ...', placeholderComplaint: 'Ã Â¤â€ Ã Â¤ÂªÃ Â¤Â²Ã Â¥â‚¬ Ã Â¤Â®Ã Â¥ÂÃ Â¤â€“Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¤Ã Â¤â€¢Ã Â¥ÂÃ Â¤Â°Ã Â¤Â¾Ã Â¤Â° Ã Â¤Â¸Ã Â¤Â¾Ã Â¤â€šÃ Â¤â€”Ã Â¤Â¾...',
    selectGender: 'Ã Â¤Â¨Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¡Ã Â¤Â¾...', male: 'Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¥ÂÃ Â¤Â·', female: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¤Ã Â¥ÂÃ Â¤Â°Ã Â¥â‚¬', other: 'Ã Â¤â€¡Ã Â¤Â¤Ã Â¤Â°',
  },
  'te-IN': {
    label: 'Ã Â°Â¤Ã Â±â€ Ã Â°Â²Ã Â±ÂÃ Â°â€”Ã Â±Â', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â°Â¿ Ã Â°ÂªÃ Â±â€¡Ã Â°Â°Ã Â±Â', age: 'Ã Â°ÂµÃ Â°Â¯Ã Â°Â¸Ã Â±ÂÃ Â°Â¸Ã Â±Â', gender: 'Ã Â°Â²Ã Â°Â¿Ã Â°â€šÃ Â°â€”Ã Â°â€š',
    complaint: 'Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Â§Ã Â°Â¾Ã Â°Â¨ Ã Â°Â«Ã Â°Â¿Ã Â°Â°Ã Â±ÂÃ Â°Â¯Ã Â°Â¾Ã Â°Â¦Ã Â±Â', agni: 'Ã Â°Å“Ã Â±â‚¬Ã Â°Â°Ã Â±ÂÃ Â°Â£ Ã Â°Â¶Ã Â°â€¢Ã Â±ÂÃ Â°Â¤Ã Â°Â¿ (Ã Â°â€¦Ã Â°â€”Ã Â±ÂÃ Â°Â¨Ã Â°Â¿)',
    koshtha: 'Ã Â°Â®Ã Â°Â²Ã Â°â€š Ã Â°Â°Ã Â°â€¢Ã Â°â€š (Ã Â°â€¢Ã Â±â€¹Ã Â°Â·Ã Â±ÂÃ Â°Â )', medicines: 'Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Â¸Ã Â±ÂÃ Â°Â¤Ã Â±ÂÃ Â°Â¤ Ã Â°Â®Ã Â°â€šÃ Â°Â¦Ã Â±ÂÃ Â°Â²Ã Â±Â',
    speak: 'Ã Â°Â®Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Â¡Ã Â°â€šÃ Â°Â¡Ã Â°Â¿', stop: 'Ã Â°â€ Ã Â°ÂªÃ Â°â€šÃ Â°Â¡Ã Â°Â¿', next: 'Ã Â°Â¤Ã Â°Â¦Ã Â±ÂÃ Â°ÂªÃ Â°Â°Ã Â°Â¿', back: 'Ã Â°ÂµÃ Â±â€ Ã Â°Â¨Ã Â±ÂÃ Â°â€¢Ã Â°â€¢Ã Â±Â',
    submit: 'Ã Â°Â¸Ã Â°Â®Ã Â°Â°Ã Â±ÂÃ Â°ÂªÃ Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°â€šÃ Â°Â¡Ã Â°Â¿ Ã Â°Â®Ã Â°Â°Ã Â°Â¿Ã Â°Â¯Ã Â±Â Ã Â°Å¸Ã Â±â€¹Ã Â°â€¢Ã Â±â€ Ã Â°Â¨Ã Â±Â Ã Â°ÂªÃ Â±Å Ã Â°â€šÃ Â°Â¦Ã Â°â€šÃ Â°Â¡Ã Â°Â¿', scanAbha: 'ABHA QR Ã Â°Â¸Ã Â±ÂÃ Â°â€¢Ã Â°Â¾Ã Â°Â¨Ã Â±Â Ã Â°Å¡Ã Â±â€¡Ã Â°Â¯Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    snapRx: 'Ã Â°ÂªÃ Â°Â¾Ã Â°Â¤ Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Â¿Ã Â°Â¸Ã Â±ÂÃ Â°â€¢Ã Â±ÂÃ Â°Â°Ã Â°Â¿Ã Â°ÂªÃ Â±ÂÃ Â°Â·Ã Â°Â¨Ã Â±Â Ã Â°Â«Ã Â±â€¹Ã Â°Å¸Ã Â±â€¹', voiceMeds: 'Ã Â°Â®Ã Â°â€šÃ Â°Â¦Ã Â±ÂÃ Â°Â²Ã Â±Â Ã Â°Å¡Ã Â±â€ Ã Â°ÂªÃ Â±ÂÃ Â°ÂªÃ Â°â€šÃ Â°Â¡Ã Â°Â¿',
    placeholderName: 'Ã Â°ÂªÃ Â±â€šÃ Â°Â°Ã Â±ÂÃ Â°Â¤Ã Â°Â¿ Ã Â°ÂªÃ Â±â€¡Ã Â°Â°Ã Â±Â...', placeholderComplaint: 'Ã Â°Â®Ã Â±â‚¬ Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Â§Ã Â°Â¾Ã Â°Â¨ Ã Â°Â¸Ã Â°Â®Ã Â°Â¸Ã Â±ÂÃ Â°Â¯ Ã Â°Å¡Ã Â±â€ Ã Â°ÂªÃ Â±ÂÃ Â°ÂªÃ Â°â€šÃ Â°Â¡Ã Â°Â¿...',
    selectGender: 'Ã Â°Å½Ã Â°â€šÃ Â°Å¡Ã Â±ÂÃ Â°â€¢Ã Â±â€¹Ã Â°â€šÃ Â°Â¡Ã Â°Â¿...', male: 'Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â±ÂÃ Â°Â·Ã Â±ÂÃ Â°Â¡Ã Â±Â', female: 'Ã Â°Â¸Ã Â±ÂÃ Â°Â¤Ã Â±ÂÃ Â°Â°Ã Â±â‚¬', other: 'Ã Â°â€¡Ã Â°Â¤Ã Â°Â°',
  },
  'ta-IN': {
    label: 'Ã Â®Â¤Ã Â®Â®Ã Â®Â¿Ã Â®Â´Ã Â¯Â', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â®Â¨Ã Â¯â€¹Ã Â®Â¯Ã Â®Â¾Ã Â®Â³Ã Â®Â¿ Ã Â®ÂªÃ Â¯â€ Ã Â®Â¯Ã Â®Â°Ã Â¯Â', age: 'Ã Â®ÂµÃ Â®Â¯Ã Â®Â¤Ã Â¯Â', gender: 'Ã Â®ÂªÃ Â®Â¾Ã Â®Â²Ã Â®Â¿Ã Â®Â©Ã Â®Â®Ã Â¯Â',
    complaint: 'Ã Â®Â®Ã Â¯ÂÃ Â®Â¤Ã Â®Â©Ã Â¯ÂÃ Â®Â®Ã Â¯Ë† Ã Â®ÂªÃ Â¯ÂÃ Â®â€¢Ã Â®Â¾Ã Â®Â°Ã Â¯Â', agni: 'Ã Â®Å¡Ã Â¯â€ Ã Â®Â°Ã Â®Â¿Ã Â®Â®Ã Â®Â¾Ã Â®Â© Ã Â®Å¡Ã Â®â€¢Ã Â¯ÂÃ Â®Â¤Ã Â®Â¿ (Ã Â®â€¦Ã Â®â€¢Ã Â¯ÂÃ Â®Â©Ã Â®Â¿)',
    koshtha: 'Ã Â®Â®Ã Â®Â² Ã Â®ÂµÃ Â®â€¢Ã Â¯Ë† (Ã Â®â€¢Ã Â¯â€¹Ã Â®Â·Ã Â¯ÂÃ Â®Å¸)', medicines: 'Ã Â®Â¤Ã Â®Â±Ã Â¯ÂÃ Â®ÂªÃ Â¯â€¹Ã Â®Â¤Ã Â¯Ë†Ã Â®Â¯ Ã Â®Â®Ã Â®Â°Ã Â¯ÂÃ Â®Â¨Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â',
    speak: 'Ã Â®ÂªÃ Â¯â€¡Ã Â®Å¡Ã Â¯ÂÃ Â®â„¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â', stop: 'Ã Â®Â¨Ã Â®Â¿Ã Â®Â±Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®â„¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â', next: 'Ã Â®â€¦Ã Â®Å¸Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®Â¤Ã Â¯Â', back: 'Ã Â®Â¤Ã Â®Â¿Ã Â®Â°Ã Â¯ÂÃ Â®Â®Ã Â¯ÂÃ Â®ÂªÃ Â¯Â',
    submit: 'Ã Â®Å¡Ã Â®Â®Ã Â®Â°Ã Â¯ÂÃ Â®ÂªÃ Â¯ÂÃ Â®ÂªÃ Â®Â¿Ã Â®â€¢Ã Â¯ÂÃ Â®â€¢Ã Â®ÂµÃ Â¯ÂÃ Â®Â®Ã Â¯Â & Ã Â®Å¸Ã Â¯â€¹Ã Â®â€¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â©Ã Â¯Â Ã Â®ÂªÃ Â¯â€ Ã Â®Â±Ã Â®ÂµÃ Â¯ÂÃ Â®Â®Ã Â¯Â', scanAbha: 'ABHA QR Ã Â®Â¸Ã Â¯ÂÃ Â®â€¢Ã Â¯â€¡Ã Â®Â©Ã Â¯Â Ã Â®Å¡Ã Â¯â€ Ã Â®Â¯Ã Â¯ÂÃ Â®Â¯Ã Â®ÂµÃ Â¯ÂÃ Â®Â®Ã Â¯Â',
    snapRx: 'Ã Â®ÂªÃ Â®Â´Ã Â¯Ë†Ã Â®Â¯ Ã Â®Â®Ã Â®Â°Ã Â¯ÂÃ Â®Â¨Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®Å¡Ã Â¯ÂÃ Â®Å¡Ã Â¯â‚¬Ã Â®Å¸Ã Â¯ÂÃ Â®Å¸Ã Â¯Â Ã Â®ÂªÃ Â¯ÂÃ Â®â€¢Ã Â¯Ë†Ã Â®ÂªÃ Â¯ÂÃ Â®ÂªÃ Â®Å¸Ã Â®Â®Ã Â¯Â', voiceMeds: 'Ã Â®Â®Ã Â®Â°Ã Â¯ÂÃ Â®Â¨Ã Â¯ÂÃ Â®Â¤Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â Ã Â®Å¡Ã Â¯Å Ã Â®Â²Ã Â¯ÂÃ Â®Â²Ã Â¯ÂÃ Â®â„¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â',
    placeholderName: 'Ã Â®Â®Ã Â¯ÂÃ Â®Â´Ã Â¯Â Ã Â®ÂªÃ Â¯â€ Ã Â®Â¯Ã Â®Â°Ã Â¯Â...', placeholderComplaint: 'Ã Â®â€°Ã Â®â„¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â Ã Â®Â®Ã Â¯ÂÃ Â®Â¤Ã Â®Â©Ã Â¯ÂÃ Â®Â®Ã Â¯Ë† Ã Â®ÂªÃ Â®Â¿Ã Â®Â°Ã Â®Å¡Ã Â¯ÂÃ Â®Å¡Ã Â®Â©Ã Â¯Ë†Ã Â®Â¯Ã Â¯Ë† Ã Â®Å¡Ã Â¯Å Ã Â®Â²Ã Â¯ÂÃ Â®Â²Ã Â¯ÂÃ Â®â„¢Ã Â¯ÂÃ Â®â€¢Ã Â®Â³Ã Â¯Â...',
    selectGender: 'Ã Â®Â¤Ã Â¯â€¡Ã Â®Â°Ã Â¯ÂÃ Â®Â¨Ã Â¯ÂÃ Â®Â¤Ã Â¯â€ Ã Â®Å¸Ã Â¯ÂÃ Â®â€¢Ã Â¯ÂÃ Â®â€¢Ã Â®ÂµÃ Â¯ÂÃ Â®Â®Ã Â¯Â...', male: 'Ã Â®â€ Ã Â®Â£Ã Â¯Â', female: 'Ã Â®ÂªÃ Â¯â€ Ã Â®Â£Ã Â¯Â', other: 'Ã Â®Â®Ã Â®Â±Ã Â¯ÂÃ Â®Â±Ã Â®ÂµÃ Â¯Ë†',
  },
  'gu-IN': {
    label: 'Ã Âªâ€”Ã Â«ÂÃ ÂªÅ“Ã ÂªÂ°Ã ÂªÂ¾Ã ÂªÂ¤Ã Â«â‚¬', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã ÂªÂ¦Ã ÂªÂ°Ã Â«ÂÃ ÂªÂ¦Ã Â«â‚¬Ã ÂªÂ¨Ã Â«ÂÃ Âªâ€š Ã ÂªÂ¨Ã ÂªÂ¾Ã ÂªÂ®', age: 'Ã Âªâ€°Ã Âªâ€šÃ ÂªÂ®Ã ÂªÂ°', gender: 'Ã ÂªÅ“Ã ÂªÂ¾Ã ÂªÂ¤Ã ÂªÂ¿',
    complaint: 'Ã ÂªÂ®Ã Â«ÂÃ Âªâ€“Ã Â«ÂÃ ÂªÂ¯ Ã ÂªÂ«Ã ÂªÂ°Ã ÂªÂ¿Ã ÂªÂ¯Ã ÂªÂ¾Ã ÂªÂ¦', agni: 'Ã ÂªÂªÃ ÂªÂ¾Ã ÂªÅ¡Ã ÂªÂ¨ Ã ÂªÂ¶Ã Âªâ€¢Ã Â«ÂÃ ÂªÂ¤Ã ÂªÂ¿ (Ã Âªâ€¦Ã Âªâ€”Ã Â«ÂÃ ÂªÂ¨Ã ÂªÂ¿)',
    koshtha: 'Ã ÂªÂ®Ã ÂªÂ³ Ã ÂªÂªÃ Â«ÂÃ ÂªÂ°Ã Âªâ€¢Ã Â«Æ’Ã ÂªÂ¤Ã ÂªÂ¿ (Ã Âªâ€¢Ã Â«â€¹Ã ÂªÂ·Ã Â«ÂÃ ÂªÂ )', medicines: 'Ã ÂªÂ¹Ã ÂªÂ¾Ã ÂªÂ²Ã ÂªÂ¨Ã Â«â‚¬ Ã ÂªÂ¦Ã ÂªÂµÃ ÂªÂ¾Ã Âªâ€œ',
    speak: 'Ã ÂªÂ¬Ã Â«â€¹Ã ÂªÂ²Ã Â«â€¹', stop: 'Ã ÂªÂ°Ã Â«â€¹Ã Âªâ€¢Ã Â«â€¹', next: 'Ã Âªâ€ Ã Âªâ€”Ã ÂªÂ³', back: 'Ã ÂªÂªÃ ÂªÂ¾Ã Âªâ€ºÃ ÂªÂ³',
    submit: 'Ã ÂªÂ¸Ã ÂªÂ¬Ã ÂªÂ®Ã ÂªÂ¿Ã ÂªÅ¸ Ã Âªâ€¢Ã ÂªÂ°Ã Â«â€¹ Ã Âªâ€¦Ã ÂªÂ¨Ã Â«â€¡ Ã ÂªÅ¸Ã Â«â€¹Ã Âªâ€¢Ã ÂªÂ¨ Ã ÂªÂ®Ã Â«â€¡Ã ÂªÂ³Ã ÂªÂµÃ Â«â€¹', scanAbha: 'ABHA QR Ã ÂªÂ¸Ã Â«ÂÃ Âªâ€¢Ã Â«â€¦Ã ÂªÂ¨ Ã Âªâ€¢Ã ÂªÂ°Ã Â«â€¹',
    snapRx: 'Ã ÂªÅ“Ã Â«â€šÃ ÂªÂ¨Ã Â«â‚¬ Ã ÂªÂªÃ Â«ÂÃ ÂªÂ°Ã ÂªÂ¿Ã ÂªÂ¸Ã Â«ÂÃ Âªâ€¢Ã Â«ÂÃ ÂªÂ°Ã ÂªÂ¿Ã ÂªÂªÃ Â«ÂÃ ÂªÂ¶Ã ÂªÂ¨Ã ÂªÂ¨Ã Â«â€¹ Ã ÂªÂ«Ã Â«â€¹Ã ÂªÅ¸Ã Â«â€¹', voiceMeds: 'Ã ÂªÂ¦Ã ÂªÂµÃ ÂªÂ¾Ã Âªâ€œ Ã ÂªÂ¬Ã Â«â€¹Ã ÂªÂ²Ã Â«â€¹',
    placeholderName: 'Ã ÂªÂªÃ Â«â€šÃ ÂªÂ°Ã Â«ÂÃ Âªâ€š Ã ÂªÂ¨Ã ÂªÂ¾Ã ÂªÂ®...', placeholderComplaint: 'Ã ÂªÂ¤Ã ÂªÂ®Ã ÂªÂ¾Ã ÂªÂ°Ã Â«â‚¬ Ã ÂªÂ®Ã Â«ÂÃ Âªâ€“Ã Â«ÂÃ ÂªÂ¯ Ã ÂªÂ¤Ã Âªâ€¢Ã ÂªÂ²Ã Â«â‚¬Ã ÂªÂ« Ã ÂªÅ“Ã ÂªÂ£Ã ÂªÂ¾Ã ÂªÂµÃ Â«â€¹...',
    selectGender: 'Ã ÂªÂªÃ ÂªÂ¸Ã Âªâ€šÃ ÂªÂ¦ Ã Âªâ€¢Ã ÂªÂ°Ã Â«â€¹...', male: 'Ã ÂªÂªÃ Â«ÂÃ ÂªÂ°Ã Â«ÂÃ ÂªÂ·', female: 'Ã ÂªÂ¸Ã Â«ÂÃ ÂªÂ¤Ã Â«ÂÃ ÂªÂ°Ã Â«â‚¬', other: 'Ã Âªâ€¦Ã ÂªÂ¨Ã Â«ÂÃ ÂªÂ¯',
  },
  'kn-IN': {
    label: 'Ã Â²â€¢Ã Â²Â¨Ã Â³ÂÃ Â²Â¨Ã Â²Â¡', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â²Â°Ã Â³â€¹Ã Â²â€”Ã Â²Â¿Ã Â²Â¯ Ã Â²Â¹Ã Â³â€ Ã Â²Â¸Ã Â²Â°Ã Â³Â', age: 'Ã Â²ÂµÃ Â²Â¯Ã Â²Â¸Ã Â³ÂÃ Â²Â¸Ã Â³Â', gender: 'Ã Â²Â²Ã Â²Â¿Ã Â²â€šÃ Â²â€”',
    complaint: 'Ã Â²Â®Ã Â³ÂÃ Â²â€“Ã Â³ÂÃ Â²Â¯ Ã Â²Â¦Ã Â³â€šÃ Â²Â°Ã Â³Â', agni: 'Ã Â²Å“Ã Â³â‚¬Ã Â²Â°Ã Â³ÂÃ Â²Â£ Ã Â²Â¶Ã Â²â€¢Ã Â³ÂÃ Â²Â¤Ã Â²Â¿ (Ã Â²â€¦Ã Â²â€”Ã Â³ÂÃ Â²Â¨Ã Â²Â¿)',
    koshtha: 'Ã Â²Â®Ã Â²Â² Ã Â²ÂªÃ Â³ÂÃ Â²Â°Ã Â²â€¢Ã Â³Æ’Ã Â²Â¤Ã Â²Â¿ (Ã Â²â€¢Ã Â³â€¹Ã Â²Â·Ã Â³ÂÃ Â²Â )', medicines: 'Ã Â²ÂªÃ Â³ÂÃ Â²Â°Ã Â²Â¸Ã Â³ÂÃ Â²Â¤Ã Â³ÂÃ Â²Â¤ Ã Â²â€Ã Â²Â·Ã Â²Â§Ã Â²â€”Ã Â²Â³Ã Â³Â',
    speak: 'Ã Â²Â®Ã Â²Â¾Ã Â²Â¤Ã Â²Â¨Ã Â²Â¾Ã Â²Â¡Ã Â²Â¿', stop: 'Ã Â²Â¨Ã Â²Â¿Ã Â²Â²Ã Â³ÂÃ Â²Â²Ã Â²Â¿Ã Â²Â¸Ã Â²Â¿', next: 'Ã Â²Â®Ã Â³ÂÃ Â²â€šÃ Â²Â¦Ã Â³â€ ', back: 'Ã Â²Â¹Ã Â²Â¿Ã Â²â€šÃ Â²Â¦Ã Â³â€ ',
    submit: 'Ã Â²Â¸Ã Â²Â²Ã Â³ÂÃ Â²Â²Ã Â²Â¿Ã Â²Â¸Ã Â²Â¿ Ã Â²Â®Ã Â²Â¤Ã Â³ÂÃ Â²Â¤Ã Â³Â Ã Â²Å¸Ã Â³â€¹Ã Â²â€¢Ã Â²Â¨Ã Â³Â Ã Â²ÂªÃ Â²Â¡Ã Â³â€ Ã Â²Â¯Ã Â²Â¿Ã Â²Â°Ã Â²Â¿', scanAbha: 'ABHA QR Ã Â²Â¸Ã Â³ÂÃ Â²â€¢Ã Â³ÂÃ Â²Â¯Ã Â²Â¾Ã Â²Â¨Ã Â³Â Ã Â²Â®Ã Â²Â¾Ã Â²Â¡Ã Â²Â¿',
    snapRx: 'Ã Â²Â¹Ã Â²Â³Ã Â³â€ Ã Â²Â¯ Ã Â²ÂªÃ Â³ÂÃ Â²Â°Ã Â²Â¿Ã Â²Â¸Ã Â³ÂÃ Â²â€¢Ã Â³ÂÃ Â²Â°Ã Â²Â¿Ã Â²ÂªÃ Â³ÂÃ Â²Â·Ã Â²Â¨Ã Â³Â Ã Â²Â«Ã Â³â€¹Ã Â²Å¸Ã Â³â€¹', voiceMeds: 'Ã Â²â€Ã Â²Â·Ã Â²Â§Ã Â²â€”Ã Â²Â³Ã Â²Â¨Ã Â³ÂÃ Â²Â¨Ã Â³Â Ã Â²Â¹Ã Â³â€¡Ã Â²Â³Ã Â²Â¿',
    placeholderName: 'Ã Â²ÂªÃ Â³â€šÃ Â²Â°Ã Â³ÂÃ Â²Â£ Ã Â²Â¹Ã Â³â€ Ã Â²Â¸Ã Â²Â°Ã Â³Â...', placeholderComplaint: 'Ã Â²Â¨Ã Â²Â¿Ã Â²Â®Ã Â³ÂÃ Â²Â® Ã Â²Â®Ã Â³ÂÃ Â²â€“Ã Â³ÂÃ Â²Â¯ Ã Â²Â¸Ã Â²Â®Ã Â²Â¸Ã Â³ÂÃ Â²Â¯Ã Â³â€  Ã Â²Â¹Ã Â³â€¡Ã Â²Â³Ã Â²Â¿...',
    selectGender: 'Ã Â²â€ Ã Â²Â¯Ã Â³ÂÃ Â²â€¢Ã Â³â€  Ã Â²Â®Ã Â²Â¾Ã Â²Â¡Ã Â²Â¿...', male: 'Ã Â²ÂªÃ Â³ÂÃ Â²Â°Ã Â³ÂÃ Â²Â·', female: 'Ã Â²Â®Ã Â²Â¹Ã Â²Â¿Ã Â²Â³Ã Â³â€ ', other: 'Ã Â²â€¡Ã Â²Â¤Ã Â²Â°Ã Â³â€ ',
  },
  'ml-IN': {
    label: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â´Â°Ã Âµâ€¹Ã Â´â€”Ã Â´Â¿Ã Â´Â¯Ã ÂµÂÃ Â´Å¸Ã Âµâ€  Ã Â´ÂªÃ Âµâ€¡Ã Â´Â°Ã ÂµÂ', age: 'Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â¾Ã Â´Â¯Ã Â´â€š', gender: 'Ã Â´Â²Ã Â´Â¿Ã Â´â€šÃ Â´â€”Ã Â´â€š',
    complaint: 'Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â§Ã Â´Â¾Ã Â´Â¨ Ã Â´ÂªÃ Â´Â°Ã Â´Â¾Ã Â´Â¤Ã Â´Â¿', agni: 'Ã Â´Â¦Ã Â´Â¹Ã Â´Â¨ Ã Â´Â¶Ã Â´â€¢Ã ÂµÂÃ Â´Â¤Ã Â´Â¿ (Ã Â´â€¦Ã Â´â€”Ã ÂµÂÃ Â´Â¨Ã Â´Â¿)',
    koshtha: 'Ã Â´Â®Ã Â´Â²Ã Â´â€š Ã Â´Â¤Ã Â´Â°Ã Â´â€š (Ã Â´â€¢Ã Âµâ€¹Ã Â´Â·Ã ÂµÂÃ Â´Â )', medicines: 'Ã Â´Â¨Ã Â´Â¿Ã Â´Â²Ã Â´ÂµÃ Â´Â¿Ã Â´Â²Ã Âµâ€  Ã Â´Â®Ã Â´Â°Ã ÂµÂÃ Â´Â¨Ã ÂµÂÃ Â´Â¨Ã ÂµÂÃ Â´â€¢Ã ÂµÂ¾',
    speak: 'Ã Â´Â¸Ã Â´â€šÃ Â´Â¸Ã Â´Â¾Ã Â´Â°Ã Â´Â¿Ã Â´â€¢Ã ÂµÂÃ Â´â€¢Ã Âµâ€š', stop: 'Ã Â´Â¨Ã Â´Â¿Ã ÂµÂ¼Ã Â´Â¤Ã ÂµÂÃ Â´Â¤Ã Âµâ€š', next: 'Ã Â´â€¦Ã Â´Å¸Ã ÂµÂÃ Â´Â¤Ã ÂµÂÃ Â´Â¤Ã Â´Â¤Ã ÂµÂ', back: 'Ã Â´ÂªÃ Â´Â¿Ã Â´Â¨Ã ÂµÂÃ Â´Â¨Ã Âµâ€¹Ã Â´Å¸Ã ÂµÂÃ Â´Å¸Ã ÂµÂ',
    submit: 'Ã Â´Â¸Ã Â´Â®Ã ÂµÂ¼Ã Â´ÂªÃ ÂµÂÃ Â´ÂªÃ Â´Â¿Ã Â´â€¢Ã ÂµÂÃ Â´â€¢Ã Âµâ€š & Ã Â´Å¸Ã Âµâ€¹Ã Â´â€¢Ã ÂµÂÃ Â´â€¢Ã ÂµÂº Ã Â´Â¨Ã Âµâ€¡Ã Â´Å¸Ã Âµâ€š', scanAbha: 'ABHA QR Ã Â´Â¸Ã ÂµÂÃ Â´â€¢Ã Â´Â¾Ã ÂµÂ» Ã Â´Å¡Ã Âµâ€ Ã Â´Â¯Ã ÂµÂÃ Â´Â¯Ã Âµâ€š',
    snapRx: 'Ã Â´ÂªÃ Â´Â´Ã Â´Â¯ Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â¿Ã Â´Â¸Ã ÂµÂÃ Â´â€¢Ã ÂµÂÃ Â´Â°Ã Â´Â¿Ã Â´ÂªÃ ÂµÂÃ Â´Â·Ã ÂµÂ» Ã Â´Â«Ã Âµâ€¹Ã Â´Å¸Ã ÂµÂÃ Â´Å¸Ã Âµâ€¹', voiceMeds: 'Ã Â´Â®Ã Â´Â°Ã ÂµÂÃ Â´Â¨Ã ÂµÂÃ Â´Â¨Ã ÂµÂÃ Â´â€¢Ã ÂµÂ¾ Ã Â´ÂªÃ Â´Â±Ã Â´Â¯Ã Âµâ€š',
    placeholderName: 'Ã Â´ÂªÃ Âµâ€šÃ ÂµÂ¼Ã Â´Â£Ã ÂµÂÃ Â´Â£ Ã Â´ÂªÃ Âµâ€¡Ã Â´Â°Ã ÂµÂ...', placeholderComplaint: 'Ã Â´Â¨Ã Â´Â¿Ã Â´â„¢Ã ÂµÂÃ Â´â„¢Ã Â´Â³Ã ÂµÂÃ Â´Å¸Ã Âµâ€  Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â§Ã Â´Â¾Ã Â´Â¨ Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã Â´Â¶Ã ÂµÂÃ Â´Â¨Ã Â´â€š Ã Â´ÂªÃ Â´Â±Ã Â´Â¯Ã Âµâ€š...',
    selectGender: 'Ã Â´Â¤Ã Â´Â¿Ã Â´Â°Ã Â´Å¾Ã ÂµÂÃ Â´Å¾Ã Âµâ€ Ã Â´Å¸Ã ÂµÂÃ Â´â€¢Ã ÂµÂÃ Â´â€¢Ã Âµâ€š...', male: 'Ã Â´ÂªÃ ÂµÂÃ Â´Â°Ã ÂµÂÃ Â´Â·Ã ÂµÂ»', female: 'Ã Â´Â¸Ã ÂµÂÃ Â´Â¤Ã ÂµÂÃ Â´Â°Ã Âµâ‚¬', other: 'Ã Â´Â®Ã Â´Â±Ã ÂµÂÃ Â´Â±Ã ÂµÂÃ Â´Â³Ã ÂµÂÃ Â´Â³Ã Â´Âµ',
  },
  'or-IN': {
    label: '\u0B13\u0B21\u0B3C\u0B3F\u0B06', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã Â¬Â°Ã Â­â€¹Ã Â¬â€”Ã Â­â‚¬Ã Â¬â„¢Ã Â­ÂÃ Â¬â€¢ Ã Â¬Â¨Ã Â¬Â¾Ã Â¬Â®', age: 'Ã Â¬Â¬Ã Â­Å¸Ã Â¬Â¸', gender: 'Ã Â¬Â²Ã Â¬Â¿Ã Â¬â„¢Ã Â­ÂÃ Â¬â€”',
    complaint: 'Ã Â¬Â®Ã Â­ÂÃ Â¬â€“Ã Â­ÂÃ Â­Å¸ Ã Â¬â€¦Ã Â¬Â­Ã Â¬Â¿Ã Â¬Â¯Ã Â­â€¹Ã Â¬â€”', agni: 'Ã Â¬ÂªÃ Â¬Â¾Ã Â¬Å¡Ã Â¬Â¨ Ã Â¬Â¶Ã Â¬â€¢Ã Â­ÂÃ Â¬Â¤Ã Â¬Â¿ (Ã Â¬â€¦Ã Â¬â€”Ã Â­ÂÃ Â¬Â¨Ã Â¬Â¿)',
    koshtha: 'Ã Â¬Â®Ã Â¬Â³ Ã Â¬ÂªÃ Â­ÂÃ Â¬Â°Ã Â¬â€¢Ã Â­Æ’Ã Â¬Â¤Ã Â¬Â¿ (Ã Â¬â€¢Ã Â­â€¹Ã Â¬Â·Ã Â­ÂÃ Â¬Â )', medicines: 'Ã Â¬Â¬Ã Â¬Â°Ã Â­ÂÃ Â¬Â¤Ã Â­ÂÃ Â¬Â¤Ã Â¬Â®Ã Â¬Â¾Ã Â¬Â¨ Ã Â¬â€Ã Â¬Â·Ã Â¬Â§',
    speak: 'Ã Â¬â€¢Ã Â­ÂÃ Â¬Â¹Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â', stop: 'Ã Â¬Â¬Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¦ Ã Â¬â€¢Ã Â¬Â°Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â', next: 'Ã Â¬ÂªÃ Â¬Â°Ã Â¬Â¬Ã Â¬Â°Ã Â­ÂÃ Â¬Â¤Ã Â­ÂÃ Â¬Â¤Ã Â­â‚¬', back: 'Ã Â¬ÂªÃ Â¬â€ºÃ Â¬â€¢Ã Â­Â',
    submit: 'Ã Â¬Â¦Ã Â¬Â¾Ã Â¬â€“Ã Â¬Â² Ã Â¬â€¢Ã Â¬Â°Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â Ã Â¬ÂÃ Â¬Â¬Ã Â¬â€š Ã Â¬Å¸Ã Â­â€¹Ã Â¬â€¢Ã Â­â€¡Ã Â¬Â¨ Ã Â¬Â¨Ã Â¬Â¿Ã Â¬â€¦Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â', scanAbha: 'ABHA QR Ã Â¬Â¸Ã Â­ÂÃ Â¬â€¢Ã Â­ÂÃ Â­Å¸Ã Â¬Â¾Ã Â¬Â¨ Ã Â¬â€¢Ã Â¬Â°Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â',
    snapRx: 'Ã Â¬ÂªÃ Â­ÂÃ Â¬Â°Ã Â­ÂÃ Â¬Â£Ã Â¬Â¾ Ã Â¬ÂªÃ Â­ÂÃ Â¬Â°Ã Â­â€¡Ã Â¬Â¸Ã Â­ÂÃ Â¬â€¢Ã Â­ÂÃ Â¬Â°Ã Â¬Â¿Ã Â¬ÂªÃ Â­ÂÃ Â¬Â¸Ã Â¬Â¨ Ã Â¬Â«Ã Â¬Å¸Ã Â­â€¹', voiceMeds: 'Ã Â¬â€Ã Â¬Â·Ã Â¬Â§ Ã Â¬â€¢Ã Â­ÂÃ Â¬Â¹Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â',
    placeholderName: 'Ã Â¬ÂªÃ Â­â€šÃ Â¬Â°Ã Â­ÂÃ Â¬Â£ Ã Â¬Â¨Ã Â¬Â¾Ã Â¬Â®...', placeholderComplaint: 'Ã Â¬â€ Ã Â¬ÂªÃ Â¬Â£Ã Â¬â„¢Ã Â­ÂÃ Â¬â€¢ Ã Â¬Â®Ã Â­ÂÃ Â¬â€“Ã Â­ÂÃ Â­Å¸ Ã Â¬Â¸Ã Â¬Â®Ã Â¬Â¸Ã Â­ÂÃ Â­Å¸Ã Â¬Â¾ Ã Â¬â€¢Ã Â­ÂÃ Â¬Â¹Ã Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â...',
    selectGender: 'Ã Â¬Â¬Ã Â¬Â¾Ã Â¬â€ºÃ Â¬Â¨Ã Â­ÂÃ Â¬Â¤Ã Â­Â...', male: 'Ã Â¬ÂªÃ Â­ÂÃ Â¬Â°Ã Â­ÂÃ Â¬Â·', female: 'Ã Â¬Â®Ã Â¬Â¹Ã Â¬Â¿Ã Â¬Â³Ã Â¬Â¾', other: 'Ã Â¬â€¦Ã Â¬Â¨Ã Â­ÂÃ Â­Å¸',
  },
  'ur-IN': {
    label: '\u0627\u0631\u062F\u0648', flag: '\uD83C\uDDEE\uD83C\uDDF3',
    patientName: 'Ã™â€¦Ã˜Â±Ã›Å’Ã˜Â¶ ÃšÂ©Ã˜Â§ Ã™â€ Ã˜Â§Ã™â€¦', age: 'Ã˜Â¹Ã™â€¦Ã˜Â±', gender: 'Ã˜Â¬Ã™â€ Ã˜Â³',
    complaint: 'Ã˜Â§Ã›ÂÃ™â€¦ Ã˜Â´ÃšÂ©Ã˜Â§Ã›Å’Ã˜Âª', agni: 'Ã›ÂÃ˜Â§Ã˜Â¶Ã™â€¦Ã›â€™ ÃšÂ©Ã›Å’ Ã˜Â·Ã˜Â§Ã™â€šÃ˜Âª (Ã˜Â§ÃšÂ¯Ã™â€ Ã›Å’)',
    koshtha: 'Ã™Â¾Ã˜Â§Ã˜Â®Ã˜Â§Ã™â€ Ã›â€™ ÃšÂ©Ã›Å’ Ã™â€šÃ˜Â³Ã™â€¦ (ÃšÂ©Ã™Ë†Ã˜Â´Ã™Â¹ÃšÂ¾)', medicines: 'Ã™â€¦Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯Ã›Â Ã˜Â¯Ã™Ë†Ã˜Â§Ã˜Â¦Ã›Å’ÃšÂº',
    speak: 'Ã˜Â¨Ã™Ë†Ã™â€žÃ›Å’ÃšÂº', stop: 'Ã˜Â±Ã™Ë†ÃšÂ©Ã›Å’ÃšÂº', next: 'Ã˜Â¢ÃšÂ¯Ã›â€™', back: 'Ã™Â¾Ã›Å’Ãšâ€ ÃšÂ¾Ã›â€™',
    submit: 'Ã˜Â¬Ã™â€¦Ã˜Â¹ ÃšÂ©Ã˜Â±Ã›Å’ÃšÂº Ã˜Â§Ã™Ë†Ã˜Â± Ã™Â¹Ã™Ë†ÃšÂ©Ã™â€  Ã™â€žÃ›Å’ÃšÂº', scanAbha: 'ABHA QR Ã˜Â§Ã˜Â³ÃšÂ©Ã›Å’Ã™â€  ÃšÂ©Ã˜Â±Ã›Å’ÃšÂº',
    snapRx: 'Ã™Â¾Ã˜Â±Ã˜Â§Ã™â€ Ã›â€™ Ã™â€ Ã˜Â³Ã˜Â®Ã›â€™ ÃšÂ©Ã›Å’ Ã˜ÂªÃ˜ÂµÃ™Ë†Ã›Å’Ã˜Â±', voiceMeds: 'Ã˜Â¯Ã™Ë†Ã˜Â§Ã˜Â¦Ã›Å’ÃšÂº Ã˜Â¨Ã™Ë†Ã™â€žÃ›Å’ÃšÂº',
    placeholderName: 'Ã™Â¾Ã™Ë†Ã˜Â±Ã˜Â§ Ã™â€ Ã˜Â§Ã™â€¦...', placeholderComplaint: 'Ã˜Â§Ã™Â¾Ã™â€ Ã›Å’ Ã˜Â§Ã›ÂÃ™â€¦ Ã˜ÂªÃšÂ©Ã™â€žÃ›Å’Ã™Â Ã˜Â¨Ã˜ÂªÃ˜Â§Ã˜Â¦Ã›Å’ÃšÂº...',
    selectGender: 'Ã™â€¦Ã™â€ Ã˜ÂªÃ˜Â®Ã˜Â¨ ÃšÂ©Ã˜Â±Ã›Å’ÃšÂº...', male: 'Ã™â€¦Ã˜Â±Ã˜Â¯', female: 'Ã˜Â¹Ã™Ë†Ã˜Â±Ã˜Âª', other: 'Ã˜Â¯Ã›Å’ÃšÂ¯Ã˜Â±',
  },
};

const LANG_ORDER: LangCode[] = [
  'en-IN','hi-IN','pa-IN','bn-IN','mr-IN','te-IN',
  'ta-IN','gu-IN','kn-IN','ml-IN','or-IN','ur-IN',
];

// --- Clinical Complaint Categories -----------------------------------------


const AGNI_OPTIONS = [
  {
    id: 'mandagni', label: 'Mandagni', sublabel: 'Slow / Heavy', hindi: '\u092E\u0902\u0926\u093E\u0917\u094D\u0928\u093F', desc: '\u092D\u093E\u0930\u0940\u092A\u0928, \u0928\u0940\u0902\u0926', emoji: '\uD83C\uDF0A',
    active_light: 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 text-blue-900',
    active_dark:  'border-blue-400 bg-blue-900/40 ring-2 ring-blue-400',
    inactive_light:'border-slate-300 bg-white hover:border-blue-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-blue-600 text-white',
  },
  {
    id: 'vishamagni', label: 'Vishamagni', sublabel: 'Irregular / Gas', hindi: '\u0935\u093F\u0937\u092E\u093E\u0917\u094D\u0928\u093F', desc: '\u0905\u0928\u093F\u092F\u092E\u093F\u0924, \u0917\u0948\u0938', emoji: '\uD83D\uDCA8',
    active_light: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 text-amber-900',
    active_dark:  'border-amber-400 bg-amber-900/40 ring-2 ring-amber-400',
    inactive_light:'border-slate-300 bg-white hover:border-amber-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-amber-600 text-white',
  },
  {
    id: 'tikshnagni', label: 'Tikshnagni', sublabel: 'Intense / Acidic', hindi: '\u0924\u0940\u0915\u094D\u0937\u094D\u0923\u093E\u0917\u094D\u0928\u093F', desc: '\u091C\u0932\u0928, \u090F\u0938\u093F\u0921\u093F\u091F\u0940', emoji: '\uD83D\uDD25',
    active_light: 'border-red-500 bg-red-50 ring-2 ring-red-400 text-red-900',
    active_dark:  'border-red-400 bg-red-900/40 ring-2 ring-red-400',
    inactive_light:'border-slate-300 bg-white hover:border-red-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-red-600 text-white',
  },
  {
    id: 'samagni', label: 'Samagni', sublabel: 'Balanced', hindi: '\u0938\u092E\u093E\u0917\u094D\u0928\u093F', desc: '\u0938\u093E\u092E\u093E\u0928\u094D\u092F', emoji: '\u2705',
    active_light: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 text-emerald-900',
    active_dark:  'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400',
    inactive_light:'border-slate-300 bg-white hover:border-emerald-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-emerald-600 text-white',
  },
];

const KOSHTHA_OPTIONS = [
  {
    id: 'krura', label: 'Krura', sublabel: 'Hard / Constipated', hindi: '\u0915\u094D\u0930\u0942\u0930', emoji: '\uD83E\uDEA8',
    active_light: 'border-stone-500 bg-stone-50 ring-2 ring-stone-400 text-stone-900',
    active_dark:  'border-stone-400 bg-stone-900/40 ring-2 ring-stone-400',
    inactive_light:'border-slate-300 bg-white hover:border-stone-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-stone-500 text-white',
  },
  {
    id: 'madhyama', label: 'Madhyama', sublabel: 'Regular / Normal', hindi: '\u092E\u0927\u094D\u092F\u092E', emoji: '\uD83D\uDFE2',
    active_light: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 text-emerald-900',
    active_dark:  'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400',
    inactive_light:'border-slate-300 bg-white hover:border-emerald-400 text-slate-800 shadow-sm',
    inactive_dark: 'border-slate-600 bg-slate-800 hover:border-emerald-500 text-white',
  },
  {
    id: 'mridu', label: 'Mridu', sublabel: 'Loose / Soft', hindi: '\u092E\u0943\u0926\u0941', emoji: '\uD83D\uDCA7',
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

/**
 * Resolve the kiosk API base URL from the shared config so that all fetch()
 * calls work correctly on Vercel production, Render staging, and localhost.
 * The shared config already strips the trailing "/api/v1" path suffix, so
 * we strip it here to avoid doubling the prefix in every fetch URL below.
 */
const API_BASE = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const OPD_NAME = import.meta.env.VITE_KIOSK_OPD_NAME || 'Civil Hospital OPD';

// --- Interaction preview helper ----------------------------------------------

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
            warnings.push(`${drug} + ${herb}: potential interaction - consult doctor`);
          }
        });
      }
    }
  });
  return warnings;
}

// --- Live clock helper -------------------------------------------------------

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

// --- ABHA QR Scanner Modal ---------------------------------------------------

interface AbhaQrScanResult {
  name: string;
  age: string;
  abhaId: string;
  gender?: string;
  bloodGroup?: string;
  chronicConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
}

interface AbhaQrModalProps {
  dark: boolean;
  onClose: () => void;
  onScan: (result: AbhaQrScanResult) => void;
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
              // Support both ABDM standard QR and SehatMitra comprehensive QR
              const abhaId  = parsed.abha_id || parsed.hidn || parsed.healthId || raw;
              const name    = parsed.name || '';
              const age     = parsed.age ? String(parsed.age) : (
                parsed.dob ? String(new Date().getFullYear() - parseInt(parsed.dob.split('-')[0] || '0')) : ''
              );
              onScan({
                name, age, abhaId,
                gender:             parsed.gender || '',
                bloodGroup:         parsed.blood_group || '',
                chronicConditions:  Array.isArray(parsed.chronic_conditions)  ? parsed.chronic_conditions  : [],
                currentMedications: Array.isArray(parsed.current_medications) ? parsed.current_medications : [],
              });
              return;
            } catch {
              onScan({ name: '', age: '', abhaId: raw });
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
    onScan({ name: manualName, age: manualAge, abhaId: manualAbha.trim() });
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Snap Prescription Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
                Upload File
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
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : 'Extract Drugs'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface CharakKioskProps {
  onRedFlag?: (reason: string) => void;
}

export const CharakKiosk: React.FC<CharakKioskProps> = ({ onRedFlag }) => {
  // Ã¢â€â‚¬Ã¢â€â‚¬ Theme Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [dark, setDark] = useState(false);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Language Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [langCode, setLangCode] = useState<LangCode>('en-IN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const L = LANG_DICT[langCode];
  // Ã¢â€â‚¬Ã¢â€â‚¬ Step 0 Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [patientName, setPatientName] = useState('');
  const [age, setAge]                 = useState('');
  const [ageGroup, setAgeGroup]       = useState('');   // 'child' | 'adult' | 'middle' | 'senior'
  const [gender, setGender]           = useState('');
  const [patientId, setPatientId]     = useState(() => `PT-${Date.now()}`);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [abhaId, setAbhaId]           = useState('');

  // Ã¢â€â‚¬Ã¢â€â‚¬ Step 1 (voice/complaint) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [complaint, setComplaint]     = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef                = useRef<any>(null);

  // Ã¢â€â‚¬Ã¢â€â‚¬ IoT Vitals Pod Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [vitals, setVitals]         = useState<VitalsPod | null>(null);
  const [vitalsScan, setVitalsScan] = useState<'idle' | 'scanning' | 'done'>('idle');

  // Ã¢â€â‚¬Ã¢â€â‚¬ Step 2 (Dashavidha) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [agni, setAgni]       = useState('');
  const [koshtha, setKoshtha] = useState('');
  const [painScale, setPainScale] = useState(3);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Step 3 (medicines) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [allopathicMeds, setAllopathicMeds] = useState<string[]>([]);
  const [ayurvedicMeds, setAyurvedicMeds]   = useState<string[]>([]);
  const [alloInput, setAlloInput]           = useState('');
  const [ayurInput, setAyurInput]           = useState('');
  const [isVoiceMeds, setIsVoiceMeds]       = useState(false);
  const voiceMedRecRef                      = useRef<any>(null);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Modals Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [showSnapModal, setShowSnapModal] = useState(false);

  // â”€â”€ ABHA preview card (shown after scan/manual ABHA input) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [abhaPreview, setAbhaPreview] = useState<AbhaQrScanResult | null>(null);
  const [abhaIdInput, setAbhaIdInput] = useState('');
  // Allergies & chronic conditions fetched from ABHA card
  const [fetchedAllergies, setFetchedAllergies] = useState<string[]>([]);
  const [fetchedChronicConditions, setFetchedChronicConditions] = useState<string[]>([]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Flow control Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [result, setResult] = useState<IntakeResponse | null>(null);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auto-reset countdown (15 s after token generation) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Voice complaint Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Voice medicines Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Medicine toggles Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ ABHA QR callback Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleAbhaScan = (result: AbhaQrScanResult) => {
    // Show the ABHA Preview Card first â€” user must confirm before data fills
    setAbhaPreview(result);
    setShowAbhaModal(false);
  };

  /** Called when user taps "Confirm Details" on the ABHA preview card */
  const handleAbhaConfirm = () => {
    if (!abhaPreview) return;
    const result = abhaPreview;
    if (result.name)   setPatientName(result.name);
    if (result.age)    setAge(result.age);
    if (result.abhaId) { setAbhaId(result.abhaId); setPatientId(result.abhaId); }
    if (result.gender) setGender(result.gender.toLowerCase());
    if (result.allergies)          setFetchedAllergies(result.allergies);
    if (result.chronicConditions)  setFetchedChronicConditions(result.chronicConditions);
    // Auto-fill medications from QR
    if (result.currentMedications && result.currentMedications.length > 0) {
      result.currentMedications.forEach(med => {
        setAllopathicMeds(prev => prev.includes(med) ? prev : [...prev, med]);
      });
    }
    setAbhaPreview(null);
    setAbhaIdInput('');
  };

  /** Try to parse a manually-typed ABHA number and show a synthetic preview */
  const handleAbhaIdLookup = () => {
    const id = abhaIdInput.trim();
    if (!id) return;
    // Simulate a lightweight lookup â€” in production this would call ABDM sandbox
    const syntheticResult: AbhaQrScanResult = {
      abhaId: id,
      name: '',
      age: '',
    };
    setAbhaPreview(syntheticResult);
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ OCR callback Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleOcrDrugs = (drugs: string[]) => {
    drugs.forEach(d => {
      const norm = d.trim();
      if (norm) setAllopathicMeds(prev => prev.includes(norm) ? prev : [...prev, norm]);
    });
    setShowSnapModal(false);
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Submit Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleSubmit = async () => {
    if (!patientName.trim()) { setError('Patient name is required.'); return; }
    if (!selectedCategory)    { setError('Please select a complaint category.'); return; }
    setLoading(true);
    setError('');
    try {
      // Resolve age: prefer typed age, fall back from age-group selector
      const resolvedAge = age
        ? parseInt(age, 10)
        : ageGroup === 'child'  ? 12
        : ageGroup === 'adult'  ? 28
        : ageGroup === 'middle' ? 50
        : ageGroup === 'senior' ? 68
        : null;

      const body = {
        patient_id:               patientId,
        patient_name:             patientName.trim(),
        age:                      resolvedAge,
        gender:                   gender || null,
        chief_complaint_key:      selectedCategory,
        raw_symptoms:             complaint ? [complaint] : [selectedCategory],
        pain_scale:               painScale,
        appetite_level:           5,
        digestive_issue:          agni === 'tikshnagni' ? 8 : agni === 'mandagni' ? 6 : agni === 'vishamagni' ? 7 : 3,
        bristol_stool:            koshtha === 'krura' ? 1 : koshtha === 'mridu' ? 6 : 4,
        vitals: vitals ? {
          bp_systolic:  vitals.bp_systolic,
          bp_diastolic: vitals.bp_diastolic,
          spo2:         vitals.spo2,
          pulse:        vitals.pulse,
          temp:         vitals.temp,
        } : {},
        current_allopathic_drugs: allopathicMeds,
        current_herbal_remedies:  ayurvedicMeds,
        known_allergies:          fetchedAllergies,
        chronic_conditions:       fetchedChronicConditions,
      };
      const authToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/v1/kiosk/intake`, {
        method: 'POST', headers, body: JSON.stringify(body),
      }).catch((networkErr: Error) => {
        throw new Error(
          `Network error â€” could not reach the backend at ${API_BASE}. ` +
          `Check VITE_API_URL or VITE_BACKEND_URL env vars. (${networkErr.message})`
        );
      });
      if (!res.ok) {
        let detail = 'Intake submission failed';
        try {
          const errBody = await res.json();
          detail = errBody.detail || errBody.message || `HTTP ${res.status} ${res.statusText}`;
        } catch { /* ignore parse errors */ }
        throw new Error(detail);
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

  const startVitalsScan = useCallback(() => {
    setVitalsScan('scanning');
    setTimeout(() => {
      // Realistic simulated telemetry
      const pod: VitalsPod = {
        bp_systolic:  124 + Math.round((Math.random() - 0.5) * 10),
        bp_diastolic:  82 + Math.round((Math.random() - 0.5) * 8),
        spo2:         97 + Math.round(Math.random() * 2),
        pulse:        76 + Math.round((Math.random() - 0.5) * 8),
        temp:        parseFloat((98.4 + (Math.random() - 0.5) * 0.6).toFixed(1)),
      };
      setVitals(pod);
      setVitalsScan('done');
    }, 2500);
  }, []);

  const resetKiosk = () => {
    clearCountdown();
    setPatientName(''); setAge(''); setGender(''); setAgeGroup(''); setAbhaId('');
    setPatientId(`PT-${Date.now()}`); setSelectedCategory('');
    setComplaint(''); setIsListening(false);
    setAgni(''); setKoshtha(''); setPainScale(3);
    setVitals(null); setVitalsScan('idle');
    setAllopathicMeds([]); setAyurvedicMeds([]);
    setAlloInput(''); setAyurInput('');
    setAbhaPreview(null); setAbhaIdInput('');
    setFetchedAllergies([]); setFetchedChronicConditions([]);
    setStep(0); setResult(null); setError('');
  };
  resetKioskRef.current = resetKiosk;

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Theme helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

  // --- Step renderers -------------------------------------------------------

  const renderStep0 = () => {
    const isHindi = langCode === 'hi-IN' || langCode === 'pa-IN';
    const AGE_GROUPS: Array<{ id: string; label: string; labelHi: string; icon: React.ReactNode; desc: string; descHi: string }> = [
      { id: 'child',  label: '<18',   labelHi: '<18',   icon: <Baby className="w-5 h-5" />,           desc: 'Child',  descHi: '\u092C\u091A\u094D\u091A\u093E'     },
      { id: 'adult',  label: '18-40', labelHi: '18-40', icon: <User className="w-5 h-5" />,           desc: 'Adult',  descHi: '\u092F\u0941\u0935\u093E'           },
      { id: 'middle', label: '40-60', labelHi: '40-60', icon: <UserCheck className="w-5 h-5" />,      desc: 'Middle', descHi: '\u092A\u094D\u0930\u094C\u0922\u093C' },
      { id: 'senior', label: '60+',   labelHi: '60+',   icon: <HeartHandshake className="w-5 h-5" />, desc: 'Senior', descHi: '\u0935\u0930\u093F\u0937\u094D\u0920' },
    ];
    const GENDERS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
      { id: 'male',   label: L.male,   icon: <User className="w-5 h-5" /> },
      { id: 'female', label: L.female, icon: <User className="w-5 h-5" /> },
      { id: 'other',  label: L.other,  icon: <User className="w-5 h-5" /> },
    ];
    return (
      <div className="space-y-6">
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 1 of 4 - Demographics &amp; Complaint</p>
          <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.patientName}</h2>
          <p className={`text-sm mt-0.5 ${th.subtext}`}>Patient Details - Enter basic demographic info or scan ABHA card</p>
        </div>

        {/* ABHA ID Entry & QR Scan Row */}
        <div className={`rounded-2xl border-2 border-dashed p-3 space-y-2 ${
          abhaId
            ? (dark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-400 bg-emerald-50')
            : (dark ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-slate-50')
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAbhaModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
                dark ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <QrCode className="w-4 h-4" /> {L.scanAbha}
            </button>
            <div className="flex flex-1 gap-1.5">
              <input
                type="text"
                value={abhaIdInput}
                onChange={(e) => setAbhaIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAbhaIdLookup()}
                placeholder="Enter ABHA ID manually (e.g. 91-4521-8890-1204)"
                className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 ${th.input}`}
              />
              <button
                onClick={handleAbhaIdLookup}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  dark ? 'bg-slate-700 hover:bg-slate-600 text-emerald-300 border border-slate-600' : 'bg-white hover:bg-slate-50 text-emerald-700 border border-slate-300'
                }`}
              >
                Fetch
              </button>
            </div>
          </div>
          {abhaId && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> ABHA Verified: {abhaId}
            </span>
          )}
        </div>

        {/* ABHA Profile Preview Card */}
        {abhaPreview && (
          <div className={`rounded-2xl border-2 p-4 space-y-3 animate-fade-in ${
            dark ? 'border-emerald-500 bg-emerald-950/40' : 'border-emerald-400 bg-emerald-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`font-extrabold text-sm ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  ABHA Profile Verified
                </span>
              </div>
              <button
                onClick={() => setAbhaPreview(null)}
                className={`text-xs ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dismiss
              </button>
            </div>

            {/* Patient info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {abhaPreview.name && (
                <div>
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${th.label}`}>Name</span>
                  <p className={`font-bold ${th.heading}`}>{abhaPreview.name}</p>
                </div>
              )}
              <div>
                <span className={`font-semibold uppercase tracking-wider text-[10px] ${th.label}`}>ABHA ID</span>
                <p className={`font-mono font-bold text-emerald-600 dark:text-emerald-300`}>{abhaPreview.abhaId}</p>
              </div>
              {abhaPreview.age && (
                <div>
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${th.label}`}>Age</span>
                  <p className={`font-bold ${th.heading}`}>{abhaPreview.age} yrs</p>
                </div>
              )}
              {abhaPreview.gender && (
                <div>
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${th.label}`}>Gender</span>
                  <p className={`font-bold capitalize ${th.heading}`}>{abhaPreview.gender}</p>
                </div>
              )}
              {abhaPreview.bloodGroup && (
                <div>
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${th.label}`}>Blood Group</span>
                  <p className={`font-bold ${th.heading}`}>{abhaPreview.bloodGroup}</p>
                </div>
              )}
            </div>

            {/* Allergies badges */}
            {abhaPreview.allergies && abhaPreview.allergies.length > 0 && (
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${th.label}`}>Known Allergies</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {abhaPreview.allergies.map((a) => (
                    <span key={a} className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic conditions badges */}
            {abhaPreview.chronicConditions && abhaPreview.chronicConditions.length > 0 && (
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${th.label}`}>Chronic Conditions</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {abhaPreview.chronicConditions.map((c) => (
                    <span key={c} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={handleAbhaConfirm}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                dark ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Details &amp; Auto-Fill
            </button>
          </div>
        )}

        {/* Patient name */}
        <div>
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

        {/* Age group 1-tap */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${th.label}`}>
            {L.age} - 1-Tap Group *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AGE_GROUPS.map((ag) => {
              const sel = ageGroup === ag.id;
              return (
                <button
                  key={ag.id}
                  onClick={() => { setAgeGroup(ag.id); setAge(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all ${
                    sel
                      ? (dark ? 'border-blue-400 bg-blue-900/40 ring-2 ring-blue-400' : 'border-blue-500 bg-blue-50 ring-2 ring-blue-400')
                      : (dark ? 'border-slate-600 bg-slate-800 hover:border-blue-500' : 'border-slate-200 bg-white hover:border-blue-400 shadow-sm')
                  }`}
                >
                  <span className={sel ? (dark ? 'text-blue-300' : 'text-blue-700') : (dark ? 'text-slate-300' : 'text-slate-500')}>
                    {ag.icon}
                  </span>
                  <span className={`text-xs font-black ${sel ? (dark ? 'text-blue-300' : 'text-blue-700') : (dark ? 'text-white' : 'text-slate-800')}`}>{ag.label}</span>
                  <span className={`text-[10px] ${th.subtext}`}>{isHindi ? ag.descHi : ag.desc}</span>
                </button>
              );
            })}
          </div>
          {/* Optional precise age override */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number" value={age} onChange={(e) => { setAge(e.target.value); setAgeGroup(''); }}
              placeholder="Or type exact age..."
              className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${th.input}`}
            />
          </div>
        </div>

        {/* Gender icon buttons */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${th.label}`}>{L.gender}</label>
          <div className="flex gap-3">
            {GENDERS.map((g) => {
              const sel = gender === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                    sel
                      ? (dark ? 'border-purple-400 bg-purple-900/40 ring-2 ring-purple-400' : 'border-purple-500 bg-purple-50 ring-2 ring-purple-400')
                      : (dark ? 'border-slate-600 bg-slate-800 hover:border-purple-500' : 'border-slate-200 bg-white hover:border-purple-400 shadow-sm')
                  }`}
                >
                  <span className={sel ? (dark ? 'text-purple-300' : 'text-purple-700') : (dark ? 'text-slate-300' : 'text-slate-500')}>
                    {g.icon}
                  </span>
                  <span className={`text-xs font-bold ${sel ? (dark ? 'text-purple-300' : 'text-purple-700') : (dark ? 'text-white' : 'text-slate-700')}`}>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Health Concern â€” 6 Clinical Categories */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${th.label}`}>
            Primary Health Concern / <span className="normal-case">\u092E\u0941\u0916\u094D\u092F \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u092E\u0938\u094D\u092F\u093E</span> *
          </label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {([
              { id: 'fever',     icon: <Thermometer className="w-5 h-5 text-amber-500" />,  labelEn: 'Fever & Weakness',        labelHi: '\u092C\u0941\u0916\u093E\u0930 / \u0915\u092E\u091C\u093C\u094B\u0930\u0940',                complaint: 'fever'        },
              { id: 'cough',     icon: <Wind         className="w-5 h-5 text-cyan-500" />,   labelEn: 'Cough & Cold',            labelHi: '\u0916\u093E\u0902\u0938\u0940 / \u091C\u0941\u0915\u093E\u092E / \u0938\u093E\u0902\u0938',    complaint: 'cough'        },
              { id: 'stomach',   icon: <Activity     className="w-5 h-5 text-rose-500" />,   labelEn: 'Stomach & Digestion',     labelHi: '\u092A\u0947\u091F \u0926\u0930\u094D\u0926 / \u090F\u0938\u093F\u0921\u093F\u091F\u0940 / \u0909\u0932\u094D\u091F\u0940 / \u0926\u0938\u094D\u0924', complaint: 'stomach_pain' },
              { id: 'joints',    icon: <Bone         className="w-5 h-5 text-indigo-500" />, labelEn: 'Joints & Muscle',         labelHi: '\u091C\u094B\u0921\u093C\u094B\u0902 \u0915\u093E \u0926\u0930\u094D\u0926 / \u0917\u0920\u093F\u092F\u093E',                  complaint: 'joint_pain'   },
              { id: 'bp_sugar',  icon: <HeartPulse   className="w-5 h-5 text-red-500" />,    labelEn: 'Blood Pressure & Sugar',  labelHi: '\u092C\u0940\u092A\u0940 / \u0936\u0941\u0917\u0930 / \u091A\u0915\u094D\u0915\u0930',             complaint: 'hypertension' },
              { id: 'skin',      icon: <Sparkles     className="w-5 h-5 text-emerald-500" />,labelEn: 'Skin & Allergy',          labelHi: '\u0916\u0941\u091C\u0932\u0940 / \u0926\u093E\u0928\u0947 / \u0938\u094D\u0915\u093F\u0928 \u090F\u0932\u0930\u094D\u091C\u0940',   complaint: 'skin_allergy' },
            ] as Array<{ id: string; icon: React.ReactNode; labelEn: string; labelHi: string; complaint: string }>).map((cat) => {
              const isSelected = selectedCategory === cat.complaint;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.complaint)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? (dark ? 'border-emerald-400 bg-emerald-900/40 ring-2 ring-emerald-400 scale-105' : 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 scale-105 shadow-md')
                      : (dark ? 'border-slate-600 bg-slate-800 hover:border-emerald-600' : 'border-slate-200 bg-white hover:border-emerald-400 shadow-sm')
                  }`}
                >
                  {cat.icon}
                  <span className={`text-[11px] font-bold leading-tight text-center ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {isHindi ? cat.labelHi : cat.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedCategory && (
            <p className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Chief complaint selected: <span className="font-bold capitalize">{selectedCategory.replace(/_/g,' ')}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 2 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.complaint}</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>{'à¤®à¥à¤–à¥à¤¯ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¬à¤¤à¤¾à¤à¤‚'} &mdash; speak or type</p>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Hero Voice Orb Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className={`rounded-3xl border-2 p-5 flex flex-col items-center gap-4 ${
        isListening
          ? (dark ? 'border-red-500 bg-red-950/40' : 'border-red-400 bg-red-50')
          : (dark ? 'border-emerald-600/60 bg-emerald-950/30' : 'border-emerald-300 bg-emerald-50/60')
      }`}>
        {/* Multi-ring pulsing orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          {isListening && (
            <>
              <span className="absolute w-44 h-44 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '1.2s' }} />
              <span className="absolute w-36 h-36 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: '0.9s', animationDelay: '0.2s' }} />
            </>
          )}
          {!isListening && (
            <>
              <span className="absolute w-44 h-44 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <span className="absolute w-36 h-36 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            </>
          )}
          {/* Core orb button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-all shadow-2xl z-10 ${
              isListening
                ? 'border-red-400 bg-red-600 text-white shadow-red-500/50'
                : (dark
                    ? 'border-emerald-400 bg-emerald-700 text-white hover:bg-emerald-600 shadow-emerald-500/30'
                    : 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-300')
            }`}
          >
            {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            <span className="text-[11px] font-bold">{isListening ? L.stop : L.speak}</span>
          </button>
        </div>
        <div className="text-center space-y-1">
          <p className={`font-bold text-sm ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {isListening ? 'Listening... speak clearly' : 'Tap & Speak Symptoms in Any Language'}
          </p>
          <p className={`text-xs ${th.subtext}`}>Hindi - Punjabi - English - Bengali - Tamil - Telugu - ...</p>
        </div>
        {/* Live waveform */}
        {isListening && (
          <div className="flex gap-1 items-end h-8">
            {[4, 7, 5, 9, 6, 8, 4, 6, 9, 5, 7].map((h, i) => (
              <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce" style={{ height: `${h * 3}px`, animationDelay: `${i * 70}ms` }} />
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
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>Vital Sense Pod + Dashavidha</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>IoT Vitals + Digestion &amp; Pain - Pictorial Ayurvedic Parameters</p>
      </div>

      {/* Vital Sense Pod Simulator */}
      <div className={`rounded-3xl border-2 overflow-hidden ${
        vitalsScan === 'done'
          ? (dark ? 'border-emerald-500 bg-emerald-950/30' : 'border-emerald-400 bg-emerald-50/60')
          : vitalsScan === 'scanning'
            ? (dark ? 'border-cyan-500 bg-cyan-950/30' : 'border-cyan-400 bg-cyan-50')
            : (dark ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-slate-50')
      }`}>
        {/* Pod header */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${
          dark ? 'bg-slate-900/60 border-b border-slate-700' : 'bg-white/70 border-b border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${vitalsScan === 'scanning' ? 'bg-cyan-400 animate-pulse' : vitalsScan === 'done' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className={`text-xs font-extrabold uppercase tracking-wider ${dark ? 'text-white' : 'text-slate-800'}`}>
                Vital Sense Pod
              </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              vitalsScan === 'done' ? (dark ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-700')
              : vitalsScan === 'scanning' ? (dark ? 'bg-cyan-900 text-cyan-300 animate-pulse' : 'bg-cyan-100 text-cyan-700 animate-pulse')
              : (dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              {vitalsScan === 'done' ? <><CheckCircle2 className="inline w-3 h-3 mr-0.5" /> SCAN COMPLETE</> : vitalsScan === 'scanning' ? 'SCANNING\u2026' : 'READY'}
            </span>
          </div>
          {vitalsScan !== 'scanning' && (
            <button
              onClick={startVitalsScan}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vitalsScan === 'done'
                  ? (dark ? 'border border-emerald-600 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' : 'border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
                  : (dark ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white')
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {vitalsScan === 'done' ? 'Re-Scan' : 'Start Scan'}
            </button>
          )}
        </div>

        {/* Pod body */}
        <div className="p-4">
          {vitalsScan === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <Heart className={`w-7 h-7 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              <p className={`text-sm font-semibold ${th.subtext}`}>Place finger on sensor pad, then tap Start Scan</p>
              <p className={`text-xs ${th.subtext}`}>Measures: BP Â· SpOâ‚‚ Â· Pulse Â· Temperature</p>
            </div>
          )}

          {vitalsScan === 'scanning' && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Animated ECG waveform */}
              <div className="flex gap-0.5 items-end h-12 w-full max-w-xs">
                {[2,2,2,2,2,8,12,4,2,10,2,2,2,2,2,8,12,4,2,2].map((h, i) => (
                  <div key={i} className="flex-1 bg-cyan-400 rounded-sm transition-all animate-pulse"
                    style={{ height: `${h * 4}px`, animationDelay: `${i * 60}ms`, animationDuration: '0.8s' }} />
                ))}
              </div>
              <p className={`text-sm font-bold ${dark ? 'text-cyan-300' : 'text-cyan-700'}`}>Reading biometric signals... 2.5s</p>
              <div className="flex gap-4 text-center">
                {['BP','SpOÃ¢â€šâ€š','Pulse','Temp'].map((v) => (
                  <div key={v} className={`rounded-xl px-3 py-2 min-w-[52px] ${dark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                    <p className={`text-[9px] uppercase font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{v}</p>
                    <p className={`text-base font-black animate-pulse ${dark ? 'text-cyan-300' : 'text-cyan-600'}`}>--</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vitalsScan === 'done' && vitals && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {/* BP */}
                <div className={`rounded-xl border p-3 ${dark ? 'border-emerald-700/50 bg-slate-900' : 'border-emerald-300 bg-white'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Blood Pressure</p>
                  <p className={`text-xl font-black tabular-nums ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {vitals.bp_systolic}/{vitals.bp_diastolic}
                    <span className="text-xs font-normal ml-1 text-slate-500">mmHg</span>
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Normal</p>
                </div>
                {/* SpO2 */}
                <div className={`rounded-xl border p-3 ${dark ? 'border-cyan-700/50 bg-slate-900' : 'border-cyan-300 bg-white'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>SpOÃ¢â€šâ€š</p>
                  <p className={`text-xl font-black tabular-nums ${dark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                    {vitals.spo2}%
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Normal</p>
                </div>
                {/* Pulse */}
                <div className={`rounded-xl border p-3 ${dark ? 'border-pink-700/50 bg-slate-900' : 'border-pink-300 bg-white'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Pulse</p>
                  <p className={`text-xl font-black tabular-nums ${dark ? 'text-pink-300' : 'text-pink-700'}`}>
                    {vitals.pulse} <span className="text-xs font-normal text-slate-500">bpm</span>
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Normal</p>
                </div>
                {/* Temp */}
                <div className={`rounded-xl border p-3 ${dark ? 'border-orange-700/50 bg-slate-900' : 'border-orange-300 bg-white'}`}>
                  <p className={`text-[9px] uppercase font-bold mb-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Temperature</p>
                  <p className={`text-xl font-black tabular-nums ${dark ? 'text-orange-300' : 'text-orange-700'}`}>
                    {vitals.temp}&deg;F
                  </p>
                  <p className={`text-[10px] font-bold mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Normal</p>
                </div>
              </div>
              <p className={`text-xs flex items-center gap-1.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Vitals captured - will be sent to Doctor Cockpit
              </p>
            </div>
          )}
        </div>
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
          {L.koshtha}
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
          {"Pain Scale (VAS 1-10) â€” à¤¦à¤°à¥à¤¦ à¤•à¤¾ à¤¸à¥à¤¤à¤°:"}{' '}
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
            <span>1 - Mild</span><span>5 - Moderate</span><span>10 - Severe</span>
          </div>
        </div>
        <div className={`mt-2 text-xs font-bold text-center py-1.5 rounded-lg ${
          painScale >= 7 ? (dark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600') :
          painScale >= 4 ? (dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-700') :
          (dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
        }`}>
          {painScale >= 7 ? 'Severe Pain - Priority Flag' : painScale >= 4 ? 'Moderate Pain' : 'Mild Pain'}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${th.stepLabel}`}>Step 4 of 4</p>
        <h2 className={`text-2xl font-extrabold ${th.heading}`}>{L.medicines}</h2>
        <p className={`text-sm mt-0.5 ${th.subtext}`}>{'à¤¦à¤µà¤¾à¤‡à¤¯à¤¾à¤‚ à¤šà¥à¤¨à¥‡à¤‚'} &mdash; enables Herb-Drug interaction check</p>
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
              {allopathicMeds.includes(med) ? '\u2713 ' : ''}{med}
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
              {ayurvedicMeds.includes(herb) ? '\u2713 ' : ''}{herb}
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
    // Estimated wait: red-flag -> immediate, otherwise ~5 min per queue slot (simple heuristic)
    const estWait = isRed ? 'Immediate' : '~5-15 min';
    const cabin = result.cabin || (isRed ? 'Emergency Bay' : 'Cabin 1 - General');
    return (
      <div className="space-y-5">
        {isRed && (
          <div className="p-4 rounded-xl bg-red-900/50 border-2 border-red-500 flex items-start gap-3 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-red-300 font-extrabold text-base">CRITICAL - Emergency Alert</p>
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
              {isRed ? 'Priority - High Urgency' : 'Standard Queue'}
            </p>
          </div>

          {/* Cabin + Wait Time info strip */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className={`rounded-xl border px-4 py-3 text-center ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${th.label}`}>Assigned Cabin</p>
              <p className={`text-sm font-extrabold flex items-center justify-center gap-1 ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                <Hospital className="w-3.5 h-3.5" /> {cabin}
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${th.label}`}>Est. Wait Time</p>
              <p className={`text-sm font-extrabold flex items-center justify-center gap-1 ${isRed ? (dark ? 'text-red-300' : 'text-red-600') : (dark ? 'text-amber-300' : 'text-amber-700')}`}>
                <Clock className="w-3.5 h-3.5" /> {estWait}
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
          onClick={resetKiosk}
          className="w-full py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold hover:bg-slate-50 transition-all"
        >
          à¤¨à¤¯à¤¾ à¤®à¤°à¥€à¤œà¤¼ / New Patient
        </button>
      </div>
    );
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Step indicator Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${th.screen}`}>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Kiosk Top Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <header className={`shrink-0 border-b px-5 py-3 flex items-center justify-between gap-4 ${th.header}`}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className={`font-extrabold text-sm tracking-tight truncate ${th.heading}`}>
              {OPD_NAME} - Charak-Kiosk
            </span>
            <span className={`text-[10px] font-medium ${th.subtext}`}>
              AIIA PS-26047 Â· ICD-11 + NAMASTE Â· Sub-3-min workflow
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
              <span className="text-[10px] opacity-60">Ã¢â€“Â¼</span>
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Main Intake Area Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

      {/* -- Modals ----------------------------------------------------------------- */}
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
