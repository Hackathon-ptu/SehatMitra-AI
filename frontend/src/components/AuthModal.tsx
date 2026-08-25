import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./common/Button";

const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "https://sehatmitra-ai.onrender.com/api/v1";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to extract a clean string from any backend error
const formatErrorMessage = (err: any): string => {
  const detail = err.response?.data?.detail;
  
  // If FastAPI returns an array of Pydantic validation errors
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || `${d.loc?.join(".")}: invalid`).join(", ");
  }
  
  // If detail is a single object
  if (typeof detail === "object" && detail !== null) {
    return detail.msg || JSON.stringify(detail);
  }
  
  // If detail is already a string
  if (typeof detail === "string") {
    return detail;
  }
  
  return err.message || "An unexpected error occurred.";
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithEmail, setUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(false);
      setStep("FORM");
      setError("");
      setSuccessMsg("");
      setName("");
      setEmail("");
      setPassword("");
      setOtp("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await axios.post(`${API_BASE_URL}/auth/send-otp`, { email, name, password });
        if (res.data.success) {
          setSuccessMsg(`OTP sent to ${email}. Check your inbox or Render logs.`);
          setStep("OTP");
        }
      } else {
        await loginWithEmail(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/verify-otp`, { email, otp });
      if (res.data.success) {
        setSuccessMsg("Account verified! Logging you in...");
        const userObj = { uid: email, email, displayName: name || email.split("@")[0] };
        localStorage.setItem("user", JSON.stringify(userObj));
        if (setUser) setUser(userObj);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>

        {step === "OTP" ? (
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-1">Verify Email</h3>
            <p className="text-xs text-slate-500 text-center mb-4">Enter the 6-digit code sent to <span className="font-semibold text-emerald-600">{email}</span></p>

            {error && <div className="mb-4 p-2.5 bg-red-50 text-red-600 rounded-xl text-xs">{error}</div>}
            {successMsg && <div className="mb-4 p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs">{successMsg}</div>}

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-2xl font-bold py-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <button type="button" onClick={() => setStep("FORM")} className="w-full text-xs text-slate-500 hover:text-slate-700 text-center block">
                ← Edit Details
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
              <button
                className={`flex-1 pb-3 text-center font-medium ${!isSignUp ? "border-b-2 border-emerald-600 text-emerald-600 font-semibold" : "text-slate-500"}`}
                onClick={() => { setIsSignUp(false); setError(""); }}
              >
                Sign In
              </button>
              <button
                className={`flex-1 pb-3 text-center font-medium ${isSignUp ? "border-b-2 border-emerald-600 text-emerald-600 font-semibold" : "text-slate-500"}`}
                onClick={() => { setIsSignUp(true); setError(""); }}
              >
                Sign Up
              </button>
            </div>

            {error && <div className="mb-4 p-2.5 bg-red-50 text-red-600 rounded-xl text-xs">{error}</div>}

            <form onSubmit={handleSendOTP} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vinit Kumar"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="mt-2 w-full"
              >
                {isSignUp ? "Send OTP" : "Sign In"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors focus:outline-none"
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
          </div>
        )}
      </div>
    </div>
  );
};
