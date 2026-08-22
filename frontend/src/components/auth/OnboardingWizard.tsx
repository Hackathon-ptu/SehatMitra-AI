import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { AlertCircle, Loader2, X, Plus, User, Heart, ShieldAlert, MapPin, Phone } from 'lucide-react';
import { Button } from '../common/Button';

interface OnboardingWizardProps {
  onClose?: () => void;
  isEditMode?: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose, isEditMode = false }) => {
  const { user, refreshUser } = useAuth();
  
  // Step state
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [villageTown, setVillageTown] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [emergencyName, setEmergencyName] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  
  // Tag fields
  const [chronicInput, setChronicInput] = useState('');
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);

  // Pre-populate if editing or if user already has some fields filled
  useEffect(() => {
    if (user) {
      setAge(user.age ? String(user.age) : '');
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
  }, [user]);

  // Add tag helpers
  const handleAddChronic = () => {
    const trimmed = chronicInput.trim().toLowerCase();
    if (trimmed && !chronicConditions.includes(trimmed)) {
      setChronicConditions([...chronicConditions, trimmed]);
    }
    setChronicInput('');
  };

  const handleRemoveChronic = (index: number) => {
    setChronicConditions(chronicConditions.filter((_, i) => i !== index));
  };

  const handleAddAllergy = () => {
    const trimmed = allergyInput.trim().toLowerCase();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
    }
    setAllergyInput('');
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      setErrorMsg('Please enter a valid age between 1 and 120.');
      setStep(1);
      return;
    }
    
    if (pincode && !/^\d{6}$/.test(pincode)) {
      setErrorMsg('Pincode must be exactly 6 digits.');
      setStep(2);
      return;
    }

    if (emergencyPhone && !/^[6-9]\d{9}$/.test(emergencyPhone)) {
      setErrorMsg('Emergency contact phone number must be a valid 10-digit Indian number.');
      setStep(2);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await authService.updateProfile({
        age: Number(age),
        gender,
        blood_group: bloodGroup,
        village_town: villageTown,
        district,
        state,
        pincode,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        chronic_conditions: chronicConditions,
        allergies: allergies,
      });

      await refreshUser();
      setSuccessMsg('Medical profile saved successfully!');
      
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update medical profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between bg-surface-elevated">
          <div>
            <h2 className="text-xl font-bold text-content-primary">
              {isEditMode ? 'Edit Medical Profile' : 'Complete Your Medical Profile'}
            </h2>
            <p className="text-xs text-content-secondary mt-1">
              Help SehatMitra-AI provide hyper-accurate diagnostics and risk assessments.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-border text-content-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-surface-border bg-surface-card">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-colors ${
                step === s
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-content-muted hover:text-content-secondary'
              }`}
            >
              Step {s}: {s === 1 ? 'Vital Details' : s === 2 ? 'Address & Contact' : 'Comorbidities'}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          
          {step === 1 && (
            /* Step 1: Vitals */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                <User className="w-4 h-4" />
                <span>General Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Age *</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Gender *</label>
                  <select
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex justify-between">
                <div />
                <Button type="button" variant="primary" onClick={() => setStep(2)}>
                  Next Step
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            /* Step 2: Address & Emergency Contact */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Address Details</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Village / Town</label>
                  <input
                    type="text"
                    placeholder="Village or Town"
                    value={villageTown}
                    onChange={(e) => setVillageTown(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">District</label>
                  <input
                    type="text"
                    placeholder="District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">State</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Pincode</label>
                  <input
                    type="text"
                    placeholder="6-digit Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <hr className="border-surface-border my-2" />

              <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                <Phone className="w-4 h-4" />
                <span>Emergency Contact</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Contact Name</label>
                  <input
                    type="text"
                    placeholder="Emergency Contact Name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-content-secondary">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="10-digit Phone Number"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setStep(3)}>
                  Next Step
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            /* Step 3: Chronic conditions & allergies */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                <Heart className="w-4 h-4" />
                <span>Pre-existing Chronic Conditions</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-content-secondary">Add any conditions (e.g. diabetes, hypertension, asthma):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type condition and hit Add..."
                    value={chronicInput}
                    onChange={(e) => setChronicInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChronic())}
                    className="flex-1 px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddChronic}
                    className="px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {chronicConditions.map((cond, idx) => (
                    <span
                      key={cond}
                      className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
                    >
                      {cond}
                      <button type="button" onClick={() => handleRemoveChronic(idx)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {chronicConditions.length === 0 && (
                    <span className="text-xs text-content-muted">None declared.</span>
                  )}
                </div>
              </div>

              <hr className="border-surface-border my-2" />

              <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Known Allergies</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-content-secondary">Add drug, food or other allergies (e.g. penicillin, peanuts):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type allergy and hit Add..."
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                    className="flex-1 px-4 py-2 border border-surface-border bg-surface-elevated rounded-xl text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {allergies.map((alg, idx) => (
                    <span
                      key={alg}
                      className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1.5"
                    >
                      {alg}
                      <button type="button" onClick={() => handleRemoveAllergy(idx)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {allergies.length === 0 && (
                    <span className="text-xs text-content-muted">None declared.</span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" variant="primary" disabled={isLoading} className="flex items-center gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
