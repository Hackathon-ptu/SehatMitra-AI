import React from 'react';
import ReactDOM from 'react-dom/client';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { AshaLoginPage } from './pages/AshaLoginPage';
import { AshaPortalPage } from './pages/AshaPortalPage';
import { StandaloneKioskPage, DoctorCockpitPage } from './pages/StandaloneKioskPage';
import { StaffPortal } from './components/kiosk/StaffPortal';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* ── Hospital Kiosk Shell (no Navbar/Footer) ── */}
            <Route path="/kiosk" element={<StandaloneKioskPage />} />

            {/* ── Hospital Staff Workstation (PIN-protected) ── */}
            <Route path="/staff" element={<StaffPortal />} />

            {/* Doctor Cockpit — physician workstation, separate from patient kiosk */}
            <Route path="/doctor-cockpit" element={<DoctorCockpitPage />} />
            <Route path="/doctor-cockpit/:token_id" element={<DoctorCockpitPage />} />

            {/* ── ASHA Worker access point (no citizen Navbar/Footer) ── */}
            {/* Canonical routes: /asha-login and /asha/* */}
            <Route path="/asha-login" element={<AshaLoginPage />} />
            <Route path="/asha/*" element={<AshaPortalPage />} />
            {/* Legacy /portal/* aliases — kept so existing bookmarks don't break */}
            <Route path="/portal/asha-login" element={<AshaLoginPage />} />
            <Route path="/portal/asha" element={<AshaPortalPage />} />

            {/* ── Citizen SPA (Navbar + Footer) — catches everything else ── */}
            <Route path="*" element={<App />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
