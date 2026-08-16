import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { CapabilityStrip } from '../components/landing/CapabilityStrip';
import { HowItWorks } from '../components/landing/HowItWorks';
import { HealthInterviewPreview } from '../components/landing/HealthInterviewPreview';
import { ReportPreview } from '../components/landing/ReportPreview';
import { SafetySection } from '../components/landing/SafetySection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary transition-colors">
      <LandingNavbar />
      <main className="flex-1 w-full overflow-hidden">
        <HeroSection />
        <ScrollReveal>
          <CapabilityStrip />
        </ScrollReveal>
        <ScrollReveal>
          <HowItWorks />
        </ScrollReveal>
        <ScrollReveal>
          <HealthInterviewPreview />
        </ScrollReveal>
        <ScrollReveal>
          <ReportPreview />
        </ScrollReveal>
        <ScrollReveal>
          <SafetySection />
        </ScrollReveal>
        <ScrollReveal>
          <FinalCTA />
        </ScrollReveal>
      </main>
      <LandingFooter />
    </div>
  );
};
