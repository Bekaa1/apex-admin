import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'apex-theme';

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Initial theme: the user's saved choice, else the OS setting. The choice is saved and wins over the OS.
 * Applies the theme as <html data-theme="light|dark">, which switches every CSS variable in tokens.css.
 */
export function ThemeProvider({
  children,
  initialTheme,
  persist = true,
  applyToDocument = true,
}: {
  children: ReactNode;
  initialTheme?: Theme;
  /** Save the user's choice in localStorage. */
  persist?: boolean;
  /** Set data-theme on <html>. Turn off when a subtree sets data-theme itself (e.g. side-by-side previews). */
  applyToDocument?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(() => initialTheme ?? storedTheme() ?? systemTheme());

  useEffect(() => {
    if (applyToDocument) document.documentElement.setAttribute('data-theme', theme);
  }, [theme, applyToDocument]);

  // Follow OS changes until the user picks a theme explicitly.
  useEffect(() => {
    if (initialTheme || !window.matchMedia || storedTheme()) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setThemeState(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (persist) {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage unavailable — keep the in-memory choice */
        }
      }
    },
    [persist],
  );

  const value = useMemo(() => ({ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
