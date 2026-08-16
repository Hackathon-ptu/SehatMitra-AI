import React from 'react';
import { BaseComponentProps } from '../../types/common';
import { cn } from '../../utils/cn';

export interface PageContainerProps extends BaseComponentProps {
  as?: React.ElementType;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  as: Component = 'main',
}) => {
  return (
    <Component className={cn('w-full max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12', className)}>
      {children}
    </Component>
  );
};
