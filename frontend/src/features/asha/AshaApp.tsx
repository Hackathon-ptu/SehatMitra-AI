import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './i18n';
import { AshaShell } from './components/AshaShell';
import { useAshaSession } from './hooks';
import { HouseholdPage } from './pages/HouseholdPage';
import { HouseholdsPage } from './pages/HouseholdsPage';
import { MePage } from './pages/MePage';
import { MemberPage } from './pages/MemberPage';
import { NewHouseholdPage } from './pages/NewHouseholdPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { TodayPage } from './pages/TodayPage';
import { VisitPage } from './pages/VisitPage';

export { AshaLoginPage } from './pages/LoginPage';

/** Routes under /asha/* — only reachable with an ASHA session. */
export const AshaApp: React.FC = () => {
  const session = useAshaSession();
  const location = useLocation();

  useEffect(() => {
    document.title = 'ASHA Portal · SehatMitra AI';
    return () => {
      document.title = 'SehatMitra AI — Healthcare Assistant';
    };
  }, []);
  if (!session) {
    return <Navigate to="/asha-login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <Routes>
      <Route element={<AshaShell />}>
        <Route index element={<TodayPage />} />
        <Route path="households" element={<HouseholdsPage />} />
        <Route path="households/new" element={<NewHouseholdPage />} />
        <Route path="households/:id" element={<HouseholdPage />} />
        <Route path="members/:id" element={<MemberPage />} />
        <Route path="visit" element={<VisitPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="me" element={<MePage />} />
        <Route path="*" element={<Navigate to="/asha" replace />} />
      </Route>
    </Routes>
  );
};
