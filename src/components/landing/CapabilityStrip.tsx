import React from 'react';
import { Globe, Mic, ClipboardList, FileText } from 'lucide-react';
import { CAPABILITY_ITEMS } from '../../data/landingData';
import { ScrollReveal } from '../common/ScrollReveal';

export const CapabilityStrip: React.FC = () => {
  const iconMap: Record<string, React.ReactNode> = {
    Globe: <Globe className="w-5 h-5 text-brand-600 shrink-0" />,
    Mic: <Mic className="w-5 h-5 text-brand-600 shrink-0" />,
    ClipboardList: <ClipboardList className="w-5 h-5 text-brand-600 shrink-0" />,
    FileText: <FileText className="w-5 h-5 text-brand-600 shrink-0" />,
  };

  return (
    <section className="w-full py-8 sm:py-10 bg-surface-card border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {CAPABILITY_ITEMS.map((item, idx) => {
            const delay = (idx === 0 ? 0 : idx === 1 ? 100 : idx === 2 ? 200 : 300) as 0 | 100 | 200 | 300;
            return (
              <ScrollReveal key={item.id} variant="fade-up" delay={delay}>
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2 rounded-md bg-brand-50 border border-brand-200 shrink-0 mt-0.5">
                    {iconMap[item.iconName]}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-content-primary">
                      {item.title}
                    </span>
                    <p className="text-xs text-content-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
