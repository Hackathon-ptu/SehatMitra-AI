import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  FileText,
  CheckCircle,
  Loader2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AbhaDetails {
  abha_number: string;
  abha_address: string;
  full_name: string;
  gender: string;
  dob: string;
  /** Derived from dob at parse-time; null when dob is absent/unparseable */
  derivedAge: number | null;
}

interface Props {
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a 4-digit birth year from any dob string and return
 * (2026 - birthYear).  Returns null when no year can be found.
 */
function calculateAgeFromDob(dobString: string): number | null {
  if (!dobString) return null;
  const yearMatch = dobString.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return 2026 - parseInt(yearMatch[1], 10);
  }
  return null;
}

/** Normalise single-letter NHA gender codes to full English words. */
function normaliseGender(raw: string): string {
  const map: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other' };
  const trimmed = raw.trim();
  return map[trimmed.toUpperCase()] ?? trimmed;
}

/** Format a raw 14-digit string as XX-XXXX-XXXX-XXXX */
function formatAbhaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  if (digits.length > 10) parts.push(digits.slice(10, 14));
  return parts.join('-');
}

/**
 * Attempt to decode the NHA ABHA QR payload.
 * Handles two known formats:
 *  1. JSON with keys: hidn / hid / name / gender / dob / address
 *  2. Pipe-delimited string (some older cards): "hidn|name|gender|dob"
 */
function decodeAbhaQR(raw: string): AbhaDetails | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.hidn || parsed.hid)) {
      const dob = String(parsed.dob || parsed.yearOfBirth || '');
      const gender = normaliseGender(String(parsed.gender || ''));
      return {
        abha_number: String(parsed.hidn || parsed.hid || ''),
        abha_address: String(parsed.hid || ''),
        full_name: String(parsed.name || ''),
        gender,
        dob,
        derivedAge: calculateAgeFromDob(dob),
      };
    }
  } catch {
    // not JSON — try pipe-delimited
  }
  if (raw.includes('|')) {
    const parts = raw.split('|');
    const dob = parts[4]?.trim() || '';
    const gender = normaliseGender(parts[3]?.trim() || '');
    return {
      abha_number: parts[0]?.trim() || '',
      abha_address: parts[1]?.trim() || '',
      full_name: parts[2]?.trim() || '',
      gender,
      dob,
      derivedAge: calculateAgeFromDob(dob),
    };
  }
  return null;
}

