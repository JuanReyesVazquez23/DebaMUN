import { Injectable } from '@nestjs/common';
import {
  clamp,
  contentTokens,
  normalizeForMatch,
  splitSentences,
  truncate,
  unique,
  wordCount,
} from '../common/text.js';
import type { QuestionKind } from './question.generator.js';

export type CriterionKey = 'dialogo' | 'argumentos' | 'coherencia' | 'resolucion';

export interface CriterionScore {
  key: CriterionKey;
  label: string;
  score: number;
  level: 'Inicial' | 'En desarrollo' | 'Competente' | 'Destacado';
  weight: number;
  evidence: string[];
  advice: string;
}

export interface EvaluationResult {
  overall: number;
  level: string;
  criteria: CriterionScore[];
  strengths: string[];
  improvements: string[];
  verdict: string;
  wordCount: number;
  resolutionExpected: boolean;
}

interface EvaluateInput {
  question: string;
  answer: string;
  kind: QuestionKind;
  countryName: string;
}

const DIPLOMATIC = [
  'honorable',
  'presidencia',
  'mesa directiva',
  'delegacion',
  'delegaciones',
  'esta delegacion',
  'nuestra delegacion',
  'nuestro pais',
  'colegas',
  'respetuosamente',
  'con respeto',
  'cooperacion',
  'consenso',
  'dialogo',
  'multilateral',
  'soberania',
  'derechos humanos',
  'solicito la palabra',
  'cedo la palabra',
  'punto de informacion',
  'agradezco',
  'gracias',
  'consideramos',
  'estimamos',
];

const ACKNOWLEDGE = [
  'reconoc',
  'comprend',
  'entendemos',
  'entiendo',
  'compartimos',
  'coincidimos',
  'escuchamos',
  'otras delegaciones',
  'si bien',
  'conviene distinguir',
  'valoramos',
  'agradecemos',
];

const AGGRESSIVE = [
  'absurdo',
  'ridiculo',
  'mentira',
  'estupido',
  'inaceptable',
  'jamas',
  'culpa de',
  'falta de voluntad',
  'ignorante',
];

const SOURCE_NAMES = [
  'unesco',
  'oit',
  'banco mundial',
  'ocde',
  'unicef',
  'pnud',
  'onu',
  'oms',
  'fmi',
  'acnur',
  'pnud',
];

const EVIDENCE = [
  'segun',
  'de acuerdo con',
  'informe',
  'estudio',
  'datos',
  'evidencia',
  'investigacion',
  'indice',
  'encuesta',
  'estadistica',
  'porcentaje',
  'cifra',
  'fuente',
  'diagnostico',
  'advirtio',
  'senala',
  'reporta',
  'documenta',
  'publico',
  'informo',
  'datos de',
];

const CAUSAL = [
  'porque',
  'debido a',
  'ya que',
  'puesto que',
  'en consecuencia',
  'por lo tanto',
  'como resultado',
  'esto implica',
  'lo que genera',
  'de modo que',
  'por ello',
  'a causa de',
  'lo que permite',
  'lo que reduce',
  'lo que aumenta',
  'genera',
  'produce',
  'conlleva',
];

const EXAMPLES = ['por ejemplo', 'como el caso', 'en el caso de', 'ilustra', 'evidencia de', 'como ocurre en'];

const COUNTER = [
  'sin embargo',
  'no obstante',
  'si bien',
  'por otro lado',
  'no se trata de',
  'conviene distinguir',
  'ahora bien',
  'en cambio',
];

const CONNECTORS = [
  'en primer lugar',
  'en segundo lugar',
  'asimismo',
  'ademas',
  'por otra parte',
  'en consecuencia',
  'por lo tanto',
  'finalmente',
  'en sintesis',
  'en conclusion',
  'para cerrar',
  'a continuacion',
  'primero',
  'segundo',
  'tercero',
  'luego',
  'despues',
  'por ultimo',
  'al mismo tiempo',
];

