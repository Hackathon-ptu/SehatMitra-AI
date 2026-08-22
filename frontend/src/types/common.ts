import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'emergency';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 
  | 'teal' 
  | 'blue' 
  | 'neutral' 
  | 'error' 
  | 'warning' 
  | 'success'
  | 'emergency'
  | 'government'
  | 'private'
  | 'processing'
  | 'ready'
  | 'offline';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface LoadingStateProps extends BaseComponentProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface EmptyStateProps extends BaseComponentProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ReactNode;
}

export interface ErrorStateProps extends BaseComponentProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export interface ProgressProps extends BaseComponentProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
}