/** Sample demo ABHA details for hackathon judges */
const SAMPLE_ABHA: AbhaDetails = {
  abha_number: '14-8921-3401-9284',
  abha_address: 'rahul.sharma@abdm',
  full_name: 'Rahul Sharma',
  gender: 'Male',
  dob: '1998',
  derivedAge: calculateAgeFromDob('1998'),
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AbhaLinkModal: React.FC<Props> = ({ onClose }) => {
  const { updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');

  // QR tab state
  const [qrError, setQrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual tab state
  const [manualNumber, setManualNumber] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDob, setManualDob] = useState('');

  // Shared confirmation state
  const [preview, setPreview] = useState<AbhaDetails | null>(null);
  const [consented, setConsented] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);

  // ── QR decode via browser-native BarcodeDetector ─────────────────────────
  const handleImageFile = useCallback(async (file: File) => {
    setQrError(null);
    setPreview(null);

    const imgUrl = URL.createObjectURL(file);
    try {
      // BarcodeDetector is available in Chrome 83+ / Edge 83+
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const img = new Image();
        img.src = imgUrl;
        await new Promise<void>((resolve) => { img.onload = () => resolve(); });
        const codes = await detector.detect(img);
        if (codes.length === 0) {
          setQrError('No QR code found in this image. Please try a clearer photo.');
          return;
        }
        const details = decodeAbhaQR(codes[0].rawValue);
        if (!details) {
          setQrError('QR code detected but could not be read as a valid ABHA card. Try manual entry.');
          return;
        }
        setPreview(details);
      } else {
        // Fallback: ask user to use manual entry
        setQrError(
          'Your browser does not support QR scanning. Please use the Manual Entry tab or try Chrome/Edge.'
        );
      }
    } catch {
      setQrError('Failed to read QR code. Please try a different image or use manual entry.');
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  // ── Manual tab helpers ────────────────────────────────────────────────────
  const handleManualNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualNumber(formatAbhaNumber(e.target.value));
  };

  const handleManualPreview = () => {
    setLinkError(null);
    if (!manualNumber || manualNumber.replace(/\D/g, '').length < 14) {
      setLinkError('Please enter a valid 14-digit ABHA number.');
      return;
    }
    if (!manualAddress.includes('@')) {
      setLinkError('Please enter a valid ABHA address (e.g. name@abdm).');
      return;
    }
    const dob = manualDob.trim();
    setPreview({
      abha_number: manualNumber,
      abha_address: manualAddress.trim(),
      full_name: manualName.trim(),
      gender: '',
      dob,
      derivedAge: calculateAgeFromDob(dob),
    });
  };

  // ── Load sample card ──────────────────────────────────────────────────────
  const loadSample = () => {
    setQrError(null);
    setLinkError(null);
    setPreview(SAMPLE_ABHA);
    setConsented(false);
  };

  // ── Authorize & Link ──────────────────────────────────────────────────────
  const handleLink = async () => {
    if (!preview || !consented) return;
    setLinking(true);
    setLinkError(null);
    try {
      const res = await authService.linkAbha({
        abha_number: preview.abha_number,
        abha_address: preview.abha_address,
        full_name: preview.full_name || undefined,
        gender: preview.gender || undefined,
        age: preview.derivedAge ?? undefined,
        dob: preview.dob || undefined,
      });
      if (res?.user) {
        updateUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('sehat_user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('auth_state_changed'));
      }
      setLinked(true);
      setTimeout(onClose, 1800);
    } catch (err: any) {
      setLinkError(
        err?.response?.data?.detail || 'Failed to link ABHA. Please try again.'
      );
    } finally {
      setLinking(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div>
            <h2 className="text-base font-bold text-white">Link Existing ABHA ID</h2>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              Securely connect your ABDM digital health record
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {linked ? (
          <div className="flex flex-col items-center gap-3 py-14 px-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-500" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">ABHA Linked Successfully!</p>
            <p className="text-sm text-slate-500">Your profile now shows ABDM Verified status.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 flex flex-col gap-5">

            {/* Tabs */}
            {!preview && (
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-sm font-semibold">
                <button
                  onClick={() => { setActiveTab('qr'); setLinkError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors ${
                    activeTab === 'qr'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface-elevated dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Scan ABHA QR Card
                </button>
                <button
                  onClick={() => { setActiveTab('manual'); setLinkError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors ${
                    activeTab === 'manual'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface-elevated dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Enter Manually
                </button>
              </div>
            )}

            {/* ── QR Tab ── */}
            {activeTab === 'qr' && !preview && (
              <div className="flex flex-col gap-4">
                {/* Drop zone */}
                <label className="flex flex-col items-center gap-3 p-6 sm:p-8 border-2 border-dashed border-emerald-400 dark:border-emerald-700 rounded-2xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-center">
                  <Upload className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                      Upload ABHA Card Photo
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG or JPEG — drag & drop or click to browse
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {qrError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {qrError}
                  </div>
                )}

                {/* Sample card button */}
                <button
                  onClick={loadSample}
                  className="w-full py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors"
                >
                  🪪 Load Sample ABHA Card (Hackathon Demo)
                </button>
              </div>
            )}

            {/* ── Manual Tab ── */}
            {activeTab === 'manual' && !preview && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    14-Digit ABHA Number *
                  </label>
                  <input
                    type="text"
                    value={manualNumber}
                    onChange={handleManualNumberChange}
                    placeholder="XX-XXXX-XXXX-XXXX"
                    maxLength={17}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    ABHA Address *
                  </label>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="name@abdm"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="As on ABHA card"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Year of Birth
                    </label>
                    <input
                      type="text"
                      value={manualDob}
                      onChange={(e) => setManualDob(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="YYYY"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {linkError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {linkError}
                  </div>
                )}

                <button
                  onClick={handleManualPreview}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                >
                  Preview &amp; Confirm
                </button>

                <button
                  onClick={loadSample}
                  className="w-full py-2 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors"
                >
                  🪪 Load Sample ABHA Card (Hackathon Demo)
                </button>
              </div>
            )}

            {/* ── Confirmation / Preview ── */}
            {preview && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Preview card */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                    Extracted ABHA Details
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">ABHA Number</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">{preview.abha_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">ABHA Address</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{preview.abha_address}</p>
                    </div>
                    {preview.full_name && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Name</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{preview.full_name}</p>
                      </div>
                    )}
                    {preview.gender && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Gender</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{preview.gender}</p>
                      </div>
                    )}
                    {preview.dob && (
                      <div className="col-span-2">
                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">DOB Year</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                          {preview.dob}
                          {preview.derivedAge !== null && (
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                              (Calculated Age: {preview.derivedAge} Yrs)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consent checkbox */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    I voluntarily consent to link my verified ABHA ID with SehatMitra records.
                    I understand this is optional and can be undone at any time.
                  </span>
                </label>

                {linkError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {linkError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setPreview(null); setConsented(false); setLinkError(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLink}
                    disabled={!consented || linking}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    {linking && <Loader2 className="w-4 h-4 animate-spin" />}
                    Authorize &amp; Link
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default AbhaLinkModal;
