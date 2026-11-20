import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CountriesService } from '../countries/countries.service.js';
import type { CommitteeTopic, CountryProfile } from '../countries/countries.types.js';
import { KnowledgeService } from './knowledge.service.js';

const DATA_DIR = join(import.meta.dirname, '../../../../data');

const source = { label: 'Fuente', url: 'https://example.org', kind: 'official' } as const;

const country = {
  code: 'CH',
  name: 'Suiza',
  summary: 'Estado federal, neutral y no miembro de la Unión Europea.',
  facts: ['Suiza tiene cuatro lenguas oficiales.'],
  tips: ['Negocia con evidencia y sin confrontación directa.'],
  sources: [source],
  unProfile: {
    bloc: 'Europa occidental',
    style: 'Técnico y discreto',
    allies: ['Noruega'],
    tensions: ['Con la UE'],
    redLines: ['No acepta injerencia en su neutralidad.'],
  },
  context: {
    aiAndEducation: 'La formación profesional dual es el eje del sistema suizo.',
    youthLabour: 'El desempleo juvenil es bajo y la formación dual lo sostiene.',
    digitalGovernance: 'La protección de datos tiene rango constitucional.',
  },
} as unknown as CountryProfile;

const committee = {
  id: 'unesco',
  abbr: 'UNESCO',
  topic: 'IA generativa en educación',
  mandate: 'Coordinar la respuesta educativa a la IA generativa.',
  essentialQuestion: '¿Cómo regular la IA en las aulas?',
  subtopics: [{ label: 'Alfabetización', description: 'Formar docentes y estudiantes.' }],
  keyQuestions: ['¿Qué salvaguardas se necesitan?'],
  glossary: [{ term: 'IA', definition: 'Sistemas que imitan tareas humanas.' }],
  policyLevers: ['Directrices internacionales'],
  debateTensions: ['Innovación frente a equidad'],
  actors: ['UNESCO', 'Ministerios de educación'],
  sources: [source],
} as unknown as CommitteeTopic;

function buildService() {
  const countries = {
    getDataDir: () => DATA_DIR,
    getStance: () => ({
      position: 'Suiza apoya directrices comunes con margen nacional.',
      priorities: ['Formación docente'],
      vulnerability: 'Depende de acuerdos federales entre cantones.',
      leverage: 'Experiencia en formación dual.',
    }),
  } as unknown as CountriesService;

  const service = new KnowledgeService(countries);
  service.onModuleInit();
  return service;
}

describe('KnowledgeService', () => {
  it('carga el material editorial de data/knowledge', () => {
    expect(buildService().getKnowledgeCount()).toBeGreaterThan(40);
  });

  it('solo incluye la sección del país de la delegación', () => {
    const docs = buildService().buildDocs(country, committee);
    const titles = docs.map((doc) => doc.title);

    expect(titles).toContain('Suiza');
    expect(titles).toContain('Registro diplomático');
    expect(titles).not.toContain('Suecia');
    expect(titles).not.toContain('Brasil');
    expect(titles).not.toContain('Líbano');
  });

  it('indexa las organizaciones de tecnología y cooperación de cada país', () => {
    const denmark = { ...country, code: 'DK', name: 'Dinamarca' } as unknown as CountryProfile;
    const docs = buildService().buildDocs(denmark, committee);
    const text = docs.map((doc) => doc.text).join('\n');

    expect(text).toContain('Organizaciones de tecnología y cooperación internacional');
    expect(text).toContain('Danida');
    expect(text).toContain('digst.dk');
    // Sin fugas: las agencias de otras delegaciones no entran en el contexto danés.
    expect(text).not.toContain('AMEXCID');
    expect(text).not.toContain('AECID');
  });
});
