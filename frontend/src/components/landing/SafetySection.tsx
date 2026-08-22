import React from 'react';
import { ShieldCheck, HeartHandshake, UserCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { ScrollReveal } from '../common/ScrollReveal';

export const SafetySection: React.FC = () => {
  return (
    <section id="safety" className="w-full py-16 sm:py-20 bg-surface-card border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="zoom-in" className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
          
          <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Clinical Responsibility
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
              Guidance, not a diagnosis.
            </h2>
          </div>

          <p className="text-body-lg text-content-secondary leading-relaxed max-w-2xl">
            SehatMitra is designed to help you understand your health information and decide what to do next. It does not replace professional medical evaluation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left mt-2">
            <ScrollReveal variant="fade-right" delay={100}>
              <Card variant="basic" padding="sm" className="flex items-start gap-3 h-full">
                <HeartHandshake className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-content-primary">Supplements Care</span>
                  <p className="text-xs text-content-muted leading-relaxed">
                    Helps organize your symptoms before consulting a certified physician.
                  </p>
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal variant="fade-left" delay={200}>
              <Card variant="basic" padding="sm" className="flex items-start gap-3 h-full">
                <UserCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-content-primary">Patient Safety First</span>
                  <p className="text-xs text-content-muted leading-relaxed">
                    Always directs critical symptoms to local emergency services immediately.
                  </p>
                </div>
              </Card>
            </ScrollReveal>
          </div>

        </ScrollReveal>
      </div>
    </section>
  );
};
