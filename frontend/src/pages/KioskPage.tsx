/**
 * KioskPage.tsx
 * Charak-Kiosk / MediKiosk Engine — Full-page host
 * AIIA Problem Statement ID: 26047
 *
 * Three-tab layout:
 *   "Patient Intake"  → CharakKiosk   (sub-3-minute touch/voice OPD intake)
 *   "Doctor Cockpit"  → DoctorCockpit (15-second physician triage view)
 *   "FHIR R4 Bundle"  → FhirBundleViewer (ABDM PHR export)
 *
 * The CharakKiosk passes tokenId up via onCockpitOpen; KioskPage then
 * switches to the Cockpit tab automatically.
 *
 * Routes:
 *   /kiosk                        → Patient Intake tab
 *   /doctor-cockpit/:token_id     → Doctor Cockpit pre-loaded with token
 *
 * Built with IBM Bob IDE (Granite-Code-Instruct)
 */

import React, { useState } from 'react';
import { CharakKiosk } from '../components/kiosk/CharakKiosk';
import { DoctorCockpit } from '../components/kiosk/DoctorCockpit';
import { cn } from '../utils/cn';
import { MonitorSmartphone, Stethoscope, FileJson, Info } from 'lucide-react';
import { AuthSessionBadge } from '../components/common/AuthSessionBadge';

type KioskTab = 'intake' | 'doctor' | 'fhir';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Inline FHIR Viewer ──────────────────────────────────────────────────────
const FhirBundleViewer: React.FC = () => {
  const [token, setToken] = useState('');
  const [bundle, setBundle] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBundle = async () => {
    if (!token.trim()) { setError('Enter an OPD token first.'); return; }
    setLoading(true); setError(''); setBundle(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/doctor-cockpit/${encodeURIComponent(token.trim())}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || 'Not found');
      }
      const data = await res.json();
      setBundle(data?.fhir_bundle ?? data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch FHIR bundle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-white shadow-lg flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <FileJson className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">ABDM FHIR R4 Bundle Viewer</h1>
          <p className="text-xs text-emerald-200">DocumentBundle · NRCES PHR Profile · ICD-11 + NAMASTE + Vikriti</p>
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
        <label className="text-xs font-bold text-content-muted uppercase tracking-wider block mb-2">
          OPD Token
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && fetchBundle()}
            placeholder="OPD-GRN-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-elevated text-content-primary text-base font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={fetchBundle}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Fetch Bundle'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {bundle && (
        <div className="bg-surface-card rounded-2xl border border-surface-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-content-primary text-sm">FHIR R4 Bundle JSON</h3>
            <button
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(bundle, null, 2))}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-content-muted hover:text-content-primary transition-colors"
            >
              Copy JSON
            </button>
          </div>
          <pre className="text-xs font-mono text-content-primary bg-surface-elevated rounded-xl p-4 border border-surface-border overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
            {JSON.stringify(bundle, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 rounded-xl text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This bundle is generated server-side from the kiosk intake record and follows the
          <strong> NRCES ABDM PHR Document Bundle</strong> profile. It contains Patient,
          Composition, 2× Condition (ICD-11 + NAMASTE), Tridosha Observation, and
          MedicationStatement resources. No PHI leaves the local server.
        </p>
      </div>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const TABS: { id: KioskTab; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: 'intake',
    label: 'Patient Intake',
    sublabel: 'Sub-3-min OPD workflow',
    icon: <MonitorSmartphone className="w-4 h-4" />,
  },
  {
    id: 'doctor',
    label: 'Doctor Cockpit',
    sublabel: '15-sec triage card',
    icon: <Stethoscope className="w-4 h-4" />,
  },
  {
    id: 'fhir',
    label: 'FHIR R4 Bundle',
    sublabel: 'ABDM PHR export',
    icon: <FileJson className="w-4 h-4" />,
  },
];

interface KioskPageProps {
  /** Pre-load the cockpit with this token (e.g. from /doctor-cockpit/:token_id route) */
  initialTokenId?: string;
}

export const KioskPage: React.FC<KioskPageProps> = ({ initialTokenId }) => {
  const [activeTab, setActiveTab] = useState<KioskTab>(initialTokenId ? 'doctor' : 'intake');
  const [cockpitToken, setCockpitToken] = useState<string>(initialTokenId || '');

  const handleCockpitOpen = (tokenId: string) => {
    setCockpitToken(tokenId);
    setActiveTab('doctor');
  };

  return (
    <div className="space-y-6">
      {/* Auth status badge */}
      <div className="flex justify-end">
        <AuthSessionBadge />
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
              activeTab === tab.id
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'border-surface-border bg-surface-card text-content-secondary hover:border-brand-300 hover:text-content-primary'
            )}
          >
            <span className={activeTab === tab.id ? 'text-brand-600' : 'text-content-muted'}>{tab.icon}</span>
            <span className="flex flex-col text-left leading-tight">
              <span>{tab.label}</span>
              <span className="text-[10px] font-normal opacity-70">{tab.sublabel}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Panel — override normal page padding for dark-mode kiosk */}
      <div className={activeTab === 'intake' || activeTab === 'doctor' ? '-mx-4 sm:-mx-6 lg:-mx-8' : ''}>
        {activeTab === 'intake' && (
          <CharakKiosk onCockpitOpen={handleCockpitOpen} />
        )}
        {activeTab === 'doctor' && (
          cockpitToken ? (
            <DoctorCockpit tokenId={cockpitToken} />
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 bg-slate-900 rounded-2xl p-8">
              <Stethoscope className="w-10 h-10 text-emerald-500" />
              <p className="text-slate-300 font-semibold text-center">
                No token loaded yet.<br />Complete patient intake first, then click <strong>"Open Doctor Cockpit"</strong>.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Or enter token manually: OPD-GRN-XXXXXX"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-72 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                      if (val) handleCockpitOpen(val);
                    }
                  }}
                />
                <button
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousSibling as HTMLInputElement);
                    const val = input?.value.trim().toUpperCase();
                    if (val) handleCockpitOpen(val);
                  }}
                >Load</button>
              </div>
            </div>
          )
        )}
        {activeTab === 'fhir' && <FhirBundleViewer />}
      </div>
    </div>
  );
};

export default KioskPage;
