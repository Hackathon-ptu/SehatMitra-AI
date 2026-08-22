import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export const LanguageHeader: React.FC = () => {
  return (
    <header className="w-full bg-surface-card/95 backdrop-blur border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white transition-colors group-hover:bg-brand-700 shadow-subtle">
            <Heart className="w-4.5 h-4.5 fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
          </div>
        </Link>

        {/* Back Link & Theme Toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-content-muted hover:text-brand-600 transition-colors py-1.5 px-2.5 rounded-md hover:bg-surface-elevated"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to landing page</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
