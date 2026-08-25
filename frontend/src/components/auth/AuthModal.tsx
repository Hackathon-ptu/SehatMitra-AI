import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile,
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult
} from "firebase/auth";
import { auth } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../common/Button";

const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "https://sehatmitra-ai.onrender.com/api/v1";

declare global {
  interface Window {
    phoneRecaptchaVerifier: any;
  }
}

export const AuthModal: React.FC = () => {
  const { authModalMode, hideAuthModal, loginWithGoogle, setUser } = useAuth();
  const [authType, setAuthType] = useState<"email" | "phone">("email");
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone fields
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    if (authModalMode) {
      setIsSignUp(authModalMode === 'signup');
      setAuthType("email");
      setError("");
      setSuccessMsg("");
      setName("");
      setEmail("");
      setPassword("");
      setPhoneNumber("+91");
      setOtpCode("");
      setConfirmationResult(null);
      setShowResend(false);

      // Initialize Recaptcha
      setTimeout(() => {
        const container = document.getElementById("recaptcha-phone-container-sub");
        if (container && !window.phoneRecaptchaVerifier) {
          try {
            window.phoneRecaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-phone-container-sub", {
              size: "invisible",
              callback: () => console.log("reCAPTCHA verified")
            });
          } catch (e) {
            console.error("Recaptcha initialization error:", e);
          }
        }
      }, 300);
    }
  }, [authModalMode]);

  if (!authModalMode) return null;

  const syncBackendSession = async (user: any, fallbackName?: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/firebase-login`, {
        uid: user.uid,
        email: user.email || `${user.phoneNumber}@phone.auth`,
        displayName: user.displayName || fallbackName || user.phoneNumber || "User"
      });

      const userPayload = res.data.user || {
        uid: user.uid,
        email: user.email || user.phoneNumber,
        displayName: user.displayName || fallbackName || user.phoneNumber
      };
      localStorage.setItem("user", JSON.stringify(userPayload));
      localStorage.setItem("sehat_user", JSON.stringify(userPayload));
      if (res.data.access_token) {
        localStorage.setItem("token", res.data.access_token);
      }
      if (setUser) setUser(userPayload);

      window.dispatchEvent(new Event("auth_state_changed"));
      window.dispatchEvent(new Event("storage"));
      hideAuthModal();
      window.location.reload();
    } catch (err) {
      console.error("Backend sync failed:", err);
      setError("Authenticated with Firebase, but failed to sync session with backend.");
    }
  };

  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number with country code (e.g. +91XXXXXXXXXX)");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      if (!window.phoneRecaptchaVerifier) {
        window.phoneRecaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-phone-container-sub", {
          size: "invisible",
          callback: () => console.log("reCAPTCHA verified")
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber.trim(), window.phoneRecaptchaVerifier);
      setConfirmationResult(confirmation);
      setSuccessMsg("SMS verification code sent successfully.");
    } catch (errorMsg: any) {
      console.error("Phone Auth Error:", errorMsg);
      setError(errorMsg.message || "Failed to send SMS code.");
      if (window.phoneRecaptchaVerifier) {
        try {
          const widgetId = await window.phoneRecaptchaVerifier.render();
          (window as any).grecaptcha?.reset(widgetId);
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !otpCode) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await confirmationResult.confirm(otpCode);
      await syncBackendSession(result.user, phoneNumber);
    } catch (errorMsg: any) {
      console.error("OTP Verify Error:", errorMsg);
      setError("Invalid 6-digit OTP code entered.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setShowResend(false);
    setLoading(true);

    try {
      if (isSignUp) {
        // Step A: Create User in Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Step B: Set Display Name
        await updateProfile(user, { displayName: name });

        // Step C: Send Official Firebase Verification Email
        await sendEmailVerification(user);

        // Step D: Force Sign Out (hard verification gate)
        await auth.signOut();

        setSuccessMsg(`Verification email sent to ${email}! Please click the link in your inbox before logging in.`);
        setIsSignUp(false); // Switch to Sign In tab
      } else {
        // Step A: Sign In with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Step B: Check Verification status
        if (!user.emailVerified) {
          await auth.signOut();
          setError("Your email is not verified yet. Please check your inbox or click 'Resend Verification'.");
          setShowResend(true);
          setLoading(false);
          return;
        }

        // Step C: Sync with Backend
        await syncBackendSession(user);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await auth.signOut();
      setSuccessMsg("Verification email resent successfully! Please check your inbox.");
      setShowResend(false);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      hideAuthModal();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
        <button onClick={hideAuthModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        
        {/* Invisible Recaptcha */}
        <div id="recaptcha-phone-container-sub"></div>

        <div>
          {/* Switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
            <button
              type="button"
              className={`flex-1 pb-3 text-center font-medium ${authType === "email" ? "border-b-2 border-emerald-600 text-emerald-600 font-semibold" : "text-slate-500"}`}
              onClick={() => { setAuthType("email"); setError(""); setSuccessMsg(""); }}
            >
              Email Auth
            </button>
            <button
              type="button"
              className={`flex-1 pb-3 text-center font-medium ${authType === "phone" ? "border-b-2 border-emerald-600 text-emerald-600 font-semibold" : "text-slate-500"}`}
              onClick={() => { setAuthType("phone"); setError(""); setSuccessMsg(""); }}
            >
              Phone OTP
            </button>
          </div>

          {error && <div className="mb-4 p-2.5 bg-red-50 text-red-600 rounded-xl text-xs">{error}</div>}
          {successMsg && <div className="mb-4 p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs">{successMsg}</div>}

          {authType === "phone" ? (
            <div>
              {!confirmationResult ? (
                <form onSubmit={handleSendPhoneOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+916280831790"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Include country code (e.g. +91 for India)</span>
                  </div>
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full"
                  >
                    Send Verification SMS
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Enter 6-Digit SMS Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Sent to {phoneNumber}</p>
                  </div>
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full"
                  >
                    Verify & Sign In
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirmationResult(null)}
                    className="w-full text-xs text-emerald-600 hover:underline text-center block mt-2 cursor-pointer focus:outline-none"
                  >
                    Change Phone Number
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-center gap-4 mb-4 text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`pb-1 border-b-2 ${!isSignUp ? "border-emerald-600 text-emerald-600" : "border-transparent"}`}
                >
                  Sign In Mode
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`pb-1 border-b-2 ${isSignUp ? "border-emerald-600 text-emerald-600" : "border-transparent"}`}
                >
                  Sign Up Mode
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {isSignUp ? "Sign Up" : "Sign In"}
                </Button>

                {showResend && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="w-full text-xs font-semibold text-emerald-600 hover:text-emerald-700 text-center underline cursor-pointer focus:outline-none mt-2 block"
                  >
                    Resend Verification Email
                  </button>
                )}
              </form>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};
