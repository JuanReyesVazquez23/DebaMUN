export type CommitteeId = 'UNESCO' | 'ECOSOC';

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

export interface CountryOrganization {
  name: string;
  detail: string;
  url: string;
}

export interface FuturePlan {
  title: string;
  detail: string;
}

export interface CountryFuturePlans {
  /** Planes oficiales anunciados por el país. */
  national: FuturePlan[];
  /** Propuestas del modelo para el debate, no posiciones oficiales. */
  proposals: FuturePlan[];
}

export interface CountryProfile {
  code: string;
  slug: string;
  name: string;
  officialName: string;
  flag: string;
  region: string;
  capital: string;
  languages: string[];
  unMember: boolean;
  modelNote?: string;
  palette: CountryPalette;
  summary: string;
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
  organizations: CountryOrganization[];
  futurePlans?: CountryFuturePlans;
  sources: CountrySource[];
}

export interface CommitteeStance {
  position: string;
  priorities: string[];
  vulnerability: string;
  leverage: string;
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

export interface TopicConfig {
  conference: ConferenceInfo;
  committees: CommitteeTopic[];
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
