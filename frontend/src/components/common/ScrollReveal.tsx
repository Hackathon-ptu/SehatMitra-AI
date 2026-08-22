import React, { useEffect, useRef, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type ScrollRevealVariant = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in';

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: ScrollRevealVariant;
  delay?: 0 | 100 | 200 | 300 | 400 | 500;
  threshold?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  variant = 'fade-up',
  delay = 0,
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if element is already in viewport on initial load
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const timer = setTimeout(() => {
        el.classList.add('is-revealed');
      }, delay);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-revealed');
            if (once) observer.unobserve(el);
          } else if (!once) {
            el.classList.remove('is-revealed');
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, delay]);

  const variantClass = `reveal-${variant}`;
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : '';

  return (
    <div ref={ref} className={cn('reveal', variantClass, delayClass, className)}>
      {children}
    </div>
  );
};
