import React, { createContext, useContext, useState, useEffect } from 'react';

import API_BASE_URL from '../config/api';
import { authService } from '../services/api';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";

// Centralized fetch utility that automatically attaches JWT Authorization header
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const fullUrl = `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  const response = await fetch(fullUrl, { ...options, headers });
  return response;
};

export interface UserPayload {
  id?: number;
  email: string;
  role: string;
  full_name?: string;
  /** Deterministic ABHA/patient ID — same as patient_id */
  abha_id?: string;
  patient_id?: string;
  is_profile_completed?: boolean;
  username?: string;
  phone?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  village_town?: string;
  district?: string;
  state?: string;
  pincode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  chronic_conditions?: string[];
  allergies?: string[];
}

interface AuthContextType {
  token: string | null;
  user: UserPayload | null;
  isAuthenticated: boolean;
  /** True while the initial Firebase auth state + token validation is in flight. */
  loading: boolean;
  login: (token: string, user?: UserPayload) => void;
  logout: () => Promise<void>;
  showAuthModal: (mode: 'login' | 'signup') => void;
  hideAuthModal: () => void;
  authModalMode: 'login' | 'signup' | null;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: UserPayload) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe Base64 JWT decoder helper.
// NOTE: our JWTs use `sub = str(user.id)` (an integer string), NOT the email.
// Always prefer the `email` claim when available; never use `sub` as an email.
const decodeToken = (token: string): { email: string; role: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    // `sub` is the numeric user ID; use explicit `email` claim if present
    const email = decoded.email || (decoded.sub && decoded.sub.includes('@') ? decoded.sub : '');
    return {
      email,
      role: decoded.role || 'patient',
    };
  } catch (e) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Synchronous localStorage hydration helpers — run BEFORE first render so that
// components never see a transient (null, null, loading=true) state when the
// user already has a valid cached session.
//
// Auth isolation: ASHA workers authenticate via sessionStorage only (keys
// asha_token / asha_worker). If a stale ASHA-role object somehow ended up in
// the citizen localStorage keys, we discard it here so the citizen context
// is never corrupted by an ASHA session.
// ---------------------------------------------------------------------------
const getInitialToken = (): string | null =>
  localStorage.getItem('token') || localStorage.getItem('access_token') || null;

const getInitialUser = (): UserPayload | null => {
  try {
    // Prefer the richer 'sehat_user' key; fall back to legacy 'user'
    const cached = localStorage.getItem('sehat_user') || localStorage.getItem('user');
    if (!cached) return null;
    const parsed = JSON.parse(cached) as UserPayload;
    // Reject ASHA-role objects — they belong in sessionStorage, not here.
    if ((parsed.role || '').toLowerCase() === 'asha') {
      localStorage.removeItem('sehat_user');
      localStorage.removeItem('user');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize synchronously from cache — eliminates the null flash on first render.
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [user, setUser] = useState<UserPayload | null>(getInitialUser);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  // loading=true ONLY when we have a token but no cached user yet — i.e., we still
  // need a backend round-trip to validate/fetch the full profile.
  // If we already hydrated the user from cache, skip the loading spinner entirely.
  const [loading, setLoading] = useState<boolean>(!getInitialUser() && !!getInitialToken());

  const fetchProfile = async (authToken: string) => {
    try {
      const data = await authService.getMe();
      if (data) {
        setUser(data);
        // Write to both keys so hydration helpers always find a warm cache
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('sehat_user', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
      // Fallback to token decoded basic info
      const payload = decodeToken(authToken);
      if (payload) {
        setUser({ email: payload.email, role: payload.role });
      }
    }
  };

  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      const res = await authService.firebaseLogin({
        email: firebaseUser.email || "",
        full_name: firebaseUser.displayName || "",
      });
      if (res?.access_token) {
        setToken(res.access_token);
        setUser(res.user);
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('sehat_user', JSON.stringify(res.user));
      }
    } catch (err) {
      console.error("Failed to sync Firebase user with backend", err);
    }
  };

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (savedToken) {
      await fetchProfile(savedToken);
    }
  };

  // Synchronize with Firebase & localStorage on mount.
  // loading stays true until this callback finishes so that downstream
  // consumers never see a transient "not authenticated" flash.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        const isGoogleUser = currentUser?.providerData.some(p => p.providerId === "google.com");
        const isVerified = currentUser && (currentUser.emailVerified || isGoogleUser);

        if (isVerified) {
          localStorage.setItem("user_id", currentUser.uid);
          localStorage.setItem("user_email", currentUser.email || "");

          const savedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
          if (!savedToken) {
            await syncWithBackend(currentUser);
          } else {
            setToken(savedToken);
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            } else {
              await fetchProfile(savedToken);
            }
          }
        } else {
          // No verified Firebase user — but only clear state if there is no
          // persisted backend token (e.g. email/password login without Firebase).
          const savedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
          if (savedToken) {
            // Backend-only session: restore state from localStorage
            setToken(savedToken);
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            } else {
              await fetchProfile(savedToken);
            }
          } else {
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_email");
            localStorage.removeItem("token");
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            localStorage.removeItem("sehat_user");
            setToken(null);
            setUser(null);
            window.dispatchEvent(new Event("auth_state_changed"));
            window.dispatchEvent(new Event("storage"));
          }
        }
      } finally {
        // Always mark loading complete once the first auth check is done
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = (newToken: string, newUser?: UserPayload) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setLoading(false);
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('sehat_user', JSON.stringify(newUser));
    } else {
      fetchProfile(newToken);
    }
    setAuthModalMode(null);
    // Notify all components (e.g. HistoryDashboard) that auth state changed
    window.dispatchEvent(new Event('auth_state_changed'));
    window.dispatchEvent(new Event('storage'));
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await syncWithBackend(cred.user);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      await syncWithBackend(cred.user);
    }
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      await syncWithBackend(cred.user);
    }
  };

  const logout = async () => {
    await signOut(auth);
    // Clear all persisted auth data (both legacy and new keys)
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('sehat_user');
  };

  const updateUser = (updatedUser: UserPayload) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('sehat_user', JSON.stringify(updatedUser));
  };

  const showAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
  };

  const hideAuthModal = () => {
    setAuthModalMode(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        showAuthModal,
        hideAuthModal,
        authModalMode,
        refreshUser,
        updateUser,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
