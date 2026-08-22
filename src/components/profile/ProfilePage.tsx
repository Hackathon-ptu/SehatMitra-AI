import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/api';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  LogOut, 
  Heart, 
  QrCode,
  Edit3,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../common/Button';

export const ProfilePage: React.FC = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const { t } = useLanguage();

  // Mode States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [password, setPassword] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit States
  const [age, setAge] = useState<number | ''>(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [bloodGroup, setBloodGroup] = useState(user?.blood_group || '');
  const [villageTown, setVillageTown] = useState(user?.village_town || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergency_contact_phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refresh user data from API on mount
  useEffect(() => {
    refreshUser();
  }, []);

  // Update states when user data is fetched/refreshed
  useEffect(() => {
    if (user) {
      setAge(user.age || '');
      setGender(user.gender || '');
      setBloodGroup(user.blood_group || '');
      setVillageTown(user.village_town || '');
      setDistrict(user.district || '');
      setState(user.state || '');
      setPincode(user.pincode || '');
      setEmergencyName(user.emergency_contact_name || '');
      setEmergencyPhone(user.emergency_contact_phone || '');
    }
  }, [user]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyError(null);
    try {
      await authService.verifyPassword(password);
      setIsUnlocked(true);
      setShowPasswordPrompt(false);
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setVerifyError(err.response?.data?.detail || 'Incorrect password. Access denied.');
    } finally {
      setIsVerifying(false);
    }
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
        village_town: villageTown,
        district,
        state,
        pincode,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
      });

      if (res && res.user) {
        updateUser(res.user);
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

      {/* ABDM Digital Health Card (ABHA-style) with gradient */}
      <div className="relative w-full max-w-md mx-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white rounded-3xl shadow-elevated overflow-hidden p-6 flex flex-col gap-5 border border-teal-800">
        
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-red-400 text-red-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">
              {t('digitalHealthCard')}
            </span>
          </div>
          <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded uppercase tracking-wider">
            ABDM Active
          </span>
        </div>

        {/* Card Body */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-teal-100">Patient Name</span>
              <span className="text-base font-bold tracking-tight truncate max-w-[200px]">
                {user?.full_name || 'Guest User'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-teal-100">{t('patientId')}</span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-200">
                {user?.patient_id || 'SM-2026-GUEST'}
              </span>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="p-2 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
            <QrCode className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Card Footer: Metadata */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/20 text-xs font-semibold text-teal-100">
          <div>
            <span>{user?.gender || 'N/A'}</span>
            <span className="mx-2">•</span>
            <span>{user?.age || 'N/A'} Yrs</span>
          </div>

          <span className="bg-emerald-500 text-white font-extrabold uppercase px-3 py-1 rounded-full text-[10px] tracking-wider shadow-sm border border-emerald-400">
            {t('bloodGroup')}: {user?.blood_group || 'N/A'}
          </span>
        </div>

        {/* Verified Badge decoration */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-10">
          <ShieldCheck className="w-32 h-32 text-white" />
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
              onClick={() => setShowPasswordPrompt(true)}
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

        {/* Password Verification Dialog Overlay */}
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form 
              onSubmit={handleVerifyPassword}
              className="w-full max-w-sm bg-surface-card border border-surface-border rounded-2xl p-6 shadow-elevated flex flex-col gap-4 text-left"
            >
              <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-600 animate-pulse" />
                {t('verifyPasswordTitle')}
              </h3>
              
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-content-secondary">{t('passwordLabel')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                    className="w-full pl-3 pr-10 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {verifyError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-[11px] text-red-700 dark:text-red-300">
                  {verifyError}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPassword('');
                    setVerifyError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-border text-content-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-700 shadow-md flex items-center gap-1"
                >
                  {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t('verify')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Read-Only mode vs Unlocked Edit mode */}
        {!isUnlocked ? (
          /* READ ONLY VIEW (Dashboard) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-bg/50 p-6 rounded-2xl border border-surface-border/50 text-xs sm:text-sm">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('name')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.full_name || 'N/A'}</p>
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
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.gender || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">{t('bloodGroup')}</span>
              <p className="font-bold text-content-primary mt-1 text-sm">{user?.blood_group || 'N/A'}</p>
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
                  user.allergies.map((item, idx) => (
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
                  user.chronic_conditions.map((item, idx) => (
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
              <span className="text-[10px] uppercase font-bold tracking-wider text-content-secondary">{t('phone')} *</span>
              <input
                type="text"
                disabled
                value={user?.phone || ''}
                className="w-full px-3 py-2 border border-surface-border bg-surface-bg rounded-lg text-content-muted cursor-not-allowed font-medium"
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
