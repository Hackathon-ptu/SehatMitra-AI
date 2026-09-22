/**
 * AuthSessionBadge
 *
 * Displays a small contextual badge indicating whether the current session
 * is persisted to the user's Health History or is ephemeral (guest mode).
 *
 * Usage:
 *   <AuthSessionBadge />
 *
 * Props (all optional):
 *   className – extra Tailwind classes for the wrapping element.
 *   showLoginCta – when true (default) shows a "Login" link for guests.
 */

import React from 'react';
import { ShieldCheck, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface AuthSessionBadgeProps {
  className?: string;
  /** Show a clickable "Login to save" CTA when the user is a guest. Defaults to true. */
  showLoginCta?: boolean;
}

export const AuthSessionBadge: React.FC<AuthSessionBadgeProps> = ({
  className,
  showLoginCta = true,
}) => {
  const { isAuthenticated, user, showAuthModal } = useAuth();

  if (isAuthenticated) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
          'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
          'border border-emerald-200 dark:border-emerald-800',
          className,
        )}
        title={`Saving to health history for ${user?.email ?? 'your account'}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Synced to Health History</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
        'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
        'border border-amber-200 dark:border-amber-800',
        className,
      )}
      title="Guest session — data is not saved to any database"
    >
      <EyeOff className="w-3.5 h-3.5 shrink-0" />
      <span>Guest Session&nbsp;·&nbsp;History not saved</span>
      {showLoginCta && (
        <button
          onClick={() => showAuthModal('login')}
          className="ml-1 inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          aria-label="Login to save your health history"
        >
          <LogIn className="w-3 h-3" />
          Login
        </button>
      )}
    </div>
  );
};

export default AuthSessionBadge;
