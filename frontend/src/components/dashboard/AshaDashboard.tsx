import React, { useState, useEffect } from 'react';
import { ashaService } from '../../services/api';
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  ShieldAlert, 
  TrendingUp,
  Loader2,
  Activity,
  PlusCircle,
  Stethoscope,
  Baby,
  Package,
  Radio,
  Check,
  Send,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '../common/Button';

interface SymptomTrend {
  name: string;
  count: number;
  trend: string;
}

interface EpidemicAlert {
  id: string;
  village: string;
  condition: string;
  severity: string;
  cases_reported?: number;
  recommendation: string;
  reported_at?: string;
}

interface TriageRecord {
  patient_id: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  village: string;
  primary_symptom: string;
  risk_level: string;
  bp?: string;
  spo2?: number | string;
  temperature?: number | string;
  recommendation?: string;
  created_at: string;
}

interface DashboardStats {
  total_screenings: number;
  active_villages_covered: number;
  emergency_cases_referred: number;
  risk_distribution: {
    low: number;
    moderate: number;
    high: number;
    emergency: number;
  };
  top_symptoms: SymptomTrend[];
  epidemic_alerts: EpidemicAlert[];
  recent_records: TriageRecord[];
}

interface MchMother {
  id: string;
  mother_name: string;
  age: number;
  village: string;
  gestation_weeks: number;
  trimester: string;
  hb_level: number;
  high_risk_flag: boolean;
  risk_reason: string;
  next_anc_date: string;
  ifa_given: number;
  tt_doses: number;
}

interface ImmunizationItem {
  id: string;
  child_name: string;
  parent_name: string;
  village: string;
  age_months: number;
  due_vaccine: string;
  due_date: string;
  status: string;
}

interface SupplyItem {
  item_id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minimum_required: number;
  status: string;
}

