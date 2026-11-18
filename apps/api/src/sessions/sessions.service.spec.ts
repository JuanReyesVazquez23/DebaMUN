import { describe, expect, it } from 'vitest';
import type { CountriesService } from '../countries/countries.service.js';
import type { StoreService } from '../database/store.service.js';
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