const PROPOSAL = [
  'proponemos',
  'propongo',
  'proponer',
  'crear',
  'establecer',
  'implementar',
  'financiar',
  'asignar',
  'regular',
  'exigir',
  'certificar',
  'destinar',
  'movilizar',
  'acordar',
  'adoptar',
  'disenar',
  'impulsar',
  'fortalecer',
  'promover',
  'garantizar',
  'asegurar',
  'poner en marcha',
  'piloto',
  'fondo',
  'mecanismo',
  'programa',
  'ley',
  'marco',
  'incentivo',
  'convenio',
];

const ACTORS = [
  'ministerio',
  'gobierno',
  'estado',
  'empresa',
  'sector privado',
  'sociedad civil',
  'docentes',
  'sindicato',
  'onu',
  'unesco',
  'oit',
  'municipio',
  'escuela',
  'universidad',
  'plataforma',
  'consejo',
  'parlamento',
  'congreso',
  'contraloria',
];

const FUNDING = [
  'financiamiento',
  'presupuesto',
  'fondo',
  'inversion',
  'recursos',
  'impuesto',
  'credito',
  'donacion',
  'cooperacion',
  'publico-privad',
  'costo',
  'millones',
];

const TIMELINE = [
  'plazo',
  'meses',
  'anos',
  '2026',
  '2027',
  '2028',
  '2029',
  '2030',
  'fase',
  'corto plazo',
  'largo plazo',
  'anual',
  'trimestre',
  'primer ano',
];

const MEASUREMENT = [
  'indicador',
  'medir',
  'evaluar',
  'seguimiento',
  'auditoria',
  'meta',
  'reporte',
  'transparencia',
  'monitoreo',
  'verificacion',
];

const ACCOUNTABILITY = [
  'responsable',
  'rendicion de cuentas',
  'rendir cuentas',
  'rinde cuentas',
  'fiscalizacion',
  'sancion',
  'supervision',
  'vigilancia',
  'consejo',
  'comite',
  'tribunal',
  'contraloria',
];

const FEASIBILITY = [
  'piloto',
  'gradual',
  'escalonado',
  'proporcional',
  'segun capacidad',
  'evaluacion',
  'revision',
  'escalable',
  'viable',
  'realista',
];

const MECHANISM = [
  'permite',
  'reduce',
  'aumenta',
  'mejora',
  'evita',
  'previene',
  'facilita',
  'limita',
  'protege',
  'incentiva',
];

const INCLUSION = [
  'jovenes',
  'mujeres',
  'rural',
  'rurales',
  'discapacidad',
  'pueblos indigenas',
  'migrantes',
  'informal',
  'vulnerables',
  'equidad',
];

function countMatches(normalized: string, markers: string[]): number {
  return markers.reduce((total, marker) => {
    const needle = normalizeForMatch(marker);
    return total + (normalized.includes(needle) ? 1 : 0);
  }, 0);
}

function levelOf(score: number): CriterionScore['level'] {
  if (score >= 85) return 'Destacado';
  if (score >= 70) return 'Competente';
  if (score >= 50) return 'En desarrollo';
  return 'Inicial';
}

function adviceFor(key: CriterionKey, score: number): string {
  const high = score >= 85;
  switch (key) {
    case 'dialogo':
      return high
        ? 'Tu registro diplomático es sólido. Añade una concesión táctica (“reconozco el objetivo, pero…”) para ganar persuasión sin perder firmeza.'
        : 'Abre con “Honorable Presidencia”, menciona explícitamente a tu país y reconoce la posición de otra delegación antes de contraargumentar. Cierra con una invitación al consenso.';
    case 'argumentos':
      return high
        ? 'Buen uso de evidencia. Distingue entre dato, interpretación y propuesta para que la mesa pueda verificar cada paso.'
        : 'Conecta cada afirmación con una fuente concreta (UNESCO, OIT, Banco Mundial, OCDE) y explica el mecanismo causal: dato → consecuencia → propuesta.';
    case 'coherencia':
      return high
        ? 'La estructura es clara. Reduce la longitud de las frases más largas y repite la idea central en el cierre.'
        : 'Organiza en tres movimientos: postura, dos argumentos y cierre. Usa conectores (“en primer lugar”, “en consecuencia”, “finalmente”) y responde exactamente lo que se pregunta.';
    case 'resolucion':
      return high
        ? 'La propuesta es verificable. Añade un mecanismo de revisión independiente y un escenario de fallo para demostrar realismo.'
        : 'Concreta cuatro elementos: responsable, financiamiento, plazo e indicador. Sin ellos, la propuesta suena a intención, no a resolución.';
  }
}

