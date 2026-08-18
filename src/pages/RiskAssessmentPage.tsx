import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RiskLevel } from '../types/risk';
import { MOCK_RISK_ASSESSMENTS } from '../data/mockRisk';
import { STORAGE_KEY_LANGUAGE, AVAILABLE_LANGUAGES } from '../data/languageData';
import { RiskHeader } from '../components/risk/RiskHeader';
import { RiskLoadingState } from '../components/risk/RiskLoadingState';
import { RiskResult } from '../components/risk/RiskResult';
import { RiskReasons } from '../components/risk/RiskReasons';
import { NextStep } from '../components/risk/NextStep';
import { InformationConsidered } from '../components/risk/InformationConsidered';
import { SafetyDisclaimer } from '../components/risk/SafetyDisclaimer';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { cn } from '../utils/cn';

export const RiskAssessmentPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();
  
  // Try to load assessment from location state, fallback to mock based on level
  const passedAssessment = location.state?.assessment;
  const [activeLevel, setActiveLevel] = useState<RiskLevel>(passedAssessment?.level || 'high');
  const [languageName, setLanguageName] = useState<string>('English');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const code = localStorage.getItem(STORAGE_KEY_LANGUAGE) || 'en';
      const found = AVAILABLE_LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageName(found.nativeName);
      }
    } catch {
      setLanguageName('English');
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const assessment = passedAssessment || MOCK_RISK_ASSESSMENTS[activeLevel];

  // Store the active risk level in localStorage for the hospital page
  useEffect(() => {
    if (assessment?.level) {
      localStorage.setItem('risk_level', assessment.level);
    }
  }, [assessment]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary transition-colors">
      <RiskHeader
        onBack={() => navigate('/health-interview')}
        selectedLanguageName={languageName}
      />

      <main className="flex-1 w-full max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col">
        {isLoading ? (
          <RiskLoadingState />
        ) : (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 my-auto">
            
            {/* Dev Mode Risk Level Switcher */}
            <div className="w-full p-2 rounded-md bg-surface-card border border-surface-border flex flex-wrap items-center justify-between gap-2 text-xs shadow-subtle">
              <span className="font-semibold text-content-muted px-2">
                Preview Risk State:
              </span>
              <div className="flex items-center gap-1">
                {(['low', 'moderate', 'high', 'emergency'] as RiskLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveLevel(lvl)}
                    className={cn(
                      'px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[11px] transition-colors',
                      activeLevel === lvl
                        ? 'bg-brand-600 text-white shadow-subtle'
                        : 'bg-surface-elevated text-content-secondary hover:bg-brand-50 hover:text-brand-600 border border-surface-border'
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Intro Context */}
            <ScrollReveal className="flex flex-col gap-1 text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
                Here’s what your answers suggest.
              </h1>
              <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
                This is guidance about how urgently you may want to seek care. It is not a diagnosis.
              </p>
            </ScrollReveal>

            {/* Prominent Categorical Risk Result */}
            <ScrollReveal delay={100}>
              <RiskResult
                level={assessment.level}
                summary={assessment.summary}
              />
            </ScrollReveal>

            {/* Why This Result */}
            <ScrollReveal delay={100}>
              <RiskReasons reasons={assessment.reasons} />
            </ScrollReveal>

            {/* What To Do Next */}
            <ScrollReveal delay={200}>
              <NextStep
                level={assessment.level}
                title={assessment.recommendationTitle}
                description={assessment.recommendationDescription}
                primaryActionLabel={assessment.primaryActionLabel}
                primaryActionRoute={assessment.primaryActionRoute}
                secondaryActionLabel={assessment.secondaryActionLabel}
                onSecondaryAction={() => navigate('/health-interview')}
              />
            </ScrollReveal>

            {/* Information Considered */}
            <ScrollReveal delay={200}>
              <InformationConsidered items={assessment.informationConsidered} />
            </ScrollReveal>

            {/* Contextual Safety Disclaimer */}
            <ScrollReveal delay={300} className="pt-2">
              <SafetyDisclaimer />
            </ScrollReveal>

          </div>
        )}
      </main>
    </div>
  );
};