export const AshaDashboard: React.FC = () => {
  // Main Tab State
  const [activeSubTab, setActiveSubTab] = useState<'surveillance' | 'screening' | 'mch' | 'supplies' | 'outbreak'>('surveillance');

  // Surveillance Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MCH Data
  const [mchMothers, setMchMothers] = useState<MchMother[]>([]);
  const [immunizations, setImmunizations] = useState<ImmunizationItem[]>([]);
  const [isMchLoading, setIsMchLoading] = useState(false);

  // Supplies Data
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [isSuppliesLoading, setIsSuppliesLoading] = useState(false);
  const [restockModalItem, setRestockModalItem] = useState<SupplyItem | null>(null);
  const [restockQty, setRestockQty] = useState(20);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Dynamic Villages Management (persisted in localStorage)
  const DEFAULT_VILLAGES = [
    'Rampur Sector 4',
    'Gopalpur',
    'Bhimpur',
    'Sundarpur',
    'Kishan Nagar'
  ];

  const [villages, setVillages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sehatmitra_villages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved villages', e);
    }
    return DEFAULT_VILLAGES;
  });

  // Modal State for Adding New Village
  const [showAddVillageModal, setShowAddVillageModal] = useState(false);
  const [newVillageName, setNewVillageName] = useState('');
  const [newVillagePanchayat, setNewVillagePanchayat] = useState('');
  const [newVillagePopulation, setNewVillagePopulation] = useState('');
  const [addVillageTarget, setAddVillageTarget] = useState<'screening' | 'outbreak' | 'mch'>('outbreak');
  const [villageSuccessMsg, setVillageSuccessMsg] = useState<string | null>(null);

  const openAddVillageModal = (target: 'screening' | 'outbreak' | 'mch') => {
    setAddVillageTarget(target);
    setNewVillageName('');
    setNewVillagePanchayat('');
    setNewVillagePopulation('');
    setVillageSuccessMsg(null);
    setShowAddVillageModal(true);
  };

  const handleCreateVillage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newVillageName.trim();
    if (!trimmed) return;

    let updatedVillages = villages;
    if (!villages.includes(trimmed)) {
      updatedVillages = [...villages, trimmed];
      setVillages(updatedVillages);
      try {
        localStorage.setItem('sehatmitra_villages', JSON.stringify(updatedVillages));
      } catch (err) {
        console.warn('Error saving village to localStorage', err);
      }
    }

    if (addVillageTarget === 'screening') {
      setScreeningForm(prev => ({ ...prev, village: trimmed }));
    } else if (addVillageTarget === 'outbreak') {
      setOutbreakForm(prev => ({ ...prev, village: trimmed }));
    } else if (addVillageTarget === 'mch') {
      setNewMchForm(prev => ({ ...prev, village: trimmed }));
    }

    setVillageSuccessMsg(`Village "${trimmed}" added and selected!`);
    setTimeout(() => {
      setShowAddVillageModal(false);
      setVillageSuccessMsg(null);
    }, 700);
  };

  // Field Screening Form State
  const [screeningForm, setScreeningForm] = useState({
    patient_name: '',
    age: '',
    gender: 'Female',
    village: 'Rampur Sector 4',
    phone: '',
    bp_systolic: '',
    bp_diastolic: '',
    spo2: '',
    temperature_f: '',
    blood_sugar: '',
    pregnancy_status: 'No',
    selected_symptoms: [] as string[],
    additional_notes: '',
  });
  const [isSubmittingScreening, setIsSubmittingScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<any | null>(null);

  // Outbreak Reporting Form State
  const [outbreakForm, setOutbreakForm] = useState({
    village: 'Rampur Sector 4',
    condition: '',
    severity: 'High Alert',
    estimated_affected: 5,
    suspected_cause: 'Drinking Water Contamination / Borewell pipeline leak',
    recommendation: 'Immediate deployment of chlorine tablets, mobile health van & ORS camp.',
  });
  const [isSubmittingOutbreak, setIsSubmittingOutbreak] = useState(false);
  const [outbreakSuccessMsg, setOutbreakSuccessMsg] = useState<string | null>(null);

  // MCH Add Modal
  const [showAddMchModal, setShowAddMchModal] = useState(false);
  const [newMchForm, setNewMchForm] = useState({
    mother_name: '',
    age: 24,
    village: 'Rampur Sector 4',
    gestation_weeks: 16,
    hb_level: 10.2,
    high_risk_flag: false,
    risk_reason: '',
    next_anc_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [isSubmittingMch, setIsSubmittingMch] = useState(false);

  // Initial Fetch for Stats
  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ashaService.getCommunityStats();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch epidemiological surveillance metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch MCH data
  const fetchMch = async () => {
    setIsMchLoading(true);
    try {
      const data = await ashaService.getMchRecords();
      setMchMothers(data.mch_mothers || []);
      setImmunizations(data.immunizations || []);
    } catch (err) {
      console.error('Error fetching MCH:', err);
    } finally {
      setIsMchLoading(false);
    }
  };

  // Fetch Supplies
  const fetchSupplies = async () => {
    setIsSuppliesLoading(true);
    try {
      const data = await ashaService.getSupplies();
      setSupplies(data.supplies || []);
    } catch (err) {
      console.error('Error fetching supplies:', err);
    } finally {
      setIsSuppliesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'mch' && mchMothers.length === 0) {
      fetchMch();
    } else if (activeSubTab === 'supplies' && supplies.length === 0) {
      fetchSupplies();
    }
  }, [activeSubTab]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!stats || !stats.recent_records) return;

    const headers = ['Patient ID', 'Patient Name', 'Village/Town', 'Age', 'Gender', 'Primary Symptom', 'Vitals (BP/SpO2/Temp)', 'Risk Severity', 'Clinical Action', 'Timestamp'];
    const rows = stats.recent_records.map((rec) => [
      rec.patient_id,
      rec.patient_name || 'Village Resident',
      rec.village,
      rec.age ? String(rec.age) : 'N/A',
      rec.gender || 'N/A',
      rec.primary_symptom,
      `BP:${rec.bp || 'N/A'} SpO2:${rec.spo2 || 'N/A'}% Temp:${rec.temperature || 'N/A'}F`,
      rec.risk_level.toUpperCase(),
      rec.recommendation || 'Standard Rural Care Protocol',
      new Date(rec.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SehatMitra_ASHA_HMIS_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Symptom in Screening Form
  const toggleSymptom = (sym: string) => {
    setScreeningForm(prev => {
      const exists = prev.selected_symptoms.includes(sym);
      return {
        ...prev,
        selected_symptoms: exists 
          ? prev.selected_symptoms.filter(s => s !== sym)
          : [...prev.selected_symptoms, sym]
      };
    });
  };

  // Submit Field Screening
  const handleScreeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningForm.patient_name) {
      alert('Please enter patient name.');
      return;
    }
    setIsSubmittingScreening(true);
    try {
      const payload = {
        patient_name: screeningForm.patient_name,
        age: Number(screeningForm.age) || 30,
        gender: screeningForm.gender,
        village: screeningForm.village,
        phone: screeningForm.phone || null,
        bp_systolic: screeningForm.bp_systolic ? Number(screeningForm.bp_systolic) : null,
        bp_diastolic: screeningForm.bp_diastolic ? Number(screeningForm.bp_diastolic) : null,
        spo2: screeningForm.spo2 ? Number(screeningForm.spo2) : null,
        temperature_f: screeningForm.temperature_f ? Number(screeningForm.temperature_f) : null,
        blood_sugar: screeningForm.blood_sugar ? Number(screeningForm.blood_sugar) : null,
        pregnancy_status: screeningForm.pregnancy_status,
        symptoms: screeningForm.selected_symptoms,
        additional_notes: screeningForm.additional_notes || null,
      };

      const res = await ashaService.submitFieldScreening(payload);
      setScreeningResult(res);
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error(err);
      alert('Failed to submit field screening.');
    } finally {
      setIsSubmittingScreening(false);
    }
  };

  // Submit Outbreak Report
  const handleOutbreakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outbreakForm.condition) {
      alert('Please specify the outbreak symptom condition (e.g. Dengue Cluster, Acute Diarrhea)');
      return;
    }
    setIsSubmittingOutbreak(true);
    try {
      const res = await ashaService.reportOutbreak(outbreakForm);
      setOutbreakSuccessMsg(res.message || 'Outbreak alert broadcasted successfully to PHC Medical Officer.');
      fetchStats();
      setTimeout(() => setOutbreakSuccessMsg(null), 5000);
      setOutbreakForm({
        village: 'Rampur Sector 4',
        condition: '',
        severity: 'High Alert',
        estimated_affected: 5,
        suspected_cause: 'Drinking Water Contamination / Borewell pipeline leak',
        recommendation: 'Immediate deployment of chlorine tablets, mobile health van & ORS camp.',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to broadcast outbreak alert.');
    } finally {
      setIsSubmittingOutbreak(false);
    }
  };

  // Submit Restock Request
  const handleRestockSubmit = async () => {
    if (!restockModalItem) return;
    setIsSubmittingRestock(true);
    try {
      const res = await ashaService.requestRestock({
        item_id: restockModalItem.item_id,
        item_name: restockModalItem.name,
        requested_quantity: restockQty,
        urgency: restockModalItem.status === 'Critical Low' ? 'Emergency' : 'Normal',
        asha_name: 'ASHA Suman Devi',
        phc_target: 'Rampur Primary Health Centre',
      });
      setRestockSuccessMsg(res.message);
      fetchSupplies();
      setTimeout(() => {
        setRestockSuccessMsg(null);
        setRestockModalItem(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to send restock requisition.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Submit New MCH Record
  const handleAddMchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMchForm.mother_name) {
      alert('Please enter mother name.');
      return;
    }
    setIsSubmittingMch(true);
    try {
      await ashaService.addMchRecord(newMchForm);
      setShowAddMchModal(false);
      fetchMch();
    } catch (err) {
      console.error(err);
      alert('Failed to add maternal health record.');
    } finally {
      setIsSubmittingMch(false);
    }
  };

  const getRiskBadgeStyles = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900';
      case 'moderate': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900';
      case 'emergency': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900 animate-pulse';
      default: return 'bg-surface-elevated text-content-secondary border-surface-border';
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <span className="text-sm font-semibold text-content-muted">Loading ASHA Health Surveillance System...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-3xl text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto shadow-elevated">
        <ShieldAlert className="w-14 h-14 text-red-500" />
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-red-800 dark:text-red-200">Surveillance Portal Offline</h3>
          <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
        </div>
        <Button onClick={fetchStats} variant="primary" className="mt-2">
          Retry Connecting
        </Button>
      </div>
    );
  }

  const totalCases = stats 
    ? (stats.risk_distribution.low + stats.risk_distribution.moderate + stats.risk_distribution.high + stats.risk_distribution.emergency) || 1
    : 1;

  const quickSymptoms = [
    "High Fever (>101°F)",
    "Severe Chills / Rigors",
    "Continuous Cough",
    "Breathlessness / Chest Tightness",
    "Watery Diarrhea & Vomiting",
    "Severe Headache",
    "Skin Rash / Petechiae",
    "Joint Pain (Dengue/Chikungunya)",
    "Pregnancy Bleeding / Swelling",
    "Extreme Weakness / Paleness",
    "Yellowish Eyes (Jaundice)"
  ];

  return (
    <div className="w-full flex flex-col gap-6 text-left animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-card border border-surface-border p-6 rounded-3xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary">
                ASHA Community Healthcare & Surveillance
              </h2>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                NHM • Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-content-muted mt-0.5">
              Empowering Accredited Social Health Activists (ASHA) with on-ground clinical triage, syndromic surveillance, MCH tracking, and PHC alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-bold shrink-0"
            leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
          >
            Export HMIS Report (CSV)
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('surveillance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubTab === 'surveillance'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-surface-elevated text-content-secondary hover:bg-surface-border'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Surveillance & Outbreaks</span>
        </button>

        <button
          onClick={() => setActiveSubTab('screening')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubTab === 'screening'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-surface-elevated text-content-secondary hover:bg-surface-border'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Field Triage Screening</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubTab === 'mch'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-surface-elevated text-content-secondary hover:bg-surface-border'
          }`}
        >
          <Baby className="w-4 h-4" />
          <span>Maternal & Child (MCH)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supplies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubTab === 'supplies'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-surface-elevated text-content-secondary hover:bg-surface-border'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>ASHA Medicine Kit</span>
        </button>

        <button
          onClick={() => setActiveSubTab('outbreak')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubTab === 'outbreak'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-surface-elevated text-content-secondary hover:bg-surface-border'
          }`}
        >
          <Radio className="w-4 h-4 text-red-500" />
          <span>Dispatch Outbreak Alert</span>
        </button>
      </div>

      {/* ===================== SUBTAB 1: SURVEILLANCE & OUTBREAKS ===================== */}
      {activeSubTab === 'surveillance' && stats && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Outbreak Alert Banners */}
          {stats.epidemic_alerts && stats.epidemic_alerts.length > 0 && (
            <div className="flex flex-col gap-3">
              {stats.epidemic_alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="p-5 border border-orange-300 dark:border-orange-900/60 bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-orange-50/80 dark:from-orange-950/30 dark:to-amber-950/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 shrink-0 border border-orange-200 dark:border-orange-800">
                      <AlertTriangle className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-800 dark:text-orange-300 tracking-wide uppercase">
                          {alert.condition}
                        </span>
                        <span className="text-[10px] bg-orange-600 text-white font-extrabold uppercase px-2 py-0.5 rounded-full">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-content-primary mt-1">
                        Detected in <span className="underline decoration-orange-400">{alert.village}</span> • {alert.cases_reported || 10}+ Cases Screened
                      </p>
                      <p className="text-xs text-content-muted mt-1 font-medium bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-orange-100 dark:border-orange-950">
                        <strong>Protocol Recommendation:</strong> {alert.recommendation}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setActiveSubTab('screening')}
                    variant="outline" 
                    className="shrink-0 text-xs font-bold border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800"
                  >
                    Conduct Village Screening
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Screenings</span>
                <span className="text-2xl font-black text-content-primary">{stats.total_screenings}</span>
              </div>
            </div>

            <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Emergency / High Referrals</span>
                <span className="text-2xl font-black text-content-primary">{stats.emergency_cases_referred}</span>
              </div>
            </div>

            <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Monitored Villages</span>
                <span className="text-2xl font-black text-content-primary">{stats.active_villages_covered} Covered</span>
              </div>
            </div>

            <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Follow-up Adherence</span>
                <span className="text-2xl font-black text-content-primary">98.4%</span>
              </div>
            </div>
          </div>

          {/* Middle Grid: Severity Distribution & Syndromic Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Severity Distribution */}
            <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Syndromic Triage Severity Breakdown
                </h3>
                <span className="text-xs font-semibold text-content-muted">Total: {totalCases} Cases</span>
              </div>
              
              <div className="flex flex-col gap-4 mt-2">
                {/* Low Risk */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-emerald-700 dark:text-emerald-300">Low Risk (Home Care & Observation)</span>
                    <span>{stats.risk_distribution.low} ({Math.round((stats.risk_distribution.low / totalCases) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-bg rounded-full overflow-hidden p-0.5 border border-surface-border">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(stats.risk_distribution.low / totalCases) * 100}%` }} />
                  </div>
                </div>

                {/* Moderate Risk */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-amber-700 dark:text-amber-300">Moderate Risk (ASHA Follow-up Required)</span>
                    <span>{stats.risk_distribution.moderate} ({Math.round((stats.risk_distribution.moderate / totalCases) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-bg rounded-full overflow-hidden p-0.5 border border-surface-border">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(stats.risk_distribution.moderate / totalCases) * 100}%` }} />
                  </div>
                </div>

                {/* High Risk */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-orange-700 dark:text-orange-300">High Risk (PHC Doctor Evaluation Needed)</span>
                    <span>{stats.risk_distribution.high} ({Math.round((stats.risk_distribution.high / totalCases) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-bg rounded-full overflow-hidden p-0.5 border border-surface-border">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${(stats.risk_distribution.high / totalCases) * 100}%` }} />
                  </div>
                </div>

                {/* Emergency */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-red-700 dark:text-red-300">Emergency (108 Ambulance / FRU Referral)</span>
                    <span>{stats.risk_distribution.emergency} ({Math.round((stats.risk_distribution.emergency / totalCases) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-bg rounded-full overflow-hidden p-0.5 border border-surface-border">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${(stats.risk_distribution.emergency / totalCases) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Reported Symptom Clusters */}
            <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Community Disease & Symptom Clusters
              </h3>
              
              <div className="flex flex-col divide-y divide-surface-border">
                {stats.top_symptoms.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-content-primary">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-content-secondary">{item.count} cases</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.trend.startsWith('+') ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                      }`}>
                        {item.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Anonymized Patient Triage Log */}
          <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary">
                  Recent Field Triage & Patient Screening Log
                </h3>
                <p className="text-xs text-content-muted">Real-time syndromic registry captured across monitored village habitations.</p>
              </div>
              <Button
                onClick={() => setActiveSubTab('screening')}
                variant="primary"
                className="text-xs font-bold flex items-center gap-1.5"
                leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                + New Patient Screening
              </Button>
            </div>
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border text-[11px] font-bold uppercase text-content-muted">
                    <th className="pb-3 pr-4">Patient / ID</th>
                    <th className="pb-3 pr-4">Village</th>
                    <th className="pb-3 pr-4">Primary Complaint</th>
                    <th className="pb-3 pr-4">Vitals</th>
                    <th className="pb-3 pr-4">Triage Risk</th>
                    <th className="pb-3">Screening Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs sm:text-sm">
                  {stats.recent_records.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-content-primary">{rec.patient_name || 'Village Resident'}</span>
                          <span className="font-mono text-[11px] text-emerald-600 font-semibold">{rec.patient_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-content-primary">{rec.village}</td>
                      <td className="py-3.5 pr-4 text-content-secondary max-w-xs truncate">{rec.primary_symptom}</td>
                      <td className="py-3.5 pr-4 font-mono text-[11px] text-content-muted">
                        BP: {rec.bp || 'N/A'} • SpO2: {rec.spo2 || 'N/A'}%
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${getRiskBadgeStyles(rec.risk_level)}`}>
                          {rec.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 text-content-muted">{new Date(rec.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ===================== SUBTAB 2: FIELD SCREENING (AI TRIAGE) ===================== */}
      {activeSubTab === 'screening' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Screening Form */}
          <div className="lg:col-span-2 p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-base font-extrabold text-content-primary flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                ASHA On-Ground Patient Clinical Screening
              </h3>
              <p className="text-xs text-content-muted mt-1">
                Enter household patient vitals and symptoms to compute instant clinical risk score and protocol guidance.
              </p>
            </div>

            <form onSubmit={handleScreeningSubmit} className="flex flex-col gap-4 text-xs sm:text-sm">
              
              {/* Row 1: Name, Age, Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-content-secondary text-xs">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={screeningForm.patient_name}
                    onChange={(e) => setScreeningForm({...screeningForm, patient_name: e.target.value})}
                    placeholder="e.g. Ramesh Kumar"
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-content-secondary text-xs">Age (Years) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="120"
                    value={screeningForm.age}
                    onChange={(e) => setScreeningForm({...screeningForm, age: e.target.value})}
                    placeholder="e.g. 35"
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-content-secondary text-xs">Gender</label>
                  <select
                    value={screeningForm.gender}
                    onChange={(e) => setScreeningForm({...screeningForm, gender: e.target.value})}
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Child / Infant">Child / Infant</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Village, Phone, Pregnancy status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-content-secondary text-xs">Village / Habitation</label>
                    <button
                      type="button"
                      onClick={() => openAddVillageModal('screening')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                      title="Add a new village to the system"
                    >
                      + Add Village
                    </button>
                  </div>
                  <select
                    value={screeningForm.village}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        openAddVillageModal('screening');
                      } else {
                        setScreeningForm({...screeningForm, village: e.target.value});
                      }
                    }}
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  >
                    {villages.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Village...</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-content-secondary text-xs">Phone (Optional)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={screeningForm.phone}
                    onChange={(e) => setScreeningForm({...screeningForm, phone: e.target.value.replace(/\D/g, '')})}
                    placeholder="9876543210"
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-content-secondary text-xs">Pregnancy / Lactating?</label>
                  <select
                    value={screeningForm.pregnancy_status}
                    onChange={(e) => setScreeningForm({...screeningForm, pregnancy_status: e.target.value})}
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="No">No / Non-Pregnant</option>
                    <option value="1st Trimester (1-13 wks)">1st Trimester (1-13 wks)</option>
                    <option value="2nd Trimester (14-27 wks)">2nd Trimester (14-27 wks)</option>
                    <option value="3rd Trimester (28+ wks)">3rd Trimester (28+ wks)</option>
                    <option value="Lactating Mother">Lactating Mother</option>
                  </select>
                </div>
              </div>

              {/* Vitals Section */}
              <div className="p-4 bg-surface-elevated rounded-2xl border border-surface-border flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Field Vitals Measurement (via ASHA Kit)
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-content-muted">BP (Systolic / Diastolic)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="120"
                        value={screeningForm.bp_systolic}
                        onChange={(e) => setScreeningForm({...screeningForm, bp_systolic: e.target.value})}
                        className="w-full p-2 bg-surface-card border border-surface-border rounded-lg text-center text-xs"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        placeholder="80"
                        value={screeningForm.bp_diastolic}
                        onChange={(e) => setScreeningForm({...screeningForm, bp_diastolic: e.target.value})}
                        className="w-full p-2 bg-surface-card border border-surface-border rounded-lg text-center text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-content-muted">SpO2 Oxygen (%)</span>
                    <input
                      type="number"
                      placeholder="98"
                      value={screeningForm.spo2}
                      onChange={(e) => setScreeningForm({...screeningForm, spo2: e.target.value})}
                      className="p-2 bg-surface-card border border-surface-border rounded-lg text-center text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-content-muted">Temperature (°F)</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={screeningForm.temperature_f}
                      onChange={(e) => setScreeningForm({...screeningForm, temperature_f: e.target.value})}
                      className="p-2 bg-surface-card border border-surface-border rounded-lg text-center text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-content-muted">Random Sugar (mg/dL)</span>
                    <input
                      type="number"
                      placeholder="110"
                      value={screeningForm.blood_sugar}
                      onChange={(e) => setScreeningForm({...screeningForm, blood_sugar: e.target.value})}
                      className="p-2 bg-surface-card border border-surface-border rounded-lg text-center text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Symptoms Checklist */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-content-secondary">
                  Presenting Symptoms & Red Flags (Select all observed)
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickSymptoms.map((sym, idx) => {
                    const isSelected = screeningForm.selected_symptoms.includes(sym);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleSymptom(sym)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-surface-elevated text-content-secondary border-surface-border hover:bg-surface-border'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingScreening}
                  className="px-6 py-2.5 font-bold flex items-center gap-2"
                >
                  {isSubmittingScreening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Evaluate & Save Triage Record
                </Button>
              </div>

            </form>
          </div>

          {/* AI Clinical Recommendation Result Card */}
          <div className="flex flex-col gap-4">
            <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                ASHA Clinical Decision Support
              </h3>

              {screeningResult ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  
                  <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${getRiskBadgeStyles(screeningResult.risk_level)}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider">Triage Result</span>
                      <span className="font-extrabold text-sm uppercase px-2.5 py-0.5 rounded-full bg-white/40 dark:bg-black/40">
                        {screeningResult.risk_level} Risk
                      </span>
                    </div>
                    <span className="text-xs font-bold text-content-primary">
                      Patient: {screeningResult.record?.patient_name} ({screeningResult.record?.patient_id})
                    </span>
                  </div>

                  {/* Red flags */}
                  {screeningResult.red_flags && screeningResult.red_flags.length > 0 && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl flex flex-col gap-1 text-xs">
                      <span className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Critical Red Flags Identified:
                      </span>
                      <ul className="list-disc list-inside text-red-600 dark:text-red-300 pl-1 font-medium">
                        {screeningResult.red_flags.map((flag: string, fIdx: number) => (
                          <li key={fIdx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Clinical Actions */}
                  <div className="p-4 bg-surface-elevated rounded-2xl border border-surface-border flex flex-col gap-2 text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">ASHA Protocol Guidelines:</span>
                    <div className="text-content-secondary leading-relaxed font-medium">
                      {screeningResult.clinical_action ? screeningResult.clinical_action.join(' ') : screeningResult.record?.recommendation}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-bold text-center border border-emerald-200 dark:border-emerald-800">
                    Record successfully added to Village Surveillance Register.
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-content-muted">
                  <Stethoscope className="w-12 h-12 stroke-[1.5] text-content-muted/40" />
                  <p className="text-xs font-semibold">Fill and submit the screening form to generate instant clinical triage guidance.</p>
                </div>
              )}
            </div>

            {/* Quick Emergency Protocol box */}
            <div className="p-5 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-900/60 rounded-3xl flex flex-col gap-2">
              <span className="text-xs font-black uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Emergency Protocol Numbers
              </span>
              <p className="text-xs text-content-secondary">
                For red-flag cases, call <strong>108 (National Ambulance)</strong> or <strong>102 (Janani Shishu Suraksha)</strong> immediately.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ===================== SUBTAB 3: MATERNAL & CHILD HEALTH (MCH) ===================== */}
      {activeSubTab === 'mch' && (
        isMchLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-semibold text-content-muted">Loading MCH & Immunization Registry...</span>
          </div>
        ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Top Actions & Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-content-primary flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-600" />
                Maternal (ANC/PNC) & Child Immunization Tracking
              </h3>
              <p className="text-xs text-content-muted">
                Track high-risk pregnancies, ANC checkup schedules, and child vaccination due dates in real-time.
              </p>
            </div>
            <Button
              onClick={() => setShowAddMchModal(true)}
              variant="primary"
              className="text-xs font-bold flex items-center gap-1.5 shrink-0"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              + Register Pregnant Mother
            </Button>
          </div>

          {/* High Risk Mothers Register Table */}
          <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                Antenatal Care (ANC) & High-Risk Pregnancy Roster
              </h4>
              <span className="text-xs font-semibold text-content-muted">{mchMothers.length} Mothers Monitored</span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border text-[11px] font-bold uppercase text-content-muted">
                    <th className="pb-3 pr-4">Mother Name / ID</th>
                    <th className="pb-3 pr-4">Village</th>
                    <th className="pb-3 pr-4">Gestation</th>
                    <th className="pb-3 pr-4">Hb Level</th>
                    <th className="pb-3 pr-4">Risk Status</th>
                    <th className="pb-3 pr-4">Next ANC Date</th>
                    <th className="pb-3">IFA Tablets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs sm:text-sm">
                  {mchMothers.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-content-primary">{m.mother_name}</span>
                          <span className="text-[10px] text-content-muted">Age: {m.age} Yrs • {m.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-content-primary">{m.village}</td>
                      <td className="py-3.5 pr-4 text-content-secondary">
                        {m.gestation_weeks} Wks ({m.trimester} Tri)
                      </td>
                      <td className="py-3.5 pr-4 font-mono font-bold">
                        <span className={m.hb_level < 10 ? 'text-red-500' : 'text-emerald-600'}>
                          {m.hb_level} g/dL
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        {m.high_risk_flag ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 text-[10px] font-black uppercase">
                            High Risk: {m.risk_reason}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-[10px] font-bold uppercase">
                            Normal Progress
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 font-medium text-content-primary">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-brand-600" />
                          {m.next_anc_date}
                        </span>
                      </td>
                      <td className="py-3.5 text-content-muted font-bold">{m.ifa_given} Tabs Issued</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Child Immunization Schedule */}
          <div className="p-6 bg-surface-card border border-surface-border rounded-3xl shadow-sm flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              Infant & Child Immunization Roster (UIP Scheme)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {immunizations.map((imm) => (
                <div key={imm.id} className="p-4 bg-surface-elevated rounded-2xl border border-surface-border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-content-primary">{imm.child_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      imm.status === 'Overdue' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 border border-red-200' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 border border-amber-200'
                    }`}>
                      {imm.status}
                    </span>
                  </div>
                  <span className="text-xs text-content-muted">Parent: {imm.parent_name} • {imm.village}</span>
                  <div className="p-2.5 bg-surface-card rounded-xl border border-surface-border text-xs flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-content-muted uppercase font-bold">Due Vaccine:</span>
                    <span className="font-bold text-brand-600">{imm.due_vaccine}</span>
                    <span className="text-[11px] text-content-muted mt-0.5">Due on: <strong>{imm.due_date}</strong> (Age: {imm.age_months} Mos)</span>
                  </div>
                  <button
                    onClick={() => alert(`Vaccination recorded for ${imm.child_name}!`)}
                    className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition mt-1"
                  >
                    Mark Dose Administered
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
        )
      )}

      {/* ===================== SUBTAB 4: ASHA MEDICINE KIT & SUPPLIES ===================== */}
      {activeSubTab === 'supplies' && (
        isSuppliesLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-xs font-semibold text-content-muted">Loading Medicine Kit Inventory...</span>
          </div>
        ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-content-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                ASHA First-Aid & Essential Medicine Stock Inventory
              </h3>
              <p className="text-xs text-content-muted">
                Monitor available kits, identify low inventory, and issue one-click restock requests to the Primary Health Centre (PHC).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {supplies.map((item) => {
              const isLow = item.status === 'Low Stock' || item.status === 'Critical Low';
              return (
                <div 
                  key={item.item_id} 
                  className={`p-5 bg-surface-card border rounded-3xl flex flex-col justify-between gap-4 shadow-sm transition-all ${
                    isLow ? 'border-orange-300 dark:border-orange-900/60 bg-orange-50/10' : 'border-surface-border'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">{item.category}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'Critical Low' 
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 border border-red-200' 
                          : item.status === 'Low Stock'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border border-emerald-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-content-primary leading-snug">{item.name}</h4>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black text-content-primary">{item.stock}</span>
                      <span className="text-xs text-content-muted font-bold">{item.unit}</span>
                    </div>

                    <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.stock < item.minimum_required ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (item.stock / item.minimum_required) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-content-muted">Min Required: {item.minimum_required} {item.unit}</span>

                    <button
                      onClick={() => {
                        setRestockModalItem(item);
                        setRestockQty(Math.max(20, item.minimum_required - item.stock + 20));
                      }}
                      className="mt-2 w-full py-1.5 bg-surface-elevated hover:bg-surface-border text-content-primary border border-surface-border rounded-xl text-xs font-bold transition"
                    >
                      Request Restock from PHC
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        )
      )}

      {/* ===================== SUBTAB 5: OUTBREAK ALERT DISPATCH ===================== */}
      {activeSubTab === 'outbreak' && (
        <div className="max-w-2xl mx-auto w-full p-6 sm:p-8 bg-surface-card border border-surface-border rounded-3xl shadow-elevated flex flex-col gap-6 animate-fade-in">
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-content-primary">
                Emergency Outbreak & Contamination Dispatch
              </h3>
              <p className="text-xs text-content-muted mt-0.5">
                Broadcast an immediate priority epidemiological alert to the PHC Medical Officer, IDSP (Integrated Disease Surveillance Programme), and District CMO.
              </p>
            </div>
          </div>

          {outbreakSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {outbreakSuccessMsg}
            </div>
          )}

          <form onSubmit={handleOutbreakSubmit} className="flex flex-col gap-4 text-xs sm:text-sm">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-content-secondary text-xs">Affected Village *</label>
                  <button
                    type="button"
                    onClick={() => openAddVillageModal('outbreak')}
                    className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-0.5"
                    title="Add a new village to the system"
                  >
                    + Add Village
                  </button>
                </div>
                <select
                  value={outbreakForm.village}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      openAddVillageModal('outbreak');
                    } else {
                      setOutbreakForm({...outbreakForm, village: e.target.value});
                    }
                  }}
                  className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
                >
                  {villages.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add New Village...</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-content-secondary text-xs">Alert Urgency Level</label>
                <select
                  value={outbreakForm.severity}
                  onChange={(e) => setOutbreakForm({...outbreakForm, severity: e.target.value})}
                  className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
                >
                  <option value="High Alert">High Alert (Immediate PHC Team Deployment)</option>
                  <option value="Warning">Warning (Cluster Monitoring)</option>
                  <option value="Critical Emergency">Critical Emergency (CMO / District Rapid Response)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-content-secondary text-xs">Syndromic Outbreak Condition *</label>
              <input
                type="text"
                required
                value={outbreakForm.condition}
                onChange={(e) => setOutbreakForm({...outbreakForm, condition: e.target.value})}
                placeholder="e.g. Acute Watery Diarrhea Cluster (15 Households) or High Fever with Thrombocytopenia"
                className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-content-secondary text-xs">Estimated Affected People</label>
                <input
                  type="number"
                  min="1"
                  value={outbreakForm.estimated_affected}
                  onChange={(e) => setOutbreakForm({...outbreakForm, estimated_affected: Number(e.target.value)})}
                  className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-content-secondary text-xs">Suspected Source</label>
                <input
                  type="text"
                  value={outbreakForm.suspected_cause}
                  onChange={(e) => setOutbreakForm({...outbreakForm, suspected_cause: e.target.value})}
                  placeholder="e.g. Well water leak, mosquito breeding"
                  className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-content-secondary text-xs">Immediate Recommendation / Request</label>
              <textarea
                rows={3}
                value={outbreakForm.recommendation}
                onChange={(e) => setOutbreakForm({...outbreakForm, recommendation: e.target.value})}
                placeholder="Enter required assistance from PHC/District Medical Officer"
                className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingOutbreak}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black flex items-center gap-2"
              >
                {isSubmittingOutbreak ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Broadcast Emergency Alert to PHC
              </Button>
            </div>

          </form>
        </div>
      )}

      {/* ===================== MODAL 1: ADD MCH MOTHER ===================== */}
      {showAddMchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleAddMchSubmit}
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 shadow-elevated flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-600" />
                Register Pregnant Mother (ANC)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMchModal(false)}
                className="p-1 rounded-lg text-content-muted hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-content-secondary">Mother Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMchForm.mother_name}
                  onChange={(e) => setNewMchForm({...newMchForm, mother_name: e.target.value})}
                  placeholder="e.g. Sangeeta Devi"
                  className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Age</label>
                  <input
                    type="number"
                    value={newMchForm.age}
                    onChange={(e) => setNewMchForm({...newMchForm, age: Number(e.target.value)})}
                    className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Gestation (Weeks)</label>
                  <input
                    type="number"
                    min="1"
                    max="42"
                    value={newMchForm.gestation_weeks}
                    onChange={(e) => setNewMchForm({...newMchForm, gestation_weeks: Number(e.target.value)})}
                    className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Hemoglobin (Hb g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMchForm.hb_level}
                    onChange={(e) => setNewMchForm({...newMchForm, hb_level: Number(e.target.value)})}
                    className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-content-secondary">Village</label>
                    <button
                      type="button"
                      onClick={() => openAddVillageModal('mch')}
                      className="text-[11px] text-pink-600 dark:text-pink-400 font-bold hover:underline flex items-center gap-0.5"
                      title="Add a new village to the system"
                    >
                      + Add Village
                    </button>
                  </div>
                  <select
                    value={newMchForm.village}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        openAddVillageModal('mch');
                      } else {
                        setNewMchForm({...newMchForm, village: e.target.value});
                      }
                    }}
                    className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                  >
                    {villages.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Village...</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-content-secondary">Next ANC Checkup Date</label>
                <input
                  type="date"
                  value={newMchForm.next_anc_date}
                  onChange={(e) => setNewMchForm({...newMchForm, next_anc_date: e.target.value})}
                  className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="high_risk_cb"
                  checked={newMchForm.high_risk_flag}
                  onChange={(e) => setNewMchForm({...newMchForm, high_risk_flag: e.target.checked})}
                  className="rounded border-surface-border"
                />
                <label htmlFor="high_risk_cb" className="font-bold text-content-primary">Mark as High-Risk Pregnancy</label>
              </div>

              {newMchForm.high_risk_flag && (
                <input
                  type="text"
                  placeholder="Reason for high risk (e.g. Gestational Hypertension, Severe Anemia)"
                  value={newMchForm.risk_reason}
                  onChange={(e) => setNewMchForm({...newMchForm, risk_reason: e.target.value})}
                  className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddMchModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-border text-content-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingMch}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1"
              >
                {isSubmittingMch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Mother Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== MODAL 2: RESTOCK REQUEST ===================== */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-card border border-surface-border rounded-3xl p-6 shadow-elevated flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-base font-bold text-content-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                PHC Restock Requisition
              </h3>
              <button
                onClick={() => setRestockModalItem(null)}
                className="p-1 rounded-lg text-content-muted hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restockSuccessMsg ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {restockSuccessMsg}
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <p className="text-content-secondary font-medium">
                  Dispatch supply indent for <strong>{restockModalItem.name}</strong> to Rampur Primary Health Centre.
                </p>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Requested Quantity ({restockModalItem.unit})</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="p-2 bg-surface-elevated border border-surface-border rounded-lg"
                  />
                </div>

                <div className="p-3 bg-surface-elevated rounded-xl border border-surface-border text-[11px] text-content-muted">
                  Requisition will be signed digitally by ASHA worker and forwarded to PHC Medical Officer for supply dispatch.
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setRestockModalItem(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-border text-content-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestockSubmit}
                    disabled={isSubmittingRestock}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                  >
                    {isSubmittingRestock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Requisition
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: ADD NEW VILLAGE / HABITATION ===================== */}
      {showAddVillageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleCreateVillage}
            className="w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 shadow-elevated flex flex-col gap-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-primary">
                    Add New Village / Habitation
                  </h3>
                  <p className="text-[11px] text-content-muted">Register a new village or hamlet to your ASHA coverage area</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVillageModal(false)}
                className="p-1 rounded-lg text-content-muted hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {villageSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {villageSuccessMsg}
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-content-secondary">
                  Village / Habitation Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newVillageName}
                  onChange={(e) => setNewVillageName(e.target.value)}
                  placeholder="e.g. Shanti Nagar, Basti Ward 2, or Rampur Tola"
                  className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Gram Panchayat / Sub-Centre</label>
                  <input
                    type="text"
                    value={newVillagePanchayat}
                    onChange={(e) => setNewVillagePanchayat(e.target.value)}
                    placeholder="e.g. Rampur GP"
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-content-secondary">Approx. Population</label>
                  <input
                    type="number"
                    value={newVillagePopulation}
                    onChange={(e) => setNewVillagePopulation(e.target.value)}
                    placeholder="e.g. 1200"
                    className="p-2.5 bg-surface-elevated border border-surface-border rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface-elevated rounded-xl border border-surface-border text-[11px] text-content-muted flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This village will be automatically saved and available across <strong>Field Screening</strong>, <strong>Outbreak Alerts</strong>, and <strong>MCH Records</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVillageModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-surface-border text-content-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Save & Select Village
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AshaDashboard;