@Injectable()
export class ScoringService {
  evaluate(input: EvaluateInput): EvaluationResult {
    const answer = input.answer.trim();
    const words = wordCount(answer);
    const sentences = splitSentences(answer);
    const normalized = normalizeForMatch(answer);
    const questionNormalized = normalizeForMatch(input.question);
    const countryNormalized = normalizeForMatch(input.countryName);
    const resolutionExpected =
      input.kind === 'resolucion' ||
      /resolucion|propuesta|mecanismo|plan concreto|medida concreta|proyecto/.test(questionNormalized);

    if (words < 12) {
      return this.minimalEvaluation(answer, words, resolutionExpected);
    }

    const sentenceEvidence = (markers: string[]): string[] => {
      const matching = sentences.filter((sentence) => {
        const normalizedSentence = normalizeForMatch(sentence);
        return markers.some((marker) => normalizedSentence.includes(normalizeForMatch(marker)));
      });
      const pool =
        matching.length > 0 ? matching : [...sentences].sort((a, b) => b.length - a.length).slice(0, 1);
      return unique(pool.map((sentence) => truncate(sentence.trim(), 220))).slice(0, 2);
    };

    const diplomaticCount = countMatches(normalized, DIPLOMATIC);
    const acknowledgeCount = countMatches(normalized, ACKNOWLEDGE);
    const aggressiveCount = countMatches(normalized, AGGRESSIVE);
    const evidenceCount = countMatches(normalized, EVIDENCE);
    const sourceNameCount = countMatches(normalized, SOURCE_NAMES);
    const causalCount = countMatches(normalized, CAUSAL);
    const connectorCount = countMatches(normalized, CONNECTORS);
    const proposalCount = countMatches(normalized, PROPOSAL);
    const actorCount = countMatches(normalized, ACTORS);
    const fundingCount = countMatches(normalized, FUNDING);
    const timelineCount = countMatches(normalized, TIMELINE);
    const measurementCount = countMatches(normalized, MEASUREMENT);
    const accountabilityCount = countMatches(normalized, ACCOUNTABILITY);
    const feasibilityCount = countMatches(normalized, FEASIBILITY);
    const mechanismCount = countMatches(normalized, MECHANISM);
    const inclusionCount = countMatches(normalized, INCLUSION);
    const exampleCount = countMatches(normalized, EXAMPLES);
    const counterCount = countMatches(normalized, COUNTER);
    const civicTone = /(consideramos|estimamos|entendemos|proponemos|reconocemos|nuestra delegacion|nuestro pais|esta delegacion)/.test(
      normalized,
    );
    const politeOpening = /^(honorable|gracias|agradezco|presidencia|buenos dias|buenas tardes)/.test(
      normalized,
    );
    const hasFallback = /(si no|si falla|en caso de|de lo contrario|escenario de fallo|contingencia)/.test(
      normalized,
    );

    const mentionsCountry =
      normalized.includes(countryNormalized) ||
      normalized.includes('nuestra delegacion') ||
      /delegacion de [a-z]+/.test(normalized);
    const invites = /invitamos|solicitamos|convocamos|pedimos a la comision|proponemos a la comision/.test(
      normalized,
    );
    const hasNumber = /\d/.test(answer);
    const hasPercentage = /\d+(?:[.,]\d+)?\s*%/.test(answer);
    const hasYear = /(?:19|20)\d{2}/.test(answer);
    const hasUrl = /https?:\/\//.test(answer);
    const opinionated = /creo que|pienso que|en mi opinion|me parece que/.test(normalized);
    const hasClosure = /(en sintesis|en conclusion|para cerrar|por todo lo anterior|invitamos a la comision|solicitamos el apoyo)/.test(
      normalized,
    );
    const paragraphs = answer.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0).length;
    const questionTokens = unique(contentTokens(input.question)).filter((token) => token.length > 3).slice(0, 16);
    const matchedTokens = questionTokens.filter((token) => normalized.includes(token)).length;
    const topicOverlap = questionTokens.length > 0 ? matchedTokens / questionTokens.length : 0;
    const uniqueRatio = words > 0 ? unique(contentTokens(answer)).length / Math.max(1, words) : 0;
    const averageSentenceLength = sentences.length > 0 ? words / sentences.length : words;

