import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import {
  country,
  dashboard,
  dashboardEcosoc,
  factsOfDay,
  nextQuestion,
  nextQuestionEcosoc,
  profile,
  profileEcosoc,
  turnResult,
} from './test/fixtures';
import type { CommitteeId, DashboardData, NextQuestionResponse, SessionProfile } from './types';

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

type Handler = (url: string, init?: RequestInit) => Promise<Response> | null;

function mockFetch(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return handler(url, init) ?? json({ message: 'No encontrado' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

interface CommitteeFlow {
  id: CommitteeId;
  profile: SessionProfile;
  dashboard: DashboardData;
  question: NextQuestionResponse;
  topic: RegExp;
  room: RegExp;
}

// Las dos comisiones se prueban con el mismo recorrido y las mismas garantías.
const FLOWS: CommitteeFlow[] = [
  {
    id: 'ECOSOC',
    profile: profileEcosoc,
    dashboard: dashboardEcosoc,
    question: nextQuestionEcosoc,
    topic: /Futuro del empleo juvenil ante la IA/,
    room: /Sala ECOSOC · Empleo/,
  },
  {
    id: 'UNESCO',
    profile,
    dashboard,
    question: nextQuestion,
    topic: /IA generativa en la educación/,
    room: /Sala UNESCO · Educación/,
  },
];

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe.each(FLOWS)('flujo $id', (flow) => {
  it('completa nombre → grado → país → comisión y llega al panel', async () => {
    mockFetch((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/countries')) return json({ countries: [country] });
      if (url.endsWith('/sessions') && method === 'POST') return json(flow.profile, 201);
      if (url.endsWith('/dashboard')) return json(flow.dashboard);
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/bienvenida']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const name = await screen.findByPlaceholderText('Nombre y apellido');
    fireEvent.change(name, { target: { value: 'Valentina Ríos' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Qué grado cursas/ }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /5\.º de secundaria/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar desde 5\.º de secundaria/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Qué país defiendes/ }),
    ).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: /Suiza/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar con Suiza/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Elige tu comisión/ }),
    ).toBeTruthy();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(flow.id) }));
    fireEvent.click(screen.getByRole('button', { name: /Entrar en la sala/ }));

    expect(await screen.findByRole('heading', { level: 1, name: /Valentina/ })).toBeTruthy();
    expect(screen.getAllByText(flow.topic).length).toBeGreaterThan(0);
    expect(screen.getAllByText(flow.room).length).toBeGreaterThan(0);
    expect(localStorage.getItem('debamun.delegate.v1')).toBe(flow.profile.delegate.id);
  });

  it('evalúa una intervención en la arena de debate', async () => {
    localStorage.setItem('debamun.delegate.v1', flow.profile.delegate.id);

    mockFetch((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith(`/sessions/${flow.profile.delegate.id}`)) return json(flow.profile);
      if (url.endsWith('/debate/sessions') && method === 'POST') {
        return json({ session: { id: flow.question.session.id } }, 201);
      }
      if (url.endsWith('/debate/questions/next')) return json(flow.question, 201);
      if (url.endsWith('/debate/turns')) return json(turnResult, 201);
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/app/debate']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: /Elige el nivel de tu ronda/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Empezar en Intermedio/ }));

    expect(await screen.findByText(flow.question.question.text)).toBeTruthy();

    const composer = screen.getByPlaceholderText(/Honorable Presidencia/);
    fireEvent.change(composer, {
      target: {
        value:
          'Honorable Presidencia, la delegación de Suiza reconoce la urgencia de actuar y comparte la preocupación de otras delegaciones. La evidencia disponible exige formación continua, protección social y evaluación independiente. Proponemos un fondo tripartito con financiamiento mixto, auditoría externa y un indicador medible a doce meses. Invitamos a la comisión a adoptar este mecanismo gradual y verificable.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar intervención/ }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Competente' })).toBeTruthy();
    expect(await screen.findByText('78')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Siguiente pregunta/ })).toBeTruthy();
  });
});

describe('panel del delegado', () => {
  it('muestra la bandera del país y rota los datos del día', async () => {
    localStorage.setItem('debamun.delegate.v1', profile.delegate.id);

    const nextFacts = [
      {
        text: 'El CERN, uno de los mayores laboratorios de física, tiene sede en Ginebra.',
        index: 4,
        total: 8,
        date: '2026-11-16',
        offset: 4,
      },
      {
        text: 'La formación profesional dual combina empresa y escuela.',
        index: 5,
        total: 8,
        date: '2026-11-16',
        offset: 5,
      },
    ];

    mockFetch((url) => {
      if (url.endsWith(`/sessions/${profile.delegate.id}`)) return json(profile);
      if (url.endsWith('/dashboard')) return json(dashboard);
      if (url.includes('/facts/day') && url.includes('offset=4')) {
        return json({ date: '2026-11-16', facts: nextFacts });
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText(factsOfDay[1].text)).toBeTruthy();
    expect(screen.getByText('1–4 de 8 datos · rotan cada día')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Otros datos/ }));

    expect(await screen.findByText(nextFacts[0].text)).toBeTruthy();
    expect(screen.getByText('5–6 de 8 datos · rotan cada día')).toBeTruthy();
  });
});
