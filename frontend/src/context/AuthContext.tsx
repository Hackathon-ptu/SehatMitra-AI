import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

export interface UserPayload {
  id?: number;
  email: string;
  role: string;
  full_name?: string;
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
  login: (token: string, user?: UserPayload) => void;
  logout: () => void;
  showAuthModal: (mode: 'login' | 'signup') => void;
  hideAuthModal: () => void;
  authModalMode: 'login' | 'signup' | null;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: UserPayload) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe Base64 JWT decoder helper
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
    return {
      email: decoded.sub || '',
      role: decoded.role || '',
    };
  } catch (e) {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserPayload | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);

  const fetchProfile = async (authToken: string) => {
    try {
      const data = await authService.getMe();
      if (data) {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
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

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      await fetchProfile(savedToken);
    }
  };

  // Synchronize with localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    }
  }, []);

  const login = (newToken: string, newUser?: UserPayload) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      fetchProfile(newToken);
    }
    setAuthModalMode(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: UserPayload) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
        login,
        logout,
        showAuthModal,
        hideAuthModal,
        authModalMode,
        refreshUser,
        updateUser,
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
