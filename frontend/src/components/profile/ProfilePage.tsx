import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/api';
import {
  ShieldCheck,
  Lock,
  Unlock,
  LogOut,
  Heart,
  Edit3,
  Loader2,
  RefreshCw,
  MapPin,
  Phone,
} from 'lucide-react';
import { Button } from '../common/Button';

export const ProfilePage: React.FC = () => {
  const { user: ctxUser, logout, updateUser, refreshUser, loading } = useAuth();
  const { t } = useLanguage();

  // Zero-flicker fallback: if the context user hasn't hydrated yet but a cached
  // copy exists in localStorage, use it synchronously so the profile never
  // renders the "Sign in" empty state between navigation and context hydration.
  const cachedUser = React.useMemo(() => {
    if (ctxUser) return ctxUser;
    try {
      const raw = localStorage.getItem('sehat_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [ctxUser]);

  const user = cachedUser;

  // Mode States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Edit States
  const [age, setAge] = useState<number | ''>(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [bloodGroup, setBloodGroup] = useState(user?.blood_group || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [villageTown, setVillageTown] = useState(user?.village_town || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergency_contact_phone || '');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [allergiesList, setAllergiesList] = useState<string[]>(user?.allergies || []);
  const [chronicInput, setChronicInput] = useState('');
  const [chronicList, setChronicList] = useState<string[]>(user?.chronic_conditions || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refresh user data from API exactly once — after auth has settled.
  // A ref gate prevents the effect from re-firing if the parent re-renders
  // while `loading` is already false (avoids infinite refresh loops).
  const didRefresh = useRef(false);
  useEffect(() => {
    if (!loading && !didRefresh.current) {
      didRefresh.current = true;
      refreshUser();
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update states when user data is fetched/refreshed
  useEffect(() => {
    if (user) {
      setAge(user.age || '');
      setGender(user.gender || '');
      setBloodGroup(user.blood_group || '');
      setPhone(user.phone || '');
      setVillageTown(user.village_town || '');
      setDistrict(user.district || '');
      setState(user.state || '');
      setPincode(user.pincode || '');
      setEmergencyName(user.emergency_contact_name || '');
      setEmergencyPhone(user.emergency_contact_phone || '');
      setAllergiesList(user.allergies || []);
      setChronicList(user.chronic_conditions || []);
    }
  }, [user]);

  const addTag = (input: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const tags = input.split(',').map(t => t.trim()).filter(t => t && !list.includes(t));
    if (tags.length) setList([...list, ...tags]);
    setInput('');
  };

  const removeTag = (tag: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(t => t !== tag));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const cleanAge = age === '' || isNaN(Number(age)) ? null : Number(age);
      const res = await authService.updateProfile({
        age: cleanAge,
        gender,
        blood_group: bloodGroup,
        phone_number: phone || undefined,
        village_town: villageTown,
        district,
        state,
        pincode,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        allergies: allergiesList,
        chronic_conditions: chronicList,
      });

      if (res && res.user) {
        // Immediately update AuthContext so ABHA card and table reflect new values
        updateUser(res.user);
        // Also persist to localStorage so Navbar / App.tsx pick up the update
        localStorage.setItem('user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('auth_state_changed'));
        window.dispatchEvent(new Event('storage'));
        // Re-fetch from backend to confirm persistence (gender, blood_group)
        await refreshUser();
      }
      setIsUnlocked(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derive safe display values — NEVER fall back to "Guest User"
  const displayName = user?.full_name
    || (user?.email ? user.email.split('@')[0] : null)
    || 'Verified Patient';
  const abhaId = user?.abha_id || user?.patient_id
    || (user?.id ? `SM-2026-${String(user.id).padStart(4, '0')}` : `SM-2026-${user?.email ? user.email.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() : 'USER'}`);

  // Comprehensive clinical QR payload — auto-fills Charak-Kiosk on scan
  const qrPayload = JSON.stringify({
    abha_id: abhaId,
    name: displayName,
    gender: user?.gender || '',
    age: user?.age || '',
    blood_group: user?.blood_group || '',
    chronic_conditions: user?.chronic_conditions || [],
    allergies: user?.allergies || [],
    current_medications: [],
  });

  // While auth state is being resolved, show a skeleton — never render "Guest" state
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 text-left animate-fade-in">
        <div className="flex flex-col gap-1">
          <div className="h-7 w-48 rounded-lg bg-surface-elevated animate-pulse" />
          <div className="h-4 w-80 rounded-md bg-surface-elevated animate-pulse mt-1" />
        </div>
        <div className="w-full max-w-md mx-auto h-48 rounded-3xl bg-surface-elevated animate-pulse" />
        <div className="h-64 rounded-3xl bg-surface-elevated animate-pulse" />
      </div>
    );
  }

  // Auth resolved AND no cached user anywhere — prompt login
  if (!user && !localStorage.getItem('token') && !localStorage.getItem('access_token')) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>
        <h3 className="text-lg font-bold text-content-primary">Sign in to view your profile</h3>
        <p className="text-sm text-content-muted">Your ABHA digital health card and medical records will appear here after login.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 text-left animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
          {t('profileTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-content-muted">
          Manage your ABHA digital health record card, secure your password, and verify patient metadata.
        </p>
      </div>

      {/* 3D Flippable ABHA Health Card */}
      <div className="w-full max-w-md mx-auto">
        {/* Flip toggle button */}
        <div className="flex justify-center mb-3">
          <button
            onClick={() => setIsFlipped(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Flip Card (Front / Back)
          </button>
        </div>

        {/* 3D card container */}
        <div style={{ perspective: '1000px' }}>
          <div
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s ease',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              position: 'relative',
              height: '220px',
            }}
          >
            {/* ── FRONT FACE ── */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white rounded-3xl shadow-elevated overflow-hidden p-5 flex flex-col gap-4 border border-teal-800"
            >
              {/* Tricolor accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className="flex-1 bg-orange-500" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-green-500" />
              </div>
              {/* Card Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-red-400 text-red-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                    ABDM Digital Health Card
                  </span>
                </div>
                <span className="text-[9px] font-bold bg-emerald-500/60 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-400/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> ABDM Verified
                </span>
              </div>
              {/* Card Body */}
              <div className="flex justify-between items-start gap-4 flex-1">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-teal-200">Patient Name</span>
                    <p className="text-sm font-extrabold truncate">{displayName}</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-teal-200">ABHA Number</span>
                    <p className="text-[11px] font-mono font-bold text-emerald-200 tracking-wider truncate">{abhaId}</p>
                  </div>
                  <div className="flex gap-3 text-[10px] font-semibold text-teal-100">
                    <span>{user?.gender || 'Not Set'}</span>
                    <span>•</span>
                    <span>{user?.age ? `${user.age} Yrs` : 'Age N/A'}</span>
                  </div>
                  <span className="inline-flex self-start bg-emerald-500 text-white font-extrabold uppercase px-2 py-0.5 rounded-full text-[9px] tracking-wider border border-emerald-400">
                    Blood: {user?.blood_group || 'Not Set'}
                  </span>
                </div>
                {/* QR code on front — compact */}
                <div className="p-1.5 bg-white rounded-xl shrink-0 border border-white/30 shadow-sm">
                  <QRCodeSVG value={qrPayload} size={62} bgColor="#ffffff" fgColor="#064e3b" level="M" />
                </div>
              </div>
              {/* Watermark */}
              <div className="absolute bottom-2 right-3 opacity-10">
                <ShieldCheck className="w-24 h-24 text-white" />
              </div>
            </div>

            {/* ── BACK FACE ── */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white rounded-3xl shadow-elevated overflow-hidden p-5 flex flex-col gap-3 border border-slate-700"
            >
              {/* Back header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Patient QR — Scan at Kiosk
                </span>
                <span className="text-[9px] font-mono text-slate-500">{abhaId}</span>
              </div>
              {/* Back body: info + large QR */}
              <div className="flex gap-4 flex-1 items-center">
                {/* Large QR */}
                <div className="p-2 bg-white rounded-2xl shrink-0 shadow-lg">
                  <QRCodeSVG value={qrPayload} size={110} bgColor="#ffffff" fgColor="#1e293b" level="H" />
                </div>
                {/* Info block */}
                <div className="flex flex-col gap-1.5 text-xs min-w-0 flex-1">
                  {user?.state && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                      <span className="truncate">{[user.district, user.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {user?.emergency_contact_name && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{user.emergency_contact_name} · {user.emergency_contact_phone || 'N/A'}</span>
                    </div>
                  )}
                  <div className="mt-1 text-[9px] text-slate-500 leading-tight">
                    Scan this QR at any Charak-Kiosk to auto-fill patient demographics, blood group, chronic conditions & current medications.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Personal & Medical Info */}
      <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-elevated flex flex-col gap-6">
        
        {/* Toggle Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
            {isUnlocked ? <Unlock className="w-4 h-4 text-emerald-500 animate-bounce" /> : <Lock className="w-4 h-4 text-brand-600" />}
            <span>{isUnlocked ? 'Form Edit Mode Enabled' : 'Secured Medical Records Card'}</span>
          </div>

          {isUnlocked ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUnlocked(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-border text-content-secondary transition-colors"
              >
                {t('cancel')}
              </button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                variant="primary"
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button
                onClick={() => setIsUnlocked(true)}
                variant="outline"
                className="flex items-center gap-1.5 text-xs font-bold"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                {t('edit')}
              </Button>
          )}
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold">
            Profile changes saved successfully!
          </div>
        )}

        {/* Read-Only mode vs Unlocked Edit mode */}
        {!isUnlocked ? (
          /* READ ONLY VIEW (Dashboard) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-bg/50 p-6 rounded-2xl border border-surface-border/50 text-xs sm:text-sm">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('name')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{displayName}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('email')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('age')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.age || 'N/A'} Yrs</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('gender')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.gender || 'Not Set'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('bloodGroup')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.blood_group || 'Not Set'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('phone')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.phone || 'N/A'}</p>
            </div>
            
            <div className="col-span-1 md:col-span-2 border-t border-surface-border/40 my-1"></div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Village / Town</span>
              <p className="font-semibold text-content-secondary mt-1 text-sm">{user?.village_town || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">District</span>
              <p className="font-semibold text-content-secondary mt-1 text-sm">{user?.district || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">State</span>
              <p className="font-semibold text-content-secondary mt-1 text-sm">{user?.state || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Pincode</span>
              <p className="font-semibold text-content-secondary mt-1 text-sm">{user?.pincode || 'N/A'}</p>
            </div>

            <div className="col-span-1 md:col-span-2 border-t border-surface-border/40 my-1"></div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('emergencyContactName')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.emergency_contact_name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('emergencyContactPhone')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.emergency_contact_phone || 'N/A'}</p>
            </div>

            <div className="col-span-1 md:col-span-2 border-t border-surface-border/40 my-1"></div>

            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('allergies')}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {user?.allergies && user.allergies.length > 0 ? (
                  (user.allergies as string[]).map((item: string, idx: number) => (
                    <span key={idx} className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs px-2.5 py-1 rounded-lg border border-red-150">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-content-muted italic">None reported</span>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('chronicConditions')}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {user?.chronic_conditions && user.chronic_conditions.length > 0 ? (
                  (user.chronic_conditions as string[]).map((item: string, idx: number) => (
                    <span key={idx} className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-lg border border-blue-150">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-content-muted italic">None reported</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('name')}</span>
              <input
                type="text"
                disabled
                value={user?.full_name || ''}
                className="w-full px-3 py-2 border border-surface-border bg-surface-bg rounded-lg text-content-muted cursor-not-allowed font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('email')}</span>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 border border-surface-border bg-surface-bg rounded-lg text-content-muted cursor-not-allowed font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('age')} *</span>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('gender')} *</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none appearance-none"
              >
                <option value="">— Select Gender —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('bloodGroup')} *</span>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none appearance-none"
              >
                <option value="">— Select Blood Group —</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('phone')} (+91)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))}
                placeholder="+91XXXXXXXXXX"
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">Village / Town *</span>
              <input
                type="text"
                value={villageTown}
                onChange={(e) => setVillageTown(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">District *</span>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">State *</span>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">Pincode *</span>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('emergencyContactName')} *</span>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('emergencyContactPhone')} *</span>
              <input
                type="text"
                maxLength={10}
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none"
              />
            </div>

            {/* Allergies tag editor */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('allergies')}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={allergiesInput}
                  onChange={(e) => setAllergiesInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(allergiesInput, allergiesList, setAllergiesList, setAllergiesInput); } }}
                  placeholder="e.g. Penicillin, Sulfa, Dust (comma-separated)"
                  className="flex-1 px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => addTag(allergiesInput, allergiesList, setAllergiesList, setAllergiesInput)}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >Add</button>
              </div>
              {allergiesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allergiesList.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs px-2.5 py-1 rounded-lg border border-red-200">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag, allergiesList, setAllergiesList)} className="ml-0.5 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Chronic conditions tag editor */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('chronicConditions')}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chronicInput}
                  onChange={(e) => setChronicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(chronicInput, chronicList, setChronicList, setChronicInput); } }}
                  placeholder="e.g. Type-2 Diabetes, Hypertension (comma-separated)"
                  className="flex-1 px-3 py-2 border border-brand-600 bg-surface-elevated text-content-primary focus:border-brand-700 rounded-lg focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => addTag(chronicInput, chronicList, setChronicList, setChronicInput)}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >Add</button>
              </div>
              {chronicList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {chronicList.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-lg border border-blue-200">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag, chronicList, setChronicList)} className="ml-0.5 hover:text-blue-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-surface-border pt-5 mt-3 flex justify-center">
          <button
            onClick={logout}
            className="px-6 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-600 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
