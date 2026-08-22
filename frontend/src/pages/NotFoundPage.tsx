import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-bg text-content-primary p-4">
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-lg p-8 shadow-elevated flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
          <Heart className="w-7 h-7 fill-white/20" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
            404 — Page Not Found
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            We couldn’t find that page.
          </h1>
          <p className="text-xs text-content-muted leading-relaxed">
            The page or route you entered doesn’t exist or has moved. Let’s get you back to SehatMitra.
          </p>
        </div>

        <Link to="/" className="w-full pt-2">
          <Button variant="primary" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to SehatMitra
          </Button>
        </Link>
      </div>
    </div>
  );
};
