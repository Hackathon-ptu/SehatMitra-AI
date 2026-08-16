import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck } from 'lucide-react';
import { APP_METADATA } from '../../data/mockData';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-card border-t border-surface-border mt-auto">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center text-white">
                <Heart className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-content-primary">
                SehatMitra <span className="text-brand-600">AI</span>
              </span>
            </div>
            <p className="text-xs text-content-muted max-w-md leading-relaxed">
              {APP_METADATA.tagline}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded w-fit mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 0 — Frontend Foundation Architecture</span>
            </div>
          </div>

          {/* Quick Routes */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-primary">
              Core Modules
            </span>
            <Link to="/chat" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              AI Health Assistant
            </Link>
            <Link to="/health-interview" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              Health Interview
            </Link>
            <Link to="/risk-assessment" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              Risk Assessment
            </Link>
          </div>

          {/* Additional Routes */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-primary">
              Services
            </span>
            <Link to="/hospitals" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              Hospital Finder
            </Link>
            <Link to="/report" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              Report Explanation
            </Link>
            <Link to="/language" className="text-xs text-content-muted hover:text-brand-600 transition-colors">
              Language Settings
            </Link>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 border-t border-surface-border flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-content-muted">
          <p>
            © {new Date().getFullYear()} SehatMitra AI. Built with React, TypeScript & Tailwind CSS.
          </p>
          <p className="text-center sm:text-right max-w-md">
            <strong>Medical Disclaimer:</strong> SehatMitra AI is an assistant tool for informational triage only and does not provide formal medical diagnosis or emergency treatment.
          </p>
        </div>
      </div>
    </footer>
  );
};
