import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api } from './api';
import type { CommitteeId, CountrySummary, GradeId, SessionProfile } from '../types';

const DELEGATE_KEY = 'debamun.delegate.v1';
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

const GRADES: GradeId[] = ['6', '7', '8', '9', '10', '11', '12', 'universidad'];

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { username: '', grade: '', country: null };
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      grade: GRADES.includes(parsed.grade as GradeId) ? (parsed.grade as GradeId) : '',
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

  useEffect(() => {
    const delegateId = localStorage.getItem(DELEGATE_KEY);
    if (!delegateId) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;
    api
      .profile(delegateId)
      .then((next) => {
        if (cancelled) return;
        setProfile(next);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) {
          localStorage.removeItem(DELEGATE_KEY);
        }
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [profile]);

  const signOut = useCallback(() => {
    localStorage.removeItem(DELEGATE_KEY);
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
