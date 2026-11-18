import { describe, expect, it } from 'vitest';
import { ScoringService } from './scoring.service.js';

const service = new ScoringService();

const question =
  '¿Cómo garantizar que la IA generativa amplíe el aprendizaje sin sustituir el pensamiento crítico de los jóvenes?';

const strongAnswer =
  'Honorable Presidencia, la delegación de Suiza reconoce la preocupación de otras delegaciones por la brecha digital. ' +
  'Según UNESCO (2023), el uso de IA en educación debe subordinarse a fines pedagógicos y a la protección de datos. ' +
  'En primer lugar, proponemos crear un fondo nacional de formación docente con financiamiento mixto y auditoría independiente. ' +
  'En segundo lugar, establecemos un piloto obligatorio en centros rurales durante 12 meses, con un indicador de aprendizaje, otro de pensamiento crítico y otro de equidad entre jóvenes. ' +
  'El ministerio de educación será responsable de la ejecución y un comité externo rendirá cuentas ante el parlamento. ' +
  'Por lo tanto, invitamos a la comisión a adoptar este mecanismo gradual, proporcional y verificable.';

const weakAnswer =
  'Creo que la educación es muy importante para los jóvenes y debemos ayudar porque la tecnología es el futuro y hay que usarla bien.';

describe('ScoringService', () => {
  it('devuelve los cuatro criterios con pesos y evidencia', () => {
    const result = service.evaluate({
      question,
      answer: strongAnswer,
      kind: 'resolucion',
      countryName: 'Suiza',
    });

    expect(result.criteria).toHaveLength(4);
    expect(result.criteria.map((criterion) => criterion.key)).toEqual([
      'dialogo',
      'argumentos',
      'coherencia',
      'resolucion',
    ]);
    expect(result.criteria.every((criterion) => criterion.evidence.length > 0)).toBe(true);
    expect(result.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)).toBeCloseTo(1);
    expect(result.resolutionExpected).toBe(true);
    expect(result.wordCount).toBeGreaterThan(70);
  });

  it('puntúa mejor una intervención con evidencia, estructura y propuesta', () => {
    const strong = service.evaluate({
      question,
      answer: strongAnswer,
      kind: 'resolucion',
      countryName: 'Suiza',
    });
    const weak = service.evaluate({
      question,
      answer: weakAnswer,
      kind: 'resolucion',
      countryName: 'Suiza',
    });

    expect(strong.overall).toBeGreaterThan(weak.overall);
    expect(strong.overall).toBeGreaterThanOrEqual(85);
    expect(weak.overall).toBeLessThan(60);
    expect(strong.improvements.length).toBeGreaterThan(0);
  });

  it('no exige fórmulas rígidas para reconocer una intervención clara', () => {
    const answer =
      'La delegación de Suiza considera que la prioridad es formar docentes antes de comprar tecnología. ' +
      'Un informe de la OCDE muestra que la capacitación mejora el aprendizaje y reduce la brecha digital. ' +
      'Proponemos un fondo tripartito para formar 20.000 docentes en dos años, con evaluación externa y un indicador de aprendizaje. ' +
      'Si el piloto no mejora los resultados, el fondo se reasigna a tutorías presenciales. ' +
      'Invitamos a la comisión a apoyar esta medida gradual y verificable.';

    const result = service.evaluate({
      question,
      answer,
      kind: 'resolucion',
      countryName: 'Suiza',
    });

    expect(result.overall).toBeGreaterThanOrEqual(72);
    expect(result.criteria.find((criterion) => criterion.key === 'dialogo')?.score).toBeGreaterThan(60);
  });

  it('da feedback mínimo y accionable cuando la respuesta es demasiado breve', () => {    const result = service.evaluate({
      question,
      answer: 'Suiza apoya la educación.',
      kind: 'apertura',
      countryName: 'Suiza',
    });

    expect(result.overall).toBeLessThan(20);
    expect(result.verdict).toContain('demasiado breve');
    expect(result.improvements).toHaveLength(2);
  });

  it('rebaja el peso de resolución cuando la pregunta no la exige', () => {
    const result = service.evaluate({
      question: '¿Qué principio debe prevalecer?',
      answer: strongAnswer,
      kind: 'apertura',
      countryName: 'Suiza',
    });

    const resolution = result.criteria.find((criterion) => criterion.key === 'resolucion');
    expect(result.resolutionExpected).toBe(false);
    expect(resolution?.weight).toBe(0.15);
  });
});
