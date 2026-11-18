import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ColorScheme = 'light' | 'dark';

export const COLOR_SCHEME_KEY = 'debamun.color-scheme';

function systemScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Preferencia guardada por el usuario o, si no existe, la del sistema. */
export function readColorScheme(): ColorScheme {
  try {
    const stored = window.localStorage.getItem(COLOR_SCHEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage puede estar bloqueado; seguimos con la preferencia del sistema.
  }
  return systemScheme();
}

export function applyColorScheme(scheme: ColorScheme) {
  const root = document.documentElement;
  root.setAttribute('data-color-scheme', scheme);
  root.style.colorScheme = scheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', scheme === 'dark' ? '#1a1814' : '#f5f0e6');
}

interface ColorSchemeValue {
  scheme: ColorScheme;
  isDark: boolean;
  toggle: () => void;
}

const ColorSchemeContext = createContext<ColorSchemeValue | null>(null);

/**
 * Mantiene el tema claro/oscuro en toda la aplicación —incluido el onboarding—
 * y lo recuerda entre visitas. Se aplica al <html> para que las variables CSS
 * estén disponibles antes de montar cualquier página.
 */
export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<ColorScheme>(() => readColorScheme());

  useEffect(() => {
    applyColorScheme(scheme);
  }, [scheme]);

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(COLOR_SCHEME_KEY, next);
      } catch {
        // Sin persistencia: el cambio sigue activo durante esta visita.
      }
      return next;
    });
  }, []);

  const value = useMemo<ColorSchemeValue>(
    () => ({ scheme, isDark: scheme === 'dark', toggle }),
    [scheme, toggle],
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

export function useColorScheme(): ColorSchemeValue {
  const context = useContext(ColorSchemeContext);
  if (!context) throw new Error('useColorScheme debe usarse dentro de ColorSchemeProvider');
  return context;
}
