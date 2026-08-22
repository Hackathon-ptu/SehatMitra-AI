import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
  isDark: boolean;
}

const STORAGE_KEY_THEME = 'sehatmitra-theme-mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeDark = false;
      if (mode === 'dark') {
        activeDark = true;
      } else if (mode === 'light') {
        activeDark = false;
      } else {
        // System preference
        activeDark = mediaQuery.matches;
      }

      setIsDark(activeDark);
      if (activeDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        body.classList.add('dark');
        body.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        body.classList.add('light');
        body.classList.remove('dark');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (mode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newMode);
    } catch {
      // Fallback
    }
  };

  const cycleMode = () => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, cycleMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
