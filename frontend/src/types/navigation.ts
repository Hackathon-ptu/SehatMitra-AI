import { ReactNode } from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
  badge?: string;
  isExternal?: boolean;
}

export type PageMode = 'marketing' | 'application';
