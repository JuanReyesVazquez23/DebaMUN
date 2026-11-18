import type {
  ChatMessage,
  CommitteeId,
  CountrySummary,
  DashboardData,
  FactOfDay,
  GradeId,
  NextQuestionResponse,
  ResearchResult,
  SessionProfile,
  TurnResult,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const payload = body as { message?: unknown; error?: unknown };
  if (Array.isArray(payload.message)) {
    const first = payload.message[0];
    return typeof first === 'string' ? first : fallback;
  }
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'No pude contactar con el servidor. Comprueba que la API está en marcha en el puerto 4000.',
      0,
    );
  }

  const text = await response.text();
  const body: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const fallback =
      response.status === 429
        ? 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentarlo.'
        : `El servidor respondió ${response.status}.`;
    throw new ApiError(messageFrom(body, fallback), response.status);
  }

  return body as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  health: () => request<{ status: string; corpus: { countries: number } }>('/health'),

  countries: () => request<{ countries: CountrySummary[] }>('/countries'),

  topics: () => request<{ committees: unknown[]; conference: unknown }>('/topics'),

  createSession: (input: {
    username: string;
    grade: GradeId;
    countryCode: string;
    committee: CommitteeId;
  }) => request<SessionProfile>('/sessions', { method: 'POST', body: JSON.stringify(input) }),

  profile: (delegateId: string) => request<SessionProfile>(`/sessions/${delegateId}`),

  dashboard: (delegateId: string) => request<DashboardData>(`/sessions/${delegateId}/dashboard`),

  factsOfDay: (countryCode: string, offset = 0) =>
    request<{ date: string; facts: FactOfDay[] }>(
      `/facts/day?countryCode=${encodeURIComponent(countryCode)}&offset=${offset}`,
    ),

  createDebateSession: (delegateId: string, difficulty: 1 | 2 | 3) =>
    request<{ session: { id: string; difficulty: 1 | 2 | 3 } }>('/debate/sessions', {
      method: 'POST',
      body: JSON.stringify({ delegateId, difficulty }),
    }),

  nextQuestion: (sessionId: string) =>
    request<NextQuestionResponse>('/debate/questions/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  submitTurn: (input: {
    sessionId: string;
    questionId: string;
    question: string;
    kind: string;
    answer: string;
  }) => request<TurnResult>('/debate/turns', { method: 'POST', body: JSON.stringify(input) }),

  research: (delegateId: string, question: string) =>
    request<ResearchResult>('/research/ask', {
      method: 'POST',
      body: JSON.stringify({ delegateId, question }),
    }),

  researchHistory: (delegateId: string) =>
    request<{ messages: ChatMessage[] }>(`/research/history/${delegateId}`),
};
