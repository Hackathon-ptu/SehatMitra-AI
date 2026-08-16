import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { HeroProductPreview } from './HeroProductPreview';
import { ArrowRight, ChevronDown } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="w-full pt-8 sm:pt-12 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 bg-surface-bg border-b border-surface-border">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Content Column (Left on Desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-5 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="teal" size="md">SEHATMITRA AI</Badge>
              <span className="text-xs text-content-muted font-medium">Healthcare Companion</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-content-primary leading-[1.15]">
              Tell us what’s bothering you.
            </h1>

            <p className="text-body-lg text-content-secondary max-w-2xl leading-relaxed">
              Talk to SehatMitra, answer a few simple questions, and understand what you should do next.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link to="/language" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start with SehatMitra
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                onClick={handleScrollToHowItWorks}
                rightIcon={<ChevronDown className="w-4 h-4 text-content-muted" />}
              >
                How it works
              </Button>
            </div>
          </div>

          {/* Product Preview Column (Right on Desktop) */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <HeroProductPreview />
          </div>

        </div>
      </div>
    </section>
  );
};
