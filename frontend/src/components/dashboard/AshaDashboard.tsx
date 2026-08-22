import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  ShieldAlert, 
  TrendingUp,
  Loader2,
  Activity
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
  recommendation: string;
}

interface TriageRecord {
  patient_id: string;
  village: string;
  primary_symptom: string;
  risk_level: string;
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

export const AshaDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/analytics/community-stats');
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch epidemiological surveillance metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCSV = () => {
    if (!stats || !stats.recent_records) return;

    const headers = ['Patient ID', 'Village/Town', 'Primary Symptom', 'Risk Level', 'Timestamp'];
    const rows = stats.recent_records.map((rec) => [
      rec.patient_id,
      rec.village,
      rec.primary_symptom,
      rec.risk_level.toUpperCase(),
      new Date(rec.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SehatMitra_Surveillance_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskBadgeStyles = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900';
      case 'moderate': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900';
      case 'emergency': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900';
      default: return 'bg-surface-elevated text-content-secondary border-surface-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <span className="text-sm font-semibold text-content-muted">Loading Surveillance Dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center flex flex-col items-center justify-center gap-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <p className="text-sm font-bold text-red-700 dark:text-red-300">{error || 'Something went wrong.'}</p>
        <Button onClick={fetchStats} variant="primary">Retry Loading</Button>
      </div>
    );
  }

  const totalCases = stats.risk_distribution.low + stats.risk_distribution.moderate + stats.risk_distribution.high + stats.risk_distribution.emergency;

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      
      {/* Top Banner Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-content-primary flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            ASHA Worker & Community Health Surveillance Portal
          </h2>
          <p className="text-xs sm:text-sm text-content-muted">
            Real-time disease surveillance, syndromic outbreak alerts, and clinical risk metrics across monitored villages.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2 text-xs font-bold shrink-0"
          leftIcon={<Download className="w-4 h-4 text-brand-600" />}
        >
          Export Epidemiological Data (CSV)
        </Button>
      </div>

      {/* Outbreak Alert Banners */}
      {stats.epidemic_alerts && stats.epidemic_alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {stats.epidemic_alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="p-4 border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 shrink-0">
                  <AlertTriangle className="w-5.5 h-5.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-orange-700 dark:text-orange-400">
                    Syndromic Outbreak Alert: {alert.condition}
                  </span>
                  <p className="text-xs font-bold text-content-primary mt-0.5">
                    Detected in {alert.village} • Immediate Intervention Required
                  </p>
                  <p className="text-xs text-content-muted mt-1 font-medium">
                    Recommendation: {alert.recommendation}
                  </p>
                </div>
              </div>
              <div className="text-[10px] bg-orange-600 text-white font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                {alert.severity}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center text-brand-600">
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Screenings</span>
            <span className="text-2xl font-extrabold text-content-primary">{stats.total_screenings}</span>
          </div>
        </div>

        <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Critical Referrals</span>
            <span className="text-2xl font-extrabold text-content-primary">{stats.emergency_cases_referred}</span>
          </div>
        </div>

        <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Monitored Villages</span>
            <span className="text-2xl font-extrabold text-content-primary">{stats.active_villages_covered}</span>
          </div>
        </div>

        <div className="p-5 bg-surface-card border border-surface-border rounded-2xl flex items-center gap-4 shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Follow-up Complete</span>
            <span className="text-2xl font-extrabold text-content-primary">100%</span>
          </div>
        </div>

      </div>

      {/* Middle Grid: Risk Distribution & Symptom trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Distribution Card */}
        <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-subtle flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            Triage Severity Distribution
          </h3>
          <div className="flex flex-col gap-4.5 mt-2">
            
            {/* Low Risk */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-emerald-700 dark:text-emerald-300">Low Risk (Mild / Home Care)</span>
                <span>{stats.risk_distribution.low} ({Math.round((stats.risk_distribution.low / totalCases) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-bg rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.risk_distribution.low / totalCases) * 100}%` }} />
              </div>
            </div>

            {/* Moderate Risk */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-amber-700 dark:text-amber-300">Moderate Risk (Observation)</span>
                <span>{stats.risk_distribution.moderate} ({Math.round((stats.risk_distribution.moderate / totalCases) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-bg rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(stats.risk_distribution.moderate / totalCases) * 100}%` }} />
              </div>
            </div>

            {/* High Risk */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-orange-700 dark:text-orange-300">High Risk (Requires Clinic Consultation)</span>
                <span>{stats.risk_distribution.high} ({Math.round((stats.risk_distribution.high / totalCases) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-bg rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats.risk_distribution.high / totalCases) * 100}%` }} />
              </div>
            </div>

            {/* Emergency */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-red-700 dark:text-red-300">Emergency Referrals (Red-flag alert)</span>
                <span>{stats.risk_distribution.emergency} ({Math.round((stats.risk_distribution.emergency / totalCases) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-surface-bg rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(stats.risk_distribution.emergency / totalCases) * 100}%` }} />
              </div>
            </div>

          </div>
        </div>

        {/* Top Symptoms Card */}
        <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-subtle flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-600" />
            Top Reported Syndromic Trends
          </h3>
          
          <div className="flex flex-col divide-y divide-surface-border">
            {stats.top_symptoms.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-content-primary">{item.name}</span>
                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-content-secondary">{item.count} cases</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.trend.startsWith('+') ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                  }`}>
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Triage Log Table */}
      <div className="p-6 bg-surface-card border border-surface-border rounded-2xl shadow-subtle flex flex-col gap-4 overflow-hidden">
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-secondary">
          Anonymized Patient Triage Log
        </h3>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase text-content-muted">
                <th className="pb-3 pr-4">Patient ID</th>
                <th className="pb-3 pr-4">Village/Town</th>
                <th className="pb-3 pr-4">Primary Symptom</th>
                <th className="pb-3 pr-4">Risk Severity</th>
                <th className="pb-3">Surveillance Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs sm:text-sm">
              {stats.recent_records.map((rec, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3.5 pr-4 font-mono font-bold text-brand-600">{rec.patient_id}</td>
                  <td className="py-3.5 pr-4 font-semibold text-content-primary">{rec.village}</td>
                  <td className="py-3.5 pr-4 text-content-secondary">{rec.primary_symptom}</td>
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
  );
};
export default AshaDashboard;
