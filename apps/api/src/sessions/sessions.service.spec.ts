import { describe, expect, it } from 'vitest';
import type { CommitteeTopic, CountryProfile } from '../countries/countries.types.js';
import type { CountriesService } from '../countries/countries.service.js';
import type { DelegateRecord, StoreService } from '../database/store.service.js';
import { SessionsService } from './sessions.service.js';

function serviceWithFacts(total: number) {
  const country = {
    code: 'XX',
    summary: 'Resumen',
    facts: Array.from({ length: total }, (_, index) => `Dato ${index + 1}`),
  };

  const countries = {
    getCountry: (code: string) => (code === 'XX' ? country : undefined),
    requireCountry: () => country,
  } as unknown as CountriesService;

  const service = new SessionsService(countries, {} as StoreService);
  return { service, country };
}

describe('SessionsService.getFacts', () => {
  it('rota sin repetir y acorta el último bloque', () => {
    const { service } = serviceWithFacts(10);

    const blocks = [service.getFacts('XX', 0, 4), service.getFacts('XX', 4, 4), service.getFacts('XX', 8, 4)];

    expect(blocks.map((block) => block.length)).toEqual([4, 4, 2]);

    const facts = blocks.flat();
    expect(new Set(facts.map((fact) => fact.index)).size).toBe(10);
    expect(facts.map((fact) => fact.offset)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('vuelve al primer bloque después de agotar la lista', () => {
    const { service } = serviceWithFacts(10);

    const first = service.getFacts('XX', 0, 4);
    const wrapped = service.getFacts('XX', 10, 4);

    expect(wrapped.map((fact) => fact.index)).toEqual(first.map((fact) => fact.index));
    expect(wrapped.map((fact) => fact.text)).toEqual(first.map((fact) => fact.text));
  });
});

describe('SessionsService.restore', () => {
  it('conserva el país y la comisión del delegado ya registrado', async () => {
    const country = {
      code: 'CH',
      name: 'Suiza',
      summary: 'Estado federal y neutral.',
      facts: ['Suiza tiene cuatro lenguas oficiales.'],
      sources: [],
    } as unknown as CountryProfile;
    const unesco = { id: 'UNESCO', abbr: 'UNESCO' } as unknown as CommitteeTopic;
    const ecosoc = { id: 'ECOSOC', abbr: 'ECOSOC' } as unknown as CommitteeTopic;

    const countries = {
      getCountry: () => country,
      requireCountry: () => country,
      getCommittee: (id: string) => (id === 'ECOSOC' ? ecosoc : unesco),
      requireCommittee: (id: string) => (id === 'ECOSOC' ? ecosoc : unesco),
    } as unknown as CountriesService;

    const record: DelegateRecord = {
      id: 'c0ffee00-0000-4000-8000-000000000002',
      username: 'Valentina Ríos',
      countryCode: 'CH',
      committee: 'UNESCO',
      grade: 'secundaria-5',
      createdAt: '2026-11-18T00:00:00.000Z',
      lastSeenAt: '2026-11-18T00:00:00.000Z',
    };
    const store = { restoreDelegate: async () => record } as unknown as StoreService;

    const service = new SessionsService(countries, store);
    const profile = await service.restore({
      delegateId: record.id,
      username: 'Otro nombre',
      grade: 'universidad',
      countryCode: 'CH',
      committee: 'ECOSOC',
    });

    expect(profile.committee.id).toBe('UNESCO');
    expect(profile.delegate.username).toBe('Valentina Ríos');
    expect(profile.delegate.grade).toBe('secundaria-5');
  });
});
