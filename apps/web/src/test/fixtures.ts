import type {
  CommitteeTopic,
  ConferenceInfo,
  CountryProfile,
  DashboardData,
  NextQuestionResponse,
  SessionProfile,
  TurnResult,
} from '../types';

export const conference: ConferenceInfo = {
  name: 'Ecosoft',
  edition: 'Modelo Interno de las Naciones Unidas 2026',
  date: '2026-12-09',
  weekday: 'miércoles',
  format: 'Dos comisiones simultáneas',
  note: 'Material de preparación editorial.',
};

export const country: CountryProfile = {
  code: 'CH',
  slug: 'suiza',
  name: 'Suiza',
  officialName: 'Confederación Suiza',
  flag: '🇨🇭',
  region: 'Europa Occidental',
  capital: 'Berna',
  languages: ['alemán', 'francés', 'italiano', 'romanche'],
  unMember: true,
  palette: { primary: '#D52B1E', secondary: '#FFFFFF', accent: '#0B6FB8' },
  summary: 'Democracia federal con tradición humanitaria y mediación diplomática.',
  unProfile: {
    bloc: 'Europa Occidental; neutralidad; Ginebra internacional',
    style: 'Técnico, prudente y mediador.',
    allies: ['Austria', 'Suecia', 'Irlanda'],
    tensions: ['Relación con la UE', 'Banca y transparencia'],
    redLines: ['Defiende la neutralidad', 'No acepta condicionalidades que limiten el derecho humanitario'],
  },
  context: {
    aiAndEducation: 'Cantones con autonomía educativa y fuerte formación profesional dual.',
    youthLabour: 'Desempleo juvenil bajo, con presión sobre vivienda y costo de vida.',
    digitalGovernance: 'Ley de protección de datos revisada y estrategia nacional de IA.',
  },
  unesco: {
    position: 'Apoya formación docente, protección de datos y equidad entre zonas urbanas y rurales.',
    priorities: ['Formación docente con evidencia', 'Protección de datos', 'Equidad regional'],
    vulnerability: 'La autonomía cantonal dificulta estándares homogéneos.',
    leverage: 'Investigación aplicada, formación dual y tradición de mediación.',
  },
  ecosoc: {
    position: 'Prioriza aprendizaje continuo, diálogo social y transición justa.',
    priorities: ['Recualificación', 'PYMES', 'Protección social'],
    vulnerability: 'La dependencia del comercio expone el empleo a shocks externos.',
    leverage: 'Formación dual y tripartismo.',
  },
  tips: ['Habla de formación dual con ejemplos concretos.', 'Reconoce la autonomía cantonal.'],
  facts: ['Suiza tiene cuatro lenguas oficiales.', 'Berna es la capital federal.'],
  sources: [
    { label: 'Gobierno de Suiza', url: 'https://www.admin.ch/', kind: 'official' },
    { label: 'UNESCO · IA y educación', url: 'https://www.unesco.org/en/digital-education/artificial-intelligence', kind: 'multilateral' },
  ],
};

export const committee: CommitteeTopic = {
  id: 'UNESCO',
  name: 'Educación, Ciencia y Cultura',
  abbr: 'UNESCO',
  room: 'Sala UNESCO · Educación',
  topic: 'IA generativa en la educación',
  shortTopic: 'IA generativa en la educación',
  mandate: 'Coordinar estándares educativos con derechos humanos.',
  essentialQuestion: '¿Cómo garantizar que la IA amplíe el aprendizaje sin sustituir el pensamiento crítico?',
  subtopics: [
    { id: 'docentes', label: 'Formación y rol docente', description: 'Competencias docentes y evaluación.' },
    { id: 'brecha', label: 'Brecha digital', description: 'Acceso, conectividad y equidad.' },
  ],
  keyQuestions: ['¿Qué evidencia sostiene la postura?'],
  glossary: [{ term: 'Alfabetización en IA', definition: 'Capacidad de usar y evaluar sistemas de IA.' }],
  policyLevers: ['Formación docente', 'Compra pública'],
  debateTensions: ['Innovación frente a protección', 'Eficiencia frente a equidad'],
  actors: ['Ministerio de Educación', 'Docentes'],
  sources: [{ label: 'UNESCO · IA y educación', url: 'https://www.unesco.org/en/digital-education/artificial-intelligence', kind: 'multilateral' }],
};

export const factOfDay = {
  text: 'Suiza tiene cuatro lenguas oficiales.',
  index: 0,
  total: 2,
  date: '2026-11-16',
  offset: 0,
};

export const profile: SessionProfile = {
  delegate: {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'Valentina Ríos',
    countryCode: 'CH',
    committee: 'UNESCO',
    grade: '10',
    createdAt: '2026-11-16T10:00:00.000Z',
  },
  country,
  committee,
  factOfDay,
  conference,
  countdownDays: 23,
};

export const dashboard: DashboardData = {
  ...profile,
  readiness: {
    score: 45,
    label: 'En preparación',
    checks: [
      { id: 'perfil', label: 'Perfil y comisión configurados', done: true, weight: 20 },
      { id: 'primera', label: 'Primera intervención evaluada', done: false, weight: 25 },
    ],
  },
  debate: { turns: 0, average: 0, best: 0, last: null, recent: [] },
  research: { messages: 0 },
  nextSteps: ['Completa tu primera intervención en la Arena de debate.'],
};

