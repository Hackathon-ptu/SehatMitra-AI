import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { StandaloneKioskPage, DoctorCockpitPage } from './pages/StandaloneKioskPage';
import { HospitalHubPage } from './pages/HospitalHubPage';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { BrowserRouter, Navigate } from 'react-router-dom';
import './index.css';
import './i18n';

// ASHA portal is a separate audience — load its code only when it is opened
const AshaApp = lazy(() => import('./features/asha/AshaApp').then((m) => ({ default: m.AshaApp })));
const AshaLoginPage = lazy(() => import('./features/asha/AshaApp').then((m) => ({ default: m.AshaLoginPage })));
const portal = (el: React.ReactNode) => <Suspense fallback={<div className="min-h-screen bg-surface-bg" />}>{el}</Suspense>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* ── Hospital Kiosk Shell (no Navbar/Footer) ── */}
            <Route path="/kiosk" element={<StandaloneKioskPage />} />

            {/* ── Hospital Login + Staff Workstation (PIN-protected, strict gate) ── */}
            <Route path="/hospital" element={<HospitalHubPage />} />

            {/* ── /staff alias → same PIN-gated Hospital workstation ── */}
            <Route path="/staff" element={<HospitalHubPage />} />

            {/* Doctor Cockpit — physician workstation, separate from patient kiosk */}
            <Route path="/doctor-cockpit" element={<DoctorCockpitPage />} />
            <Route path="/doctor-cockpit/:token_id" element={<DoctorCockpitPage />} />

            {/* ── ASHA Portal (own shell, shares theme & language with the citizen app) ── */}
            <Route path="/asha-login" element={portal(<AshaLoginPage />)} />
            <Route path="/asha/*" element={portal(<AshaApp />)} />
            {/* Legacy /portal/* aliases — kept so existing bookmarks don't break */}
            <Route path="/portal/asha-login" element={<Navigate to="/asha-login" replace />} />
            <Route path="/portal/asha" element={<Navigate to="/asha" replace />} />

            {/* ── Citizen SPA (Navbar + Footer) — catches everything else ── */}
            <Route path="*" element={<App />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
