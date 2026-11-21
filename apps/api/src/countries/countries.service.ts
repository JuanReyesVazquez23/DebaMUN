import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  CommitteeId,
  CommitteeTopic,
  CountryOrganization,
  CountryProfile,
  CountrySummary,
  TopicConfig,
} from './countries.types.js';

function findDataDir(): string {
  const candidates = [
    process.env.DATA_DIR,
    resolve(process.cwd(), '../../data'),
    resolve(process.cwd(), 'data'),
    resolve(process.cwd(), '../data'),
    resolve(process.cwd(), '../../../../data'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'topics.json'))) return candidate;
  }
  throw new Error(
    `No se encontró el corpus de DebaMun. Define DATA_DIR. Buscado en: ${candidates.join(', ')}`,
  );
}

@Injectable()
export class CountriesService implements OnModuleInit {
  private readonly logger = new Logger(CountriesService.name);
  private countries = new Map<string, CountryProfile>();
  private topics: TopicConfig | null = null;
  private dataDir = '';

  onModuleInit(): void {
    this.dataDir = findDataDir();
    this.loadCountries();
    this.loadTopics();
  }

  private loadCountries(): void {
    const countriesDir = join(this.dataDir, 'countries');
    const files = readdirSync(countriesDir).filter((file) => file.endsWith('.json'));
    const organizations = this.loadOrganizations();
    const loaded: CountryProfile[] = [];

    for (const file of files) {
      const raw = JSON.parse(readFileSync(join(countriesDir, file), 'utf8')) as CountryProfile[];
      if (!Array.isArray(raw)) throw new Error(`Formato inválido en ${file}`);
      for (const country of raw) {
        if (!country.code || !country.name || !country.palette) {
          throw new Error(`Dossier incompleto en ${file}: ${JSON.stringify(country).slice(0, 80)}`);
        }
        loaded.push({
          ...country,
          organizations: organizations.get(country.code.toUpperCase()) ?? [],
        });
      }
    }

    this.countries = new Map(loaded.map((country) => [country.code.toUpperCase(), country]));
    this.logger.log(`Corpus cargado: ${loaded.length} países desde ${files.length} archivos.`);
  }

  private loadOrganizations(): Map<string, CountryOrganization[]> {
    const file = join(this.dataDir, 'organizations.json');
    if (!existsSync(file)) return new Map();

    const raw = JSON.parse(readFileSync(file, 'utf8')) as {
      countries?: Record<string, CountryOrganization[]>;
    };
    const entries: Array<[string, CountryOrganization[]]> = Object.entries(raw.countries ?? {}).map(
      ([code, list]) => [code.toUpperCase(), list],
    );
    this.logger.log(
      `Organizaciones cargadas: ${entries.reduce((total, [, list]) => total + list.length, 0)} en ${entries.length} países.`,
    );
    return new Map(entries);
  }

  private loadTopics(): void {
    this.topics = JSON.parse(readFileSync(join(this.dataDir, 'topics.json'), 'utf8')) as TopicConfig;
    this.logger.log(`Briefing cargado: ${this.topics.committees.map((item) => item.id).join(', ')}.`);
  }

  listCountries(): CountrySummary[] {
    return [...this.countries.values()]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((country) => ({
        code: country.code,
        slug: country.slug,
        name: country.name,
        officialName: country.officialName,
        flag: country.flag,
        region: country.region,
        palette: country.palette,
        summary: country.summary,
        unMember: country.unMember,
      }));
  }

  getCountry(code: string): CountryProfile | null {
    return this.countries.get(code.trim().toUpperCase()) ?? null;
  }

  getCountryBySlug(slug: string): CountryProfile | null {
    const needle = slug.trim().toLowerCase();
    return [...this.countries.values()].find((country) => country.slug === needle) ?? null;
  }

  requireCountry(code: string): CountryProfile {
    const country = this.getCountry(code);
    if (!country) throw new Error(`País no disponible: ${code}`);
    return country;
  }

  getTopics(): TopicConfig {
    if (!this.topics) throw new Error('Briefing no cargado');
    return this.topics;
  }

  listCommittees(): CommitteeTopic[] {
    return this.getTopics().committees;
  }

  getCommittee(id: string): CommitteeTopic | null {
    const needle = id.trim().toUpperCase();
    return this.getTopics().committees.find((committee) => committee.id === needle) ?? null;
  }

  requireCommittee(id: string): CommitteeTopic {
    const committee = this.getCommittee(id);
    if (!committee) throw new Error(`Comisión no disponible: ${id}`);
    return committee;
  }

  getStance(country: CountryProfile, committee: CommitteeId) {
    return committee === 'UNESCO' ? country.unesco : country.ecosoc;
  }

  getDataDir(): string {
    return this.dataDir;
  }
}
