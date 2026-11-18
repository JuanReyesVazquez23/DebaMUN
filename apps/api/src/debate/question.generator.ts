import { Injectable } from '@nestjs/common';
import type { CommitteeTopic, CountryProfile, Subtopic } from '../countries/countries.types.js';
import { seedFrom, seededRandom, shortHash } from '../common/hash.js';
import { truncate } from '../common/text.js';

export type QuestionKind =
  | 'apertura'
  | 'seguimiento'
  | 'contrapunto'
  | 'crisis'
  | 'resolucion'
  | 'punto_informacion'
  | 'datos';

export type Difficulty = 1 | 2 | 3;

export interface GeneratedQuestion {
  id: string;
  committee: string;
  kind: QuestionKind;
  difficulty: Difficulty;
  text: string;
  focus: string;
  focusId: string;
  angle: string;
  whyItMatters: string;
  suggestedStructure: string[];
  timeSeconds: number;
  resolutionExpected: boolean;
}

interface Candidate {
  id: string;
  kind: QuestionKind;
  focus: Subtopic;
  angle: string;
  /** Nivel mínimo en el que aparece la pregunta. */
  minLevel: Difficulty;
  build: (countryName: string) => string;
  /** Versión corta y guiada para el nivel básico. */
  simpleBuild?: (countryName: string) => string;
}

interface NextQuestionInput {
  committee: CommitteeTopic;
  country: CountryProfile;
  sessionId: string;
  questionCount: number;
  askedIds: string[];
  difficulty?: Difficulty;
}

const ALTERNATIVES = [
  'dejar la regulación exclusivamente al mercado es suficiente',
  'prohibir toda IA generativa en el aula es la única salida',
  'las directrices voluntarias bastan',
  'subsidiar dispositivos sin formar docentes resolverá la brecha',
  'una renta básica sin servicios de empleo es suficiente',
  'retrasar la edad de jubilación sin recapacitación es sostenible',
];

const RISKS: Record<string, string[]> = {
  UNESCO: [
    'la brecha digital',
    'la pérdida de autoría',
    'la vigilancia educativa',
    'la homogenización cultural',
    'la dependencia de proveedores',
    'la desinformación sintética',
  ],
  ECOSOC: [
    'la precarización',
    'la exclusión de jóvenes rurales',
    'la discriminación algorítmica',
    'la informalidad',
    'la concentración de mercado',
    'la pérdida de protección social',
  ],
};

const INCIDENTS: Record<string, string[]> = {
  UNESCO: [
    'un chatbot que redactó un examen final',
    'una filtración de datos de estudiantes',
    'un deepfake de un docente',
    'un algoritmo que sesgó becas',
    'una plataforma que usó ensayos sin consentimiento',
  ],
  ECOSOC: [
    'un despido masivo automatizado',
    'una asignación algorítmica de turnos discriminatoria',
    'una filtración de datos de trabajadores',
    'un recorte de personal por IA en una Pyme',
    'una plataforma que desactivó cuentas sin explicación',
  ],
};

const CONTEXTS = [
  'un centro público rural',
  'una universidad de frontera',
  'una Pyme exportadora',
  'un programa de empleo juvenil',
  'una plataforma de reparto',
  'un instituto de formación técnica',
];

const VALUES = ['la equidad', 'la privacidad', 'la diversidad cultural', 'la libertad académica', 'la protección social', 'la autonomía docente'];

const SOURCES = ['UNESCO', 'OIT', 'Banco Mundial', 'OCDE', 'UNICEF', 'PNUD'];

const STRUCTURES: Record<QuestionKind, string[]> = {
  apertura: ['Cortesía y postura en una frase', 'Principio + evidencia', 'Medida concreta y cierre'],
  seguimiento: ['Recuerda tu propuesta', 'Explica a quién incluye', 'Define indicador y plazo'],
  contrapunto: ['Reconoce el argumento rival', 'Refuta con evidencia', 'Ofrece una alternativa superior'],
  crisis: ['Contén el daño', 'Asigna responsabilidad', 'Repara y previene'],
  resolucion: ['Mecanismo', 'Responsable y financiamiento', 'Plazo e indicador'],
  punto_informacion: ['Respuesta directa en una frase', 'Aclaración técnica', 'Consecuencia práctica'],
  datos: ['Fuente y límite del dato', 'Verificación', 'Ajuste de la propuesta'],
};

const SIMPLE_STRUCTURES: Record<QuestionKind, string[]> = {
  apertura: ['Saluda y di quién eres', 'Tu idea principal en una frase', 'Una medida sencilla'],
  seguimiento: ['Recuerda tu medida', 'Di a quién ayuda', 'Explica cómo se comprueba'],
  contrapunto: ['Escucha y reconoce', 'Da una razón concreta', 'Propón algo mejor'],
  crisis: ['Di qué haces primero', 'Quién responde', 'Cómo evitas que se repita'],
  resolucion: ['Qué propones', 'Quién lo hace y con qué', 'Cuándo se evalúa'],
  punto_informacion: ['Responde en una frase', 'Aclara el dato', 'Di qué cambia'],
  datos: ['De dónde sale el dato', 'Si es confiable', 'Qué harías con él'],
};

