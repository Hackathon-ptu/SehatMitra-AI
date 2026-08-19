import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { X, Mail, Lock, User, Phone, Briefcase, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';

export const AuthModal: React.FC = () => {
  const { authModalMode, hideAuthModal, login } = useAuth();
  const [isLogin, setIsLogin] = useState(authModalMode === 'login');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup Form States
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('patient');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync mode state when trigger opens
  React.useEffect(() => {
    if (authModalMode) {
      setIsLogin(authModalMode === 'login');
      setErrorMsg(null);
    }
  }, [authModalMode]);

  if (!authModalMode) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await authService.login({
        email: loginEmail,
        password: loginPassword,
      });
      if (data?.access_token) {
        // Store received access_token in localStorage and update UI state immediately
        localStorage.setItem('token', data.access_token);
        login(data.access_token);
        hideAuthModal();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Incorrect email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await authService.signup({
        full_name: fullName,
        email: signupEmail,
        password: signupPassword,
        phone_number: phoneNumber || null,
        role: role,
      });

      // Automatically login after successful signup
      const data = await authService.login({
        email: signupEmail,
        password: signupPassword,
      });
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        login(data.access_token);
        hideAuthModal();
      } else {
        setErrorMsg('Account created successfully. Please login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Registration failed. Email might already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-content-primary">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={hideAuthModal}
            className="p-1.5 rounded-full hover:bg-surface-elevated text-content-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
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

              <div className="flex flex-col gap-1.5 text-left">
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

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-content-secondary">Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none appearance-none"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          )}
        </div>

        {/* Footer Toggle */}
        <div className="p-4 border-t border-surface-border bg-surface-elevated text-center text-xs text-content-secondary">
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrorMsg(null);
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
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                className="font-bold text-brand-600 hover:text-brand-700 underline"
              >
                Sign In
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
