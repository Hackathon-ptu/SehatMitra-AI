import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { ArrowRight } from 'lucide-react';

export const FinalCTA: React.FC = () => {
  return (
    <section className="w-full py-16 sm:py-20 bg-surface-bg border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
            Not sure where to start?
          </h2>
          <p className="text-body-md text-content-secondary leading-relaxed max-w-lg">
            Start with a conversation. Tell SehatMitra what’s bothering you.
          </p>
          <div className="pt-2">
            <Link to="/language">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start with SehatMitra
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
