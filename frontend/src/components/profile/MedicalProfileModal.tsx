import React, { useState } from 'react';
import { 
  X, ShieldCheck, Lock, Edit3, LogOut, Copy, Check, 
  Phone, MapPin, Activity, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';

interface MedicalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicalProfileModal: React.FC<MedicalProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, login, token, logout } = useAuth();
  const [mode, setMode] = useState<'view' | 'challenge' | 'edit'>('view');
  
  // Password Challenge State
  const [challengePassword, setChallengePassword] = useState('');
  const [challengeError, setChallengeError] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);

  // Edit Form State
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || 'Other',
    blood_group: user?.blood_group || 'Unknown',
    village_town: user?.village_town || '',
    district: user?.district || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    chronic_conditions: user?.chronic_conditions || [],
    allergies: user?.allergies || [],
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const patientId = user.patient_id || `SM-2026-${String(user.id || 101).padStart(4, '0')}`;

  const copyPatientId = () => {
    navigator.clipboard.writeText(patientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChallengeError('');
    setChallengeLoading(true);

    try {
      const res = await authService.verifyPassword(challengePassword);
      if (res?.success) {
        setChallengePassword('');
        setMode('edit');
      }
    } catch (err: any) {
      setChallengeError(err.response?.data?.detail || "Incorrect password. Authorization failed.");
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveLoading(true);

    try {
      const res = await authService.updateProfile({
        ...formData,
        age: formData.age ? parseInt(String(formData.age)) : null,
      });

      const updatedUser = res?.user || { ...user, ...formData, is_profile_completed: true };
      login(token || localStorage.getItem('token') || '', updatedUser);
      setMode('view');
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update profile. Please check your inputs.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Digital Health Record</h2>
              <p className="text-xs text-slate-500">SehatMitra Verified Medical Profile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* READ-ONLY DIGITAL HEALTH CARD VIEW */}
          {mode === 'view' && (
            <>
              {/* Profile Card Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-bold">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{user.full_name || 'Patient'}</h3>
                        <ShieldCheck className="w-5 h-5 text-emerald-300"/>
                      </div>
                      <p className="text-xs text-emerald-100 opacity-90">{user.email}</p>
                      <p className="text-xs font-mono text-emerald-200 mt-0.5">@{user.username || 'user'}</p>
                    </div>
                  </div>

                  {/* Patient ID Chip */}
                  <div className="bg-black/25 backdrop-blur-md border border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold block">Health ID</span>
                      <span className="text-sm font-mono font-bold tracking-wider">{patientId}</span>
                    </div>
                    <button 
                      onClick={copyPatientId}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition text-white"
                      title="Copy Health ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-300"/> : <Copy className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Age</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.age ? `${user.age} Yrs` : 'Not set'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Gender</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.gender || 'Not set'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Blood Group</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{user.blood_group || 'Not set'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.phone || 'Not set'}</span>
                </div>
              </div>

              {/* Address Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"/>
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Residential Address</span>
                  <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {[user.village_town, user.district, user.state, user.pincode].filter(Boolean).join(', ') || 'No residential address recorded.'}
                  </p>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-4 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center font-bold">
                    <Phone className="w-5 h-5"/>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Emergency Contact</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {user.emergency_contact_name || 'Not Configured'}
                    </p>
                  </div>
                </div>
                {user.emergency_contact_phone && (
                  <a 
                    href={`tel:${user.emergency_contact_phone}`}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow hover:bg-red-700 transition"
                  >
                    Call {user.emergency_contact_phone}
                  </a>
                )}
              </div>

              {/* Edit Trigger */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setMode('challenge')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow transition"
                >
                  <Lock className="w-4 h-4 text-emerald-400"/>
                  <span>Edit Medical Profile</span>
                </button>
              </div>
            </>
          )}

          {/* PASSWORD SECURITY CHALLENGE VIEW */}
          {mode === 'challenge' && (
            <form onSubmit={handleVerifyPassword} className="py-6 px-4 space-y-5 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7"/>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Verification</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please enter your account password to verify your identity before editing medical data.
                </p>
              </div>

              {challengeError && (
                <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl">
                  {challengeError}
                </div>
              )}

              <input
                type="password"
                required
                placeholder="Enter your password"
                value={challengePassword}
                onChange={(e) => setChallengePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('view'); setChallengePassword(''); setChallengeError(''); }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={challengeLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow transition disabled:opacity-50"
                >
                  {challengeLoading ? "Verifying..." : "Verify & Unlock"}
                </button>
              </div>
            </form>
          )}

          {/* EDIT FORM VIEW */}
          {mode === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600"/>
                  Editing Patient Information
                </span>
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  Discard Changes
                </button>
              </div>

              {saveError && (
                <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Village / Town</label>
                  <input
                    type="text"
                    value={formData.village_town}
                    onChange={(e) => setFormData({ ...formData, village_town: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow transition disabled:opacity-50"
                >
                  {saveLoading ? "Saving..." : "Save Medical Records"}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* BOTTOM FIXED LOGOUT BUTTON */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold text-sm rounded-2xl border border-red-200 dark:border-red-900/40 transition shadow-sm active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4"/>
            <span>Log Out of SehatMitra</span>
          </button>
        </div>

      </div>
    </div>
  );
};