    const dialogo = clamp(
      44 +
        Math.min(22, diplomaticCount * 6) +
        (mentionsCountry ? 10 : 0) +
        Math.min(14, acknowledgeCount * 6) +
        (invites ? 6 : 0) +
        (civicTone ? 6 : 0) +
        (politeOpening ? 4 : 0) +
        (sentences.length >= 3 ? 3 : 0) +
        Math.min(5, words / 30) -
        aggressiveCount * 12,
    );

    const argumentos = clamp(
      40 +
        Math.min(22, evidenceCount * 6) +
        Math.min(9, sourceNameCount * 3) +
        (hasNumber ? 7 : 0) +
        (hasPercentage ? 4 : 0) +
        (hasYear ? 3 : 0) +
        Math.min(14, causalCount * 5) +
        Math.min(10, mechanismCount * 4) +
        (exampleCount > 0 ? 5 : 0) +
        (counterCount > 0 ? 5 : 0) +
        Math.min(12, proposalCount * 2) +
        Math.min(12, topicOverlap * 18) +
        (words >= 80 ? 5 : words >= 50 ? 3 : 0) +
        (hasUrl ? 4 : 0) -
        (evidenceCount === 0 && opinionated ? 6 : 0),
    );

    const coherencia = clamp(
      42 +
        (sentences.length >= 3 ? 6 : 0) +
        (sentences.length >= 5 ? 4 : 0) +
        (paragraphs > 1 ? 5 : 0) +
        Math.min(14, connectorCount * 5) +
        Math.min(16, topicOverlap * 24) +
        (hasClosure ? 5 : 0) +
        (mentionsCountry && sentences.length > 1 ? 2 : 0) -
        (uniqueRatio < 0.3 ? 6 : 0) -
        (averageSentenceLength > 48 ? 4 : 0),
    );

    const resolutionRaw = clamp(
      30 +
        Math.min(16, proposalCount * 5) +
        (actorCount > 0 ? 9 : 0) +
        (fundingCount > 0 ? 9 : 0) +
        (timelineCount > 0 ? 9 : 0) +
        (measurementCount > 0 ? 9 : 0) +
        (accountabilityCount > 0 ? 8 : 0) +
        (feasibilityCount > 0 ? 5 : 0) +
        (hasFallback ? 4 : 0) +
        (inclusionCount > 0 ? 4 : 0) +
        (words >= 80 ? 4 : 0),
    );
    const resolucion = resolutionExpected ? resolutionRaw : clamp(34 + resolutionRaw * 0.55);

    const weights = resolutionExpected
      ? { dialogo: 0.2, argumentos: 0.3, coherencia: 0.25, resolucion: 0.25 }
      : { dialogo: 0.22, argumentos: 0.33, coherencia: 0.3, resolucion: 0.15 };

