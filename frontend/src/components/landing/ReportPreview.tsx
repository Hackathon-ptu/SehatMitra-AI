import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';

export const ReportPreview: React.FC = () => {
  return (
    <section className="w-full py-16 sm:py-20 bg-surface-bg border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Product Preview (Alternated Layout) */}
          <ScrollReveal variant="fade-right" delay={200} className="lg:col-span-6 w-full flex justify-center order-2 lg:order-1">
            <Card variant="basic" padding="lg" className="w-full max-w-lg shadow-elevated flex flex-col gap-4 border-surface-border">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-medical-50 dark:bg-medical-950/60 text-medical-700 dark:text-medical-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-content-primary">
                    Report Explanation Preview
                  </span>
                </div>
                <Badge variant="blue" size="sm">CBC Report Scan</Badge>
              </div>

              {/* Parsed Lab Value Item */}
              <div className="p-4 rounded-md bg-surface-card border border-surface-border flex flex-col gap-2.5 shadow-subtle text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-content-primary">Hemoglobin (Hb)</span>
                  <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3 text-amber-700" />}>
                    Below typical range
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-lg font-extrabold text-content-primary">
                    9.2 <span className="text-xs font-normal text-content-muted">g/dL</span>
                  </span>
                  <span className="text-content-muted">
                    Reference: <strong className="text-content-secondary">12.0 - 15.5 g/dL</strong>
                  </span>
                </div>

                <div className="p-3 rounded bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 leading-relaxed mt-1">
                  💡 <strong>Plain English Explanation:</strong> Your hemoglobin value is lower than the usual reference range.
                </div>
              </div>

              <div className="p-3 rounded bg-surface-elevated text-xs text-content-muted leading-relaxed text-left">
                🩺 <strong>Next Step:</strong> Discuss this result with a healthcare professional during your consultation.
              </div>
            </Card>
          </ScrollReveal>

          {/* Right Column: Copy & Action */}
          <ScrollReveal variant="fade-left" className="lg:col-span-6 flex flex-col gap-4 text-left order-1 lg:order-2">
            <div className="flex items-center gap-2">
              <Badge variant="blue">REPORT PARSER</Badge>
              <span className="text-xs text-content-muted font-medium">Simple Translation</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-content-primary">
              Medical reports shouldn’t feel like another language.
            </h2>

            <p className="text-body-lg text-content-secondary leading-relaxed">
              Upload a report and understand important values in simpler language.
            </p>

            <div className="pt-2">
              <Link to="/report">
                <Button variant="secondary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explain my report
                </Button>
              </Link>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
};
