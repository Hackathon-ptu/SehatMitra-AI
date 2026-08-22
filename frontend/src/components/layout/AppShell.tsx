import React from 'react';
import { BaseComponentProps } from '../../types/common';
import { PageMode } from '../../types/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { cn } from '../../utils/cn';

export interface AppShellProps extends BaseComponentProps {
  pageMode?: PageMode;
  showFooter?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  className,
  pageMode = 'marketing',
  showFooter = true,
}) => {
  return (
    <div className={cn('min-h-screen flex flex-col bg-surface-bg text-content-primary', className)}>
      <Navbar pageMode={pageMode} />
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
};
