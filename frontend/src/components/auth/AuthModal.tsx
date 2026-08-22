import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { X, Mail, Lock, User, Phone, AlertCircle, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '../common/Button';

export const AuthModal: React.FC = () => {
  const { authModalMode, hideAuthModal, login } = useAuth();
  
  // View states: 'login' | 'signup' | 'otp' | 'forgot-step-1' | 'forgot-step-2'
  const [viewMode, setViewMode] = useState<'login' | 'signup' | 'otp' | 'forgot-step-1' | 'forgot-step-2'>('login');
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup Form States (Step 1)
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [username, setUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Forgot Password States
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Automatically fetch username suggestions when name/email changes
  useEffect(() => {
    if (!fullName && !signupEmail) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await authService.suggestUsernames(fullName, signupEmail);
        if (res?.suggestions) {
          setSuggestions(res.suggestions);
        }
      } catch (e) {
        console.error("Error fetching username suggestions", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fullName, signupEmail]);

  // OTP Verification States (Step 2)
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

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

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const isOtpActive = viewMode === 'otp' || viewMode === 'forgot-step-2';
    if (isOtpActive && countdown > 0) {
      setCanResend(false);
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [viewMode, countdown]);

  if (!authModalMode) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await authService.login({
        identifier: loginIdentifier,
        password: loginPassword,
      });
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        login(data.access_token);
        hideAuthModal();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Incorrect credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Strict validations
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      setErrorMsg('Username must be 3-30 alphanumeric characters or underscores.');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number starting with 6-9');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = signupEmail.trim();
      const cleanPhone = phoneNumber.trim();
      const res = await authService.sendOTP(cleanEmail, cleanPhone);
      if (res && res.success) {
        setViewMode('otp');
        setCountdown(60);
        setCanResend(false);
        setSuccessMsg(`A 6-digit verification code has been dispatched to ${cleanEmail}`);
      } else {
        throw new Error(res?.message || 'Failed to generate verification code');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to generate verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await authService.verifyAndRegister({
        email: signupEmail,
        otp_code: otpCode,
        password: signupPassword,
        full_name: fullName,
        phone: phoneNumber,
        username: username,
      });

      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        login(data.access_token);
        hideAuthModal();
        alert(`Congratulations! Registration complete. Your Patient ID is: ${data.user?.patient_id}`);
      } else {
        setErrorMsg('Registration failed');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Actions
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanIdentifier = forgotIdentifier.trim();
      const res = await authService.forgotPassword(cleanIdentifier);
      if (res && res.success) {
        // Find user email from response or use identifier if it is email format
        const resolvedEmail = cleanIdentifier.includes('@') ? cleanIdentifier : (res.dev_otp ? res.dev_otp : cleanIdentifier);
        // We can check if backend returns success with verification details
        setForgotEmail(cleanIdentifier.includes('@') ? cleanIdentifier : resolvedEmail);
        setViewMode('forgot-step-2');
        setCountdown(60);
        setCanResend(false);
        setSuccessMsg(`A 6-digit password reset code has been generated. check console or email.`);
      } else {
        throw new Error(res?.message || 'Failed to dispatch reset code');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'No account associated with this email or username was found.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtpCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authService.resetPassword(forgotEmail, forgotOtpCode, newPassword);
      if (res && res.success) {
        alert('Your password has been successfully reset. You may now login.');
        setLoginIdentifier(forgotEmail);
        setViewMode('login');
      } else {
        throw new Error(res?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Reset password failed. Check your OTP code.');
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
            {viewMode === 'otp' && 'Verify Your Email'}
            {viewMode === 'forgot-step-1' && 'Recover Password'}
            {viewMode === 'forgot-step-2' && 'Reset Password'}
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
                <label className="text-xs font-semibold text-content-secondary">Email, Phone, or Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Enter email, phone, or username"
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
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          )}

          {viewMode === 'otp' && (
            /* Registration Step 2: OTP Verification */
            <form onSubmit={handleVerifyAndRegister} className="flex flex-col gap-4">
              <div className="text-center text-xs text-content-secondary mb-2">
                We have sent an authentication code to <strong>{signupEmail}</strong>. Please enter it below to complete registration.
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">6-Digit Verification Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-4 py-2 border text-center tracking-[1em] text-lg font-bold border-surface-border bg-surface-elevated rounded-lg text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Register
              </Button>

              <div className="text-center mt-3">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                  >
                    Resend Verification OTP
                  </button>
                ) : (
                  <span className="text-xs text-content-muted">
                    Resend code in {countdown}s
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewMode('signup')}
                className="text-xs text-content-secondary hover:underline mt-1"
              >
                ← Go back and edit details
              </button>
            </form>
          )}

          {viewMode === 'signup' && (
            /* Registration Step 1: Account Details */
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
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
                <label className="text-xs font-semibold text-content-secondary">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Select unique username (e.g. john_12)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                    <span className="text-[10px] text-content-muted">Suggestions:</span>
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setUsername(sug)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                )}
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
                <label className="text-xs font-semibold text-content-secondary">Phone Number (Indian)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit Indian phone (e.g. 9876543210)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
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
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Verification Code
              </Button>
            </form>
          )}

          {viewMode === 'forgot-step-1' && (
            /* Forgot Password: Step 1 (Identifier) */
            <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
              <div className="text-xs text-content-secondary leading-relaxed text-center mb-2">
                Enter your registered Email Address or Username. We will generate and dispatch a password reset code.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Username or Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username or email"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Code
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

          {viewMode === 'forgot-step-2' && (
            /* Forgot Password: Step 2 (Reset Code & New Password) */
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
              <div className="text-xs text-content-secondary leading-relaxed text-center mb-2">
                Enter the 6-digit code sent to your registered email address along with your new password.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">6-Digit Reset Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-4 py-2 border text-center tracking-[1em] text-lg font-bold border-surface-border bg-surface-elevated rounded-lg text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-content-secondary">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-surface-border bg-surface-elevated rounded-lg text-sm text-content-primary focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary focus:outline-none"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset Password
              </Button>

              <button
                type="button"
                onClick={() => setViewMode('forgot-step-1')}
                className="text-xs text-content-secondary hover:underline mt-1 text-center"
              >
                ← Go back and request a new code
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
