import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { X, Award, Check, MapPin, ShieldAlert, HeartPulse, User, Plus, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';

export const ProfileSetupModal: React.FC = () => {
  const { user, isAuthenticated, refreshUser, updateUser } = useAuth();
  
  // States
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBadgeScreen, setShowBadgeScreen] = useState(false);
  const [isOpenManual, setIsOpenManual] = useState(false);
  const [dismissed, setDismissed] = useState(sessionStorage.getItem('dismissed_profile_setup') === 'true');

  const handleSkip = () => {
    sessionStorage.setItem('dismissed_profile_setup', 'true');
    setDismissed(true);
    setIsOpenManual(false);
  };

  React.useEffect(() => {
    const handleOpen = () => {
      // Pre-fill existing data if editing
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
        setChronicConditions(user.chronic_conditions || []);
        setAllergies(user.allergies || []);
      }
      setIsOpenManual(true);
      setStep(1);
    };
    window.addEventListener('open-profile-wizard', handleOpen);
    return () => window.removeEventListener('open-profile-wizard', handleOpen);
  }, [user]);

  // Form Fields
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Medical Lists
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');

  // Auto-open logic: User is logged in, role is patient, and profile is NOT completed
  const shouldOpen = (isAuthenticated && user && user.role === 'patient' && user.is_profile_completed === false && !dismissed) || isOpenManual;

  if (!shouldOpen) return null;

  // Add Item Helpers
  const addCondition = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !chronicConditions.includes(trimmed)) {
      setChronicConditions([...chronicConditions, trimmed]);
      setNewCondition('');
    }
  };

  const addAllergy = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setNewAllergy('');
    }
  };

  const removeCondition = (index: number) => {
    setChronicConditions(chronicConditions.filter((_, i) => i !== index));
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (age === '' || !gender || !bloodGroup || !villageTown || !district || !state || !pincode || !emergencyName || !emergencyPhone) {
      setErrorMsg('Please fill all mandatory profile onboarding fields.');
      return;
    }

    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      setErrorMsg('Please enter a valid 6-digit Indian Pincode.');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(emergencyPhone)) {
      setErrorMsg('Please enter a valid 10-digit emergency contact phone number starting with 6-9.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const cleanAge = typeof age === 'number' && !isNaN(age) ? age : null;
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
        chronic_conditions: chronicConditions,
        allergies,
      });

      if (res && res.user) {
        updateUser(res.user);
      }
      sessionStorage.setItem('dismissed_profile_setup', 'true');
      setDismissed(true);

      // Show gorgeous verified success screen
      setShowBadgeScreen(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to complete profile onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    await refreshUser();
    sessionStorage.setItem('dismissed_profile_setup', 'true');
    setDismissed(true);
    setShowBadgeScreen(false);
    setIsOpenManual(false);
  };

  // Preset medical chips
  const presetConditions = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease', 'COPD'];
  const presetAllergies = ['Peanuts', 'Penicillin', 'Dust', 'Latex', 'Pollen', 'Sulfa Drugs'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
        
        {showBadgeScreen ? (
          /* Onboarding Success / Verification Badge Screen */
          <div className="p-8 text-center flex flex-col items-center justify-center gap-6 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 animate-bounce">
              <Award className="w-14 h-14 stroke-[2]" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-extrabold text-content-primary">Profile Onboarding Complete!</h3>
              <p className="text-sm text-content-secondary max-w-md">
                Your medical health record profile has been successfully verified. You have been awarded the SehatMitra-AI **"Profile Verified"** badge.
              </p>
            </div>
            
            <div className="px-4 py-2 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-full flex items-center gap-2">
              <Check className="w-4 h-4" />
              SehatMitra-AI Profile Verified
            </div>

            <Button
              onClick={handleFinish}
              variant="primary"
              className="px-8 py-2.5 font-bold"
            >
              Get Started
            </Button>
          </div>
        ) : (
          /* wizard step content */
          <div className="flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-surface-border flex items-center justify-between bg-surface-elevated">
              <div className="flex flex-col text-left">
                <h2 className="text-lg font-bold text-content-primary flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-600" />
                  Health Profile Onboarding
                </h2>
                <span className="text-xs text-content-secondary">
                  Step {step} of 3: {step === 1 ? 'Personal Details' : step === 2 ? 'Address & Emergency' : 'Medical Background'}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="p-1.5 rounded-full hover:bg-surface-border text-content-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-5 text-left">
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-content-secondary">Age *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={125}
                      placeholder="Enter age (e.g. 35)"
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-content-secondary">Gender *</label>
                    <select
                      required
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-content-secondary">Blood Group *</label>
                    <select
                      required
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none appearance-none"
                    >
                      <option value="">Select Blood Group</option>
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
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  {/* Address Section */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-content-muted flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    Residential Address
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs font-semibold text-content-secondary">Village / Town *</label>
                      <input
                        type="text"
                        required
                        placeholder="Village name or Town name"
                        value={villageTown}
                        onChange={(e) => setVillageTown(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-content-secondary">District *</label>
                      <input
                        type="text"
                        required
                        placeholder="District"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-content-secondary">State *</label>
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs font-semibold text-content-secondary">Pincode *</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="6-digit Indian pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <hr className="border-surface-border my-2" />

                  {/* Emergency Contact */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-content-muted flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-content-secondary">Contact Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Name of contact"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-content-secondary">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit Indian phone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-4">
                  {/* Chronic Conditions */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-content-secondary">Pre-existing Chronic Conditions</label>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type and add chronic condition"
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCondition(newCondition);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addCondition(newCondition)}
                        className="p-2 border border-surface-border bg-surface-elevated hover:bg-surface-border rounded-lg text-content-primary transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Pre-existing select suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {presetConditions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addCondition(item)}
                          disabled={chronicConditions.includes(item)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            chronicConditions.includes(item)
                              ? 'bg-brand-50/50 border-brand-200 text-brand-400 cursor-not-allowed'
                              : 'bg-surface-elevated hover:bg-brand-50/30 hover:border-brand-200 border-surface-border text-content-secondary'
                          }`}
                        >
                          + {item}
                        </button>
                      ))}
                    </div>

                    {/* Selected Condition chips */}
                    {chronicConditions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-2.5 bg-surface-elevated rounded-lg border border-surface-border">
                        {chronicConditions.map((cond, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 font-bold text-xs px-2.5 py-1 rounded-full"
                          >
                            {cond}
                            <button
                              type="button"
                              onClick={() => removeCondition(idx)}
                              className="text-brand-400 hover:text-brand-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-surface-border my-2" />

                  {/* Allergies */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-content-secondary">Known Allergies</label>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type and add allergy"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAllergy(newAllergy);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addAllergy(newAllergy)}
                        className="p-2 border border-surface-border bg-surface-elevated hover:bg-surface-border rounded-lg text-content-primary transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Pre-existing allergy suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {presetAllergies.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addAllergy(item)}
                          disabled={allergies.includes(item)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            allergies.includes(item)
                              ? 'bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed'
                              : 'bg-surface-elevated hover:bg-red-50/30 hover:border-red-200 border-surface-border text-content-secondary'
                          }`}
                        >
                          + {item}
                        </button>
                      ))}
                    </div>

                    {/* Selected Allergy chips */}
                    {allergies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-2.5 bg-surface-elevated rounded-lg border border-surface-border">
                        {allergies.map((all, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 font-bold text-xs px-2.5 py-1 rounded-full"
                          >
                            {all}
                            <button
                              type="button"
                              onClick={() => removeAllergy(idx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-surface-border bg-surface-elevated flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 border border-surface-border bg-surface-card hover:bg-surface-border text-content-secondary font-bold text-sm rounded-lg transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2 text-content-muted hover:text-content-primary hover:underline font-bold text-sm transition-all"
                >
                  Skip for now
                </button>
              </div>

              <div className="flex items-center gap-3">
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 1 && (!age || !gender || !bloodGroup)) {
                        setErrorMsg('Please select your age, gender, and blood group.');
                        return;
                      }
                      if (step === 2 && (!villageTown || !district || !state || !pincode || !emergencyName || !emergencyPhone)) {
                        setErrorMsg('Please complete all address and emergency contact fields.');
                        return;
                      }
                      setErrorMsg(null);
                      setStep(step + 1);
                    }}
                    variant="primary"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    variant="primary"
                    disabled={isLoading}
                    className="flex items-center gap-1.5"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Complete Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
