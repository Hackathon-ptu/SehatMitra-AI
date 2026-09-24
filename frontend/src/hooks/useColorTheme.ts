import { useEffect, useState, type MouseEvent } from 'react';
import { toggleThemeWithReveal } from '../utils/themeTransition';

export type ColorTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const readTheme = (): ColorTheme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

/**
 * Site-wide light/dark theme shared by the citizen app and the ASHA portal.
 * Persists under the same key, so switching in one place carries over to the other.
 */
export const useColorTheme = () => {
  const [theme, setTheme] = useState<ColorTheme>(readTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage unavailable (private mode) — theme still applies for this page
    }
  }, [theme]);

  const toggleTheme = (e?: MouseEvent<HTMLElement>) => {
    const next: ColorTheme = theme === 'light' ? 'dark' : 'light';
    toggleThemeWithReveal(e, () => {
      // Apply the class synchronously so the reveal captures the new theme.
      document.documentElement.classList.toggle('dark', next === 'dark');
      setTheme(next);
    });
  };

  return { theme, isDark: theme === 'dark', toggleTheme };
};
