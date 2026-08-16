import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="w-full bg-surface-card border-t border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white/20" />
              </div>
              <span className="font-bold text-base text-content-primary">
                SehatMitra <span className="text-brand-600 font-semibold">AI</span>
              </span>
            </div>
            <p className="text-xs text-content-muted">
              Simple, understandable healthcare guidance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-content-secondary font-medium">
            <a href="#safety" className="hover:text-brand-600 transition-colors">
              Safety
            </a>
            <Link to="/language" className="hover:text-brand-600 transition-colors">
              Language Settings
            </Link>
            <Link to="/report" className="hover:text-brand-600 transition-colors">
              Report Explanation
            </Link>
            <Link to="/design-system" className="hover:text-brand-600 transition-colors">
              Design System Showcase
            </Link>
          </div>

        </div>

        <div className="pt-6 border-t border-surface-border flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-content-muted">
          <p>© {new Date().getFullYear()} SehatMitra AI. All rights reserved.</p>
          <p className="text-center sm:text-right max-w-md">
            Medical Disclaimer: SehatMitra AI is an informational healthcare triage assistant. It does not provide medical diagnosis or emergency dispatch.
          </p>
        </div>
      </div>
    </footer>
  );
};
