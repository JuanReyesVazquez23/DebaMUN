import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierPage } from './DossierPage';

const state = vi.hoisted(() => ({ future: true }));

vi.mock('../lib/session', async () => {
  const { profile } = await import('../test/fixtures');
  const futurePlans = {
    national: [
      { title: 'Plan Horizonte 2034', detail: 'Hoja de ruta educativa del país.' },
    ],
    proposals: [
      { title: 'Piloto de IA docente', detail: 'Propuesta para probar asistentes en aulas.' },
    ],
  };

  return {
    useSession: () => ({
      profile: {
        ...profile,
        country: state.future
          ? { ...profile.country, futurePlans }
          : profile.country,
      },
    }),
  };
});

function renderDossier() {
  return render(
    <MemoryRouter>
      <DossierPage />
    </MemoryRouter>,
  );
}

describe('DossierPage · planes a futuro', () => {
  beforeEach(() => {
    state.future = true;
  });

  it('separa los planes oficiales de las propuestas del modelo', () => {
    renderDossier();

    expect(screen.getByRole('heading', { name: /Hacia dónde va Suiza/ })).toBeTruthy();
    expect(screen.getByText('Planes oficiales')).toBeTruthy();
    expect(screen.getByText('Plan Horizonte 2034')).toBeTruthy();
    expect(screen.getByText('Propuestas del modelo')).toBeTruthy();
    expect(screen.getByText('Piloto de IA docente')).toBeTruthy();
    expect(
      screen.getByText(/no son posiciones oficiales de Suiza/),
    ).toBeTruthy();
  });

  it('omite la sección cuando la delegación no tiene planes cargados', () => {
    state.future = false;
    renderDossier();

    expect(screen.queryByRole('heading', { name: /Hacia dónde va Suiza/ })).toBeNull();
    expect(screen.queryByText('Planes oficiales')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Futuro' })).toBeNull();
  });
});
