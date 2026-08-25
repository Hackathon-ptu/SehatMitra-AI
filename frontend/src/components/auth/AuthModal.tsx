import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../common/Button';

export const AuthModal: React.FC = () => {
  const { authModalMode, hideAuthModal, loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  
  // View states: 'login' | 'signup' | 'forgot-step-1'
  const [viewMode, setViewMode] = useState<'login' | 'signup' | 'forgot-step-1'>('login');
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup Form States
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot Password States
  const [forgotIdentifier, setForgotIdentifier] = useState('');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode state when trigger opens
  useEffect(() => {
    if (authModalMode) {
      setViewMode(authModalMode === 'login' ? 'login' : 'signup');
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowLoginPassword(false);
      setShowSignupPassword(false);
    }
  }, [authModalMode]);

  if (!authModalMode) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await loginWithEmail(loginIdentifier, loginPassword);
      hideAuthModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Incorrect credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = signupEmail.trim();
      await signupWithEmail(cleanEmail, signupPassword, fullName);
      hideAuthModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await loginWithGoogle();
      hideAuthModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-content-primary">
            {viewMode === 'login' && 'Welcome Back'}
            {viewMode === 'signup' && 'Create Account'}
            {viewMode === 'forgot-step-1' && 'Recover Password'}
          </h2>
          <button
            onClick={hideAuthModal}
            className="p-1.5 rounded-full hover:bg-surface-elevated text-content-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switching */}
        {(viewMode === 'login' || viewMode === 'signup') && (
          <div className="flex border-b border-surface-border">
            <button
              onClick={() => {
                setViewMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
                viewMode === 'login'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setViewMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
                viewMode === 'signup'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === 'login' && (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-content-secondary">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(loginIdentifier);
                      setViewMode('forgot-step-1');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary focus:outline-none"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="mt-2 w-full"
              >
                Sign In
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-card px-2 text-content-muted">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2 border border-surface-border rounded-lg bg-surface-elevated hover:bg-surface-hover text-sm font-semibold text-content-primary transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.5l3.9 3.03C6.27 7.74 8.9 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.45c-.29 1.48-1.14 2.73-2.4 3.58l3.72 2.88c2.18-2 3.72-4.94 3.72-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.53c-.24-.72-.38-1.5-.38-2.3 0-.8.14-1.57.38-2.3L1.39 6.9C.5 8.7 0 10.7 0 12.8s.5 4.1 1.39 5.9l3.9-3.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.72-2.88c-1.04.69-2.38 1.11-4.24 1.11-3.1 0-5.73-2.7-6.71-5.49L1.39 16c1.98 3.85 5.96 6.5 10.61 6.5z"
                  />
                </svg>
                Google
              </button>
            </form>
          )}

          {viewMode === 'signup' && (
            /* Signup Form */
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary focus:outline-none"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="mt-2 w-full"
              >
                Sign Up
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface-card px-2 text-content-muted">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2 border border-surface-border rounded-lg bg-surface-elevated hover:bg-surface-hover text-sm font-semibold text-content-primary transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.5l3.9 3.03C6.27 7.74 8.9 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.45c-.29 1.48-1.14 2.73-2.4 3.58l3.72 2.88c2.18-2 3.72-4.94 3.72-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.53c-.24-.72-.38-1.5-.38-2.3 0-.8.14-1.57.38-2.3L1.39 6.9C.5 8.7 0 10.7 0 12.8s.5 4.1 1.39 5.9l3.9-3.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.72-2.88c-1.04.69-2.38 1.11-4.24 1.11-3.1 0-5.73-2.7-6.71-5.49L1.39 16c1.98 3.85 5.96 6.5 10.61 6.5z"
                  />
                </svg>
                Google
              </button>
            </form>
          )}

          {viewMode === 'forgot-step-1' && (
            /* Forgot Password: Step 1 (Identifier) */
            <form onSubmit={(e) => { e.preventDefault(); setErrorMsg("Password recovery is managed by Firebase. Please request reset on Firebase console or use direct email resets."); }} className="flex flex-col gap-4">
              <div className="text-xs text-content-secondary leading-relaxed text-center mb-2">
                Enter your registered Email Address. We will generate and dispatch a password reset link.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="mt-2 w-full"
              >
                Send Reset Link
              </Button>

              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="text-xs text-center text-brand-600 font-bold hover:text-brand-700 underline mt-2"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>

        {/* Footer Toggle */}
        {(viewMode === 'login' || viewMode === 'signup') && (
          <div className="p-4 border-t border-surface-border bg-surface-elevated text-center text-xs text-content-secondary">
            {viewMode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setViewMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
