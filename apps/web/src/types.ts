export type CommitteeId = 'UNESCO' | 'ECOSOC';

export type GradeId = '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'universidad';

export interface CountryPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CountrySource {
  label: string;
  url: string;
  kind: string;
}

export interface CountrySummary {
  code: string;
  slug: string;
  name: string;
  officialName: string;
  flag: string;
  region: string;
  palette: CountryPalette;
  summary: string;
  unMember: boolean;
}

export interface CommitteeStance {
  position: string;
  priorities: string[];
  vulnerability: string;
  leverage: string;
}

export interface CountryProfile extends CountrySummary {
  capital: string;
  languages: string[];
  modelNote?: string;
  unProfile: {
    bloc: string;
    style: string;
    allies: string[];
    tensions: string[];
    redLines: string[];
  };
  context: {
    aiAndEducation: string;
    youthLabour: string;
    digitalGovernance: string;
  };
  unesco: CommitteeStance;
  ecosoc: CommitteeStance;
  tips: string[];
  facts: string[];
  sources: CountrySource[];
}

export interface Subtopic {
  id: string;
  label: string;
  description: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface CommitteeTopic {
  id: CommitteeId;
  name: string;
  abbr: string;
  room: string;
  topic: string;
  shortTopic: string;
  mandate: string;
  essentialQuestion: string;
  subtopics: Subtopic[];
  keyQuestions: string[];
  glossary: GlossaryEntry[];
  policyLevers: string[];
  debateTensions: string[];
  actors: string[];
  sources: CountrySource[];
}

export interface ConferenceInfo {
  name: string;
  edition: string;
  date: string;
  weekday: string;
  format: string;
  note: string;
}

export interface FactOfDay {
  text: string;
  index: number;
  total: number;
  date: string;
  offset: number;
}

export interface Delegate {
  id: string;
  username: string;
  countryCode: string;
  committee: CommitteeId;
  grade?: GradeId | null;
  createdAt: string;
}

export interface SessionProfile {
  delegate: Delegate;
  country: CountryProfile;
  committee: CommitteeTopic;
  factOfDay: FactOfDay;
  conference: ConferenceInfo;
  countdownDays: number;
}

export interface ReadinessCheck {
  id: string;
  label: string;
  done: boolean;
  weight: number;
}

export interface DashboardData extends SessionProfile {
  readiness: {
    score: number;
    label: string;
    checks: ReadinessCheck[];
  };
  debate: {
    turns: number;
    average: number;
    best: number;
    last: number | null;
    recent: Array<{ id: string; question: string; overall: number; createdAt: string }>;
  };
  research: { messages: number };
  nextSteps: string[];
}

export type QuestionKind =
  | 'apertura'
  | 'seguimiento'
  | 'contrapunto'
  | 'crisis'
  | 'resolucion'
  | 'punto_informacion'
  | 'datos';

export interface GeneratedQuestion {
  id: string;
  committee: CommitteeId;
  kind: QuestionKind;
  difficulty: 1 | 2 | 3;
  text: string;
  focus: string;
  focusId: string;
  angle: string;
  whyItMatters: string;
  suggestedStructure: string[];
  timeSeconds: number;
  resolutionExpected: boolean;
}

export interface DebateSessionInfo {
  id: string;
  committee: CommitteeId;
  difficulty: 1 | 2 | 3;
  questionCount: number;
  uniqueAsked: number;
}

export interface NextQuestionResponse {
  question: GeneratedQuestion;
  session: DebateSessionInfo;
}

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

export interface Evaluation {
  overall: number;
  level: string;
  criteria: CriterionScore[];
  strengths: string[];
  improvements: string[];
  verdict: string;
  wordCount: number;
  resolutionExpected: boolean;
}

export interface TurnResult {
  evaluation: Evaluation;
  turn: { id: string; createdAt: string; overall: number };
  stats: { count: number; average: number; best: number; last: number | null };
  nextStep: string;
}

export interface ResearchSource {
  label: string;
  url: string;
  kind: string;
  title: string;
  snippet: string;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  confidence: 'alta' | 'media' | 'baja';
  provider: 'local' | 'scraper' | 'llm';
  passages: Array<{ title: string; text: string; source: string; url: string; score: number }>;
  suggestedQuestions: string[];
  cached: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: unknown;
  createdAt: string;
}