const TIMES: Record<QuestionKind, number> = {
  apertura: 90,
  seguimiento: 60,
  contrapunto: 75,
  crisis: 45,
  resolucion: 120,
  punto_informacion: 30,
  datos: 60,
};

const MIN_LEVEL: Record<QuestionKind, Difficulty> = {
  apertura: 1,
  seguimiento: 1,
  datos: 1,
  punto_informacion: 2,
  contrapunto: 2,
  resolucion: 2,
  crisis: 3,
};

const PRESSURE: Partial<Record<QuestionKind, string>> = {
  contrapunto: 'Anticipe la objeción más difícil que podría hacerle la mesa.',
  resolucion: 'Incluya un escenario de fallo y el ajuste previsto.',
  crisis: 'Distinga la respuesta inmediata de la reparación de largo plazo.',
};

function pick<T>(rng: () => number, items: T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('No hay elementos para elegir');
  return item;
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function tensionPhrase(tension: string): string {
  const [left, right] = tension.split(' frente a ');
  if (!left || !right) return tension.toLowerCase();
  return `la tensión entre ${left.toLowerCase()} y ${right.toLowerCase()}`;
}

@Injectable()
export class QuestionGenerator {
  next(input: NextQuestionInput): GeneratedQuestion {
    const difficulty: Difficulty = input.difficulty ?? 2;
    const candidates = this.buildCandidates(input.committee);
    const asked = new Set(input.askedIds);
    const available = candidates.filter(
      (candidate) => !asked.has(candidate.id) && candidate.minLevel <= difficulty,
    );
    const rng = seededRandom(seedFrom(`${input.sessionId}:${input.questionCount}`));

    let candidate: Candidate;
    if (available.length > 0) {
      candidate = pick(rng, available);
    } else {
      candidate = this.fallbackCandidate(input.committee, input.questionCount, difficulty);
    }

    const baseText =
      difficulty === 1 && candidate.simpleBuild
        ? candidate.simpleBuild(input.country.name)
        : candidate.build(input.country.name);
    const pressure = difficulty === 3 ? PRESSURE[candidate.kind] : undefined;

    return {
      id: candidate.id,
      committee: input.committee.id,
      kind: candidate.kind,
      difficulty,
      text: pressure ? `${baseText} ${pressure}` : baseText,
      focus: candidate.focus.label,
      focusId: candidate.focus.id,
      angle: candidate.angle,
      whyItMatters: truncate(candidate.focus.description, 210),
      suggestedStructure: difficulty === 1 ? SIMPLE_STRUCTURES[candidate.kind] : STRUCTURES[candidate.kind],
      timeSeconds: Math.max(30, TIMES[candidate.kind] + (difficulty === 1 ? 20 : difficulty === 3 ? -10 : 0)),
      resolutionExpected: candidate.kind === 'resolucion' || candidate.kind === 'crisis',
    };
  }

  private buildCandidates(committee: CommitteeTopic): Candidate[] {
    const risks = RISKS[committee.id] ?? [];
    const incidents = INCIDENTS[committee.id] ?? [];
    const candidates: Candidate[] = [];

    for (const focus of committee.subtopics) {
      for (const tension of committee.debateTensions) {
        const key = `apertura|${focus.id}|${tension}`;
        candidates.push({
          id: shortHash(key),
          kind: 'apertura',
          focus,
          angle: `Apertura · ${focus.label}`,
          minLevel: 1,
          build: (countryName) =>
            `Honorable Presidencia: la delegación de ${countryName} fija posición sobre «${focus.label}». ¿Qué principio debe prevalecer cuando ${tensionPhrase(tension)} se vuelve decisiva y cómo se traduce en una medida concreta?`,
          simpleBuild: (countryName) =>
            `La delegación de ${countryName} presenta su postura sobre «${focus.label}». En una frase: ¿qué defiende y qué medida propone?`,
        });
      }

      for (const lever of committee.policyLevers) {
        for (const actor of committee.actors) {
          const key = `seguimiento|${focus.id}|${lever}|${actor}`;
          candidates.push({
            id: shortHash(key),
            kind: 'seguimiento',
            focus,
            angle: `Seguimiento · ${lever}`,
            minLevel: 1,
            build: (countryName) =>
              `En el marco de «${focus.label}», la delegación de ${countryName} propone ${lowerFirst(lever)}. ¿Cómo evita que ${actor} queden fuera y qué indicador medirá el éxito en los próximos 12 meses?`,
            simpleBuild: (countryName) =>
              `La delegación de ${countryName} propone ${lowerFirst(lever)}. ¿A quién ayuda y cómo sabremos si funcionó?`,
          });
        }
      }

      for (const alternative of ALTERNATIVES) {
        for (const risk of risks) {
          const key = `contrapunto|${focus.id}|${alternative}|${risk}`;
          candidates.push({
            id: shortHash(key),
            kind: 'contrapunto',
            focus,
            angle: `Contrapunto · ${risk}`,
            minLevel: 2,
            build: (countryName) => {
              const rng = seededRandom(seedFrom(`${key}|render`));
              const value = pick(rng, VALUES);
              return `Otra delegación sostiene que ${alternative}. ¿Cómo responde ${countryName} sin sacrificar ${value} ni profundizar ${risk}?`;
            },
            simpleBuild: (countryName) =>
              `Otra delegación no comparte la posición de ${countryName} sobre «${focus.label}». ¿Cómo responde con respeto y una razón concreta?`,
          });
        }
      }

      for (const incident of incidents) {
        for (const context of CONTEXTS) {
          const key = `crisis|${focus.id}|${incident}|${context}`;
          candidates.push({
            id: shortHash(key),
            kind: 'crisis',
            focus,
            angle: `Crisis · ${incident}`,
            minLevel: 3,
            build: (countryName) =>
              `Se detecta ${incident} en ${context}. La situación se enmarca en «${focus.label}». ¿Qué hace la delegación de ${countryName} en las próximas 24 horas, quién asume la responsabilidad y cómo se repara el daño?`,
            simpleBuild: (countryName) =>
              `Hay un incidente: ${incident}, en ${context}. ¿Qué hace ${countryName} primero y a quién avisa?`,
          });
        }
      }

      for (const lever of committee.policyLevers) {
        for (const actor of committee.actors) {
          const key = `resolucion|${focus.id}|${lever}|${actor}`;
          candidates.push({
            id: shortHash(key),
            kind: 'resolucion',
            focus,
            angle: `Resolución · ${lever}`,
            minLevel: 2,
            build: (countryName) =>
              `Presente un elemento de resolución sobre «${focus.label}»: mecanismo, responsable, financiamiento, plazo y verificación. ¿Qué organismo, dentro de ${actor}, lo ejecuta y cómo rinde cuentas ante ${countryName} y la comisión?`,
            simpleBuild: (countryName) =>
              `Proponga una medida concreta sobre «${focus.label}»: quién la ejecuta, cuánto cuesta y cuándo se evalúa.`,
          });
        }
      }

      for (const risk of risks) {
        for (const alternative of ALTERNATIVES) {
          const key = `punto_informacion|${focus.id}|${risk}|${alternative}`;
          candidates.push({
            id: shortHash(key),
            kind: 'punto_informacion',
            focus,
            angle: `Punto de información · ${risk}`,
            minLevel: 2,
            build: (countryName) =>
              `Punto de información: ¿puede ${countryName} explicar por qué su propuesta sobre «${focus.label}» no profundiza ${risk} y en qué se diferencia de la posición de quien sostiene que ${alternative}?`,
            simpleBuild: (countryName) =>
              `Punto de información: ¿puede ${countryName} explicar en dos frases qué propone sobre «${focus.label}»?`,
          });
        }
      }

      for (const risk of risks) {
        for (const source of SOURCES) {
          const key = `datos|${focus.id}|${risk}|${source}`;
          candidates.push({
            id: shortHash(key),
            kind: 'datos',
            focus,
            angle: `Evidencia · ${source}`,
            minLevel: 1,
            build: (countryName) =>
              `Un informe de ${source} advierte sobre ${risk}. ¿Qué evidencia adicional necesita ${countryName}, cómo la verificará y qué cambia en su propuesta sobre «${focus.label}» si los datos no se confirman?`,
            simpleBuild: (countryName) =>
              `Un informe de ${source} advierte sobre ${risk}. ¿Qué dato usaría ${countryName} sobre «${focus.label}» y de dónde lo obtiene?`,
          });
        }
      }
    }

    return candidates;
  }

  private fallbackCandidate(
    committee: CommitteeTopic,
    questionCount: number,
    difficulty: Difficulty,
  ): Candidate {
    const focus = committee.subtopics[questionCount % committee.subtopics.length];
    if (!focus) throw new Error('La comisión no tiene subtemas configurados');
    const key = `profundizacion|${difficulty}|${questionCount}|${focus.id}`;
    return {
      id: shortHash(key),
      kind: 'seguimiento',
      focus,
      angle: `Profundización · ${focus.label}`,
      minLevel: 1,
      build: (countryName) =>
        `Ronda de profundización ${questionCount + 1}: la mesa pide a ${countryName} un mecanismo nuevo, no repetido, sobre «${focus.label}». Describa el instrumento, quién lo paga, cómo se verifica y qué ocurre si falla en el primer año.`,
      simpleBuild: (countryName) =>
        `La mesa pide a ${countryName} una idea nueva sobre «${focus.label}». ¿Qué propone, quién lo hace y cómo se comprueba?`,
    };
  }
}
