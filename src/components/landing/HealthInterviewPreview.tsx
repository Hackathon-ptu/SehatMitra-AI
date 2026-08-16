import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Progress } from '../common/Progress';
import { Card } from '../common/Card';
import { ClipboardList, Check } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';

export const HealthInterviewPreview: React.FC = () => {
  const [selectedDuration, setSelectedDuration] = useState('4–7 days');

  const durationOptions = ['Today', '2–3 days', '4–7 days', 'More than a week'];

  return (
    <section id="features" className="w-full py-16 sm:py-20 bg-surface-card border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Feature Copy */}
          <ScrollReveal variant="fade-right" className="lg:col-span-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="teal">HERO FEATURE</Badge>
              <span className="text-xs text-content-muted font-medium">Guided Intake</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-content-primary">
              Not just a chatbot.
            </h2>

            <p className="text-body-lg text-content-secondary font-medium">
              SehatMitra asks follow-up questions to understand what’s actually going on.
            </p>

            <div className="p-4 rounded-md bg-surface-elevated border border-surface-border flex flex-col gap-2 my-2">
              <h3 className="text-sm font-bold text-content-primary">
                A few useful questions can change the picture.
              </h3>
              <p className="text-xs text-content-muted leading-relaxed">
                SehatMitra can ask about symptoms, duration, severity, and other relevant information before providing next-step guidance.
              </p>
            </div>
          </ScrollReveal>

          {/* Right Column: Realistic Health Interview Preview */}
          <ScrollReveal variant="fade-left" delay={200} className="lg:col-span-6 w-full flex justify-center">
            <Card variant="basic" padding="lg" className="w-full max-w-lg shadow-elevated flex flex-col gap-5 border-brand-200">
              
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-brand-50 text-brand-700">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-content-primary">
                    AI Health Interview Preview
                  </span>
                </div>
                <Badge variant="teal" size="sm">Step 2 of 4</Badge>
              </div>

              <Progress value={50} label="Intake Assessment Progress" showPercentage />

              {/* Question 1 */}
              <div className="flex flex-col gap-2.5 pt-1 text-left">
                <span className="text-xs text-content-muted uppercase font-semibold">Question 1</span>
                <p className="text-sm font-bold text-content-primary">
                  How long have you had the fever?
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {durationOptions.map((opt) => {
                    const isSelected = selectedDuration === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedDuration(opt)}
                        className={`p-2.5 rounded text-xs text-left font-medium border transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-600 text-brand-900 dark:text-brand-300 font-semibold shadow-subtle'
                            : 'bg-surface-card border-surface-border text-content-primary hover:bg-surface-elevated'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2 */}
              <div className="flex flex-col gap-2 pt-3 border-t border-surface-border text-left">
                <span className="text-xs text-content-muted uppercase font-semibold">Question 2</span>
                <p className="text-sm font-bold text-content-primary">
                  Are you having difficulty breathing?
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="px-4 py-1.5 rounded text-xs font-medium bg-surface-elevated border border-surface-border text-content-primary">
                    Yes
                  </span>
                  <span className="px-4 py-1.5 rounded text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 border border-brand-600 text-brand-900 dark:text-brand-300">
                    No
                  </span>
                </div>
              </div>

            </Card>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
};
