import React from 'react';
import { HOW_IT_WORKS_STEPS } from '../../data/landingData';
import { MessageSquare, ClipboardCheck, ArrowRightLeft } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';

export const HowItWorks: React.FC = () => {
  const iconList = [
    <MessageSquare className="w-5 h-5 text-brand-600" />,
    <ClipboardCheck className="w-5 h-5 text-brand-600" />,
    <ArrowRightLeft className="w-5 h-5 text-brand-600" />,
  ];

  return (
    <section id="how-it-works" className="w-full py-16 sm:py-20 bg-surface-bg border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <ScrollReveal variant="fade-up" className="flex flex-col gap-2 max-w-2xl mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Guided User Flow
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
            How SehatMitra helps
          </h2>
          <p className="text-body-md text-content-muted">
            Start with a conversation. We’ll help you work through the next steps.
          </p>
        </ScrollReveal>

        {/* Sequential Progression with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const delay = (index === 0 ? 100 : index === 1 ? 200 : 300) as 100 | 200 | 300;
            return (
              <ScrollReveal
                key={step.stepNumber}
                variant="fade-up"
                delay={delay}
                className="h-full"
              >
                <div className="flex flex-col gap-3 p-6 rounded-md bg-surface-card border border-surface-border shadow-subtle relative h-full text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-brand-600/40 font-mono">
                      {step.stepNumber}
                    </span>
                    <div className="p-2 rounded bg-brand-50 border border-brand-200">
                      {iconList[index]}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <h3 className="text-lg font-bold text-content-primary">
                      {step.title}
                    </h3>
                    <span className="text-xs font-semibold text-brand-700">
                      {step.subtitle}
                    </span>
                  </div>

                  <p className="text-xs text-content-muted leading-relaxed mt-1">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
