import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, setSessionRecovery } from './api';
import { normalizeGrade } from './format';
import type { CommitteeId, CountrySummary, GradeId, SessionProfile } from '../types';

const DELEGATE_KEY = 'debamun.delegate.v1';
const PROFILE_KEY = 'debamun.profile.v1';
const DRAFT_KEY = 'debamun.draft.v1';

interface Draft {
  username: string;
  grade: GradeId | '';
  country: CountrySummary | null;
}

interface SessionContextValue {
  status: 'loading' | 'anonymous' | 'ready';
  profile: SessionProfile | null;
  draft: Draft;
  error: string | null;
  setUsername: (username: string) => void;
  setGrade: (grade: GradeId | '') => void;
  setCountry: (country: CountrySummary | null) => void;
  startSession: (committee: CommitteeId) => Promise<SessionProfile>;
  refresh: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const GRADES: GradeId[] = [
  'primaria-1',
  'primaria-2',
  'primaria-3',
  'primaria-4',
  'primaria-5',
  'primaria-6',
  'secundaria-1',
  'secundaria-2',
  'secundaria-3',
  'secundaria-4',
  'secundaria-5',
  'secundaria-6',
  'universidad',
];

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { username: '', grade: '', country: null };
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const grade = normalizeGrade(parsed.grade);
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      grade: grade && GRADES.includes(grade) ? grade : '',
      country: parsed.country ?? null,
    };
  } catch {
    return { username: '', grade: '', country: null };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionContextValue['status']>('loading');
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<SessionProfile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  /**
   * Vuelve a registrar al delegado en el backend con los datos guardados en el navegador.
   * Nunca cambia su identidad: si el servidor ya lo conoce, la operación no modifica nada.
   * Las llamadas simultáneas comparten la misma petición.
   */
  const pendingRestore = useRef<Promise<void> | null>(null);
  const ensureSession = useCallback(() => {
    if (pendingRestore.current) return pendingRestore.current;

    const current = profileRef.current;
    if (!current) return Promise.resolve();

    const run = api
      .restoreSession(current)
      .then((next) => {
        profileRef.current = next;
        localStorage.setItem(DELEGATE_KEY, next.delegate.id);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        setProfile(next);
      })
      .finally(() => {
        pendingRestore.current = null;
      });

    pendingRestore.current = run;
    return run;
  }, []);

  // Cualquier petición que reciba "Delegado no encontrado" restaura la sesión y se repite.
  useEffect(() => {
    setSessionRecovery(ensureSession);
    return () => setSessionRecovery(null);
  }, [ensureSession]);

  useEffect(() => {
    const delegateId = localStorage.getItem(DELEGATE_KEY);
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    // Restaurar inmediatamente desde localStorage si existe y coincide con el delegado activo.
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as SessionProfile;
        if (parsed?.delegate?.id && parsed.delegate.id === delegateId) {
          profileRef.current = parsed;
          setProfile(parsed);
          setStatus('ready');
          // Sincroniza con el backend sin bloquear la interfaz: si el servidor reinició su base,
          // el delegado se re-registra y la sesión sigue abierta.
          void ensureSession().catch(() => undefined);
          return;
        }
      } catch {
        // Perfil corrupto: se descarta y se intenta recuperar del backend.
      }
      localStorage.removeItem(PROFILE_KEY);
    }

    // No hay sesión guardada: estado anónimo sin tocar nada más.
    if (!delegateId) {
      setStatus('anonymous');
      return;
    }

    // Fallback: si hay delegateId pero no profile guardado, intentar recuperar desde el backend.
    let cancelled = false;
    api
      .profile(delegateId)
      .then((next) => {
        if (cancelled) return;
        setProfile(next);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // Nunca borrar la sesión: mantener el delegateId para que el usuario pueda volver a iniciar.
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, [ensureSession]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const setUsername = useCallback((username: string) => {
    setDraft((current) => ({ ...current, username }));
  }, []);

  const setGrade = useCallback((grade: GradeId | '') => {
    setDraft((current) => ({ ...current, grade }));
  }, []);

  const setCountry = useCallback((country: CountrySummary | null) => {
    setDraft((current) => ({ ...current, country }));
  }, []);

  const startSession = useCallback(
    async (committee: CommitteeId) => {
      const username = draft.username.trim();
      const country = draft.country;
      if (username.length < 2) throw new ApiError('Escribe tu nombre para continuar.', 400);
      if (!draft.grade) throw new ApiError('Elige tu grado para continuar.', 400);
      if (!country) throw new ApiError('Elige un país para continuar.', 400);

      setError(null);
      const next = await api.createSession({
        username,
        grade: draft.grade,
        countryCode: country.code,
        committee,
      });
      localStorage.setItem(DELEGATE_KEY, next.delegate.id);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      profileRef.current = next;
      setProfile(next);
      setStatus('ready');
      return next;
    },
    [draft],
  );

  const refresh = useCallback(async () => {
    const current = profile ?? null;
    if (!current) return;
    const next = await api.profile(current.delegate.id);
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, [profile]);

  const signOut = useCallback(() => {
    localStorage.removeItem(DELEGATE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    profileRef.current = null;
    setProfile(null);
    setStatus('anonymous');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      profile,
      draft,
      error,
      setUsername,
      setGrade,
      setCountry,
      startSession,
      refresh,
      signOut,
      clearError,
    }),
    [status, profile, draft, error, setUsername, setGrade, setCountry, startSession, refresh, signOut, clearError],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
