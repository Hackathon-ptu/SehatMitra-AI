import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { LanguagePage } from './pages/LanguagePage';
import { ChatPage } from './pages/ChatPage';
import { HealthInterviewPage } from './pages/HealthInterviewPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';
import { HospitalPage } from './pages/HospitalPage';
import { ReportPage } from './pages/ReportPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/language" element={<LanguagePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/health-interview" element={<HealthInterviewPage />} />
            <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
            <Route path="/hospitals" element={<HospitalPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