export const nextQuestion: NextQuestionResponse = {
  question: {
    id: 'q-1',
    committee: 'UNESCO',
    kind: 'apertura',
    difficulty: 1,
    text: 'Honorable Presidencia: la delegación de Suiza fija posición sobre «Formación y rol docente». ¿Qué principio debe prevalecer?',
    focus: 'Formación y rol docente',
    focusId: 'docentes',
    angle: 'Apertura · Formación y rol docente',
    whyItMatters: 'La formación docente es la variable con mayor impacto.',
    suggestedStructure: ['Cortesía y postura', 'Principio + evidencia', 'Medida concreta'],
    timeSeconds: 90,
    resolutionExpected: false,
  },
  session: {
    id: '22222222-2222-4222-8222-222222222222',
    committee: 'UNESCO',
    difficulty: 2,
    questionCount: 1,
    uniqueAsked: 1,
  },
};

export const evaluation = {
  overall: 78,
  level: 'Competente',
  criteria: [
    { key: 'dialogo' as const, label: 'Diálogo', score: 80, level: 'Destacado' as const, weight: 0.22, evidence: ['Honorable Presidencia, la delegación de Suiza reconoce…'], advice: 'Mantén la cortesía y añade una concesión táctica.' },
    { key: 'argumentos' as const, label: 'Argumentos', score: 76, level: 'Competente' as const, weight: 0.33, evidence: ['Según la OIT, el empleo juvenil…'], advice: 'Añade una cifra verificable.' },
    { key: 'coherencia' as const, label: 'Coherencia', score: 74, level: 'Competente' as const, weight: 0.3, evidence: ['En primer lugar…'], advice: 'Cierra con una síntesis.' },
    { key: 'resolucion' as const, label: 'Resolución', score: 70, level: 'Competente' as const, weight: 0.15, evidence: ['Proponemos un piloto…'], advice: 'Define el indicador.' },
  ],
  strengths: ['Diálogo (80/100).'],
  improvements: ['Añade una fuente concreta.'],
  verdict: 'Intervención sólida.',
  wordCount: 96,
  resolutionExpected: false,
};

/** Comisión ECOSOC: empleo juvenil e inteligencia artificial. */
export const committeeEcosoc: CommitteeTopic = {
  id: 'ECOSOC',
  name: 'Económico y Social',
  abbr: 'ECOSOC',
  room: 'Sala ECOSOC · Empleo',
  topic: 'El futuro del empleo juvenil ante la inteligencia artificial',
  shortTopic: 'Futuro del empleo juvenil ante la IA',
  mandate: 'Promover trabajo decente y protección social en la transición digital.',
  essentialQuestion:
    '¿Qué políticas garantizan trabajo decente para la juventud cuando la IA transforma tareas, plataformas y habilidades?',
  subtopics: [
    { id: 'transicion', label: 'Transición escuela-trabajo', description: 'Puentes entre formación y empleo.' },
    { id: 'plataformas', label: 'Plataformas', description: 'Estatus laboral y algoritmos.' },
  ],
  keyQuestions: ['¿Qué evidencia sostiene la postura de Suiza?'],
  glossary: [{ term: 'Trabajo decente', definition: 'Empleo con derechos, protección y diálogo social.' }],
  policyLevers: ['Recualificación', 'Protección social'],
  debateTensions: ['Flexibilidad frente a protección', 'Innovación frente a empleo'],
  actors: ['Ministerio de Trabajo', 'Sindicatos'],
  sources: [
    { label: 'OIT · Empleo juvenil', url: 'https://www.ilo.org/topics/youth-employment', kind: 'multilateral' },
  ],
};

export const profileEcosoc: SessionProfile = {
  ...profile,
  delegate: { ...profile.delegate, id: '33333333-3333-4333-8333-333333333333', committee: 'ECOSOC' },
  committee: committeeEcosoc,
};

export const dashboardEcosoc: DashboardData = {
  ...dashboard,
  ...profileEcosoc,
};

export const nextQuestionEcosoc: NextQuestionResponse = {
  ...nextQuestion,
  question: {
    ...nextQuestion.question,
    id: 'q-eco-1',
    committee: 'ECOSOC',
    text: 'Honorable Presidencia: la delegación de Suiza fija posición sobre «Transición escuela-trabajo». ¿Qué mecanismo propone para que la IA no expulse a la juventud del empleo formal?',
    focus: 'Transición escuela-trabajo',
    focusId: 'transicion',
    angle: 'Apertura · Transición escuela-trabajo',
  },
  session: { ...nextQuestion.session, id: 's-1', committee: 'ECOSOC' },
};

export const turnResult: TurnResult = {
  evaluation,
  turn: { id: 't-1', createdAt: '2026-11-16T11:00:00.000Z', overall: 78 },
  stats: { count: 1, average: 78, best: 78, last: 78 },
  nextStep: 'Buen nivel. Sube la dificultad pidiendo una pregunta de crisis o resolución.',
};