    const criteria: CriterionScore[] = [
      {
        key: 'dialogo',
        label: 'Diálogo',
        score: Math.round(dialogo),
        level: levelOf(dialogo),
        weight: weights.dialogo,
        evidence: sentenceEvidence(DIPLOMATIC),
        advice: adviceFor('dialogo', dialogo),
      },
      {
        key: 'argumentos',
        label: 'Argumentos',
        score: Math.round(argumentos),
        level: levelOf(argumentos),
        weight: weights.argumentos,
        evidence: sentenceEvidence([...EVIDENCE, ...SOURCE_NAMES, ...CAUSAL, ...EXAMPLES]),
        advice: adviceFor('argumentos', argumentos),
      },
      {
        key: 'coherencia',
        label: 'Coherencia',
        score: Math.round(coherencia),
        level: levelOf(coherencia),
        weight: weights.coherencia,
        evidence: sentenceEvidence([...CONNECTORS, 'porque', 'en consecuencia', 'finalmente']),
        advice: adviceFor('coherencia', coherencia),
      },
      {
        key: 'resolucion',
        label: 'Resolución',
        score: Math.round(resolucion),
        level: levelOf(resolucion),
        weight: weights.resolucion,
        evidence: sentenceEvidence([
          ...PROPOSAL,
          ...ACTORS,
          ...FUNDING,
          ...TIMELINE,
          ...MEASUREMENT,
          ...ACCOUNTABILITY,
        ]),
        advice: adviceFor('resolucion', resolucion),
      },
    ];

    const overall = Math.round(
      criteria.reduce((total, criterion) => total + criterion.score * criterion.weight, 0),
    );

    const sorted = [...criteria].sort((a, b) => b.score - a.score);
    const strengths = sorted
      .slice(0, 2)
      .map((criterion) => `${criterion.label} (${criterion.score}/100): ${criterion.level.toLowerCase()}.`);
    const improvements = [...criteria]
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((criterion) => criterion.advice);

    return {
      overall,
      level: levelOf(overall),
      criteria,
      strengths,
      improvements,
      verdict: this.verdictFor(overall, resolutionExpected),
      wordCount: words,
      resolutionExpected,
    };
  }

  private minimalEvaluation(answer: string, words: number, resolutionExpected: boolean): EvaluationResult {
    const criteria: CriterionScore[] = [
      {
        key: 'dialogo',
        label: 'Diálogo',
        score: 15,
        level: 'Inicial',
        weight: 0.2,
        evidence: [truncate(answer, 160)],
        advice: adviceFor('dialogo', 15),
      },
      {
        key: 'argumentos',
        label: 'Argumentos',
        score: 10,
        level: 'Inicial',
        weight: 0.3,
        evidence: [truncate(answer, 160)],
        advice: adviceFor('argumentos', 10),
      },
      {
        key: 'coherencia',
        label: 'Coherencia',
        score: 20,
        level: 'Inicial',
        weight: 0.25,
        evidence: [truncate(answer, 160)],
        advice: adviceFor('coherencia', 20),
      },
      {
        key: 'resolucion',
        label: 'Resolución',
        score: 8,
        level: 'Inicial',
        weight: 0.25,
        evidence: [truncate(answer, 160)],
        advice: adviceFor('resolucion', 8),
      },
    ];
    return {
      overall: 12,
      level: 'Inicial',
      criteria,
      strengths: [],
      improvements: [
        'Amplía tu intervención a 80-120 palabras para que la mesa pueda evaluar tu postura.',
        'Incluye una medida concreta y una fuente verificable.',
      ],
      verdict:
        'La intervención es demasiado breve para evaluarse con rigor. Desarrolla postura, argumento y propuesta en al menos tres oraciones.',
      wordCount: words,
      resolutionExpected,
    };
  }

  private verdictFor(overall: number, resolutionExpected: boolean): string {
    if (overall >= 85) {
      return resolutionExpected
        ? 'Intervención de alto nivel: postura clara, evidencia y una propuesta verificable. Estás listo para liderar un bloque.'
        : 'Intervención de alto nivel: registro diplomático sólido y argumentación verificable. Mantén la precisión y añade una concesión táctica.';
    }
    if (overall >= 72) {
      return 'Intervención sólida. La base argumentativa funciona; refuerza el criterio más débil y cierra con una propuesta más concreta.';
    }
    if (overall >= 55) {
      return 'Intervención aceptable. Hay ideas pertinentes, pero falta evidencia o estructura. Revisa la rúbrica antes de la siguiente ronda.';
    }
    return 'Intervención inicial. Reestructura: postura en una frase, dos argumentos con fuente y una medida con responsable, plazo e indicador.';
  }
}
