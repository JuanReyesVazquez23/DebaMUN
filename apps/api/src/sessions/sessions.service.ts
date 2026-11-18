import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CountriesService } from '../countries/countries.service.js';
import type { CommitteeTopic, CountryProfile } from '../countries/countries.types.js';
import { seedFrom } from '../common/hash.js';
import type { DelegateRecord } from '../database/store.service.js';
import { StoreService } from '../database/store.service.js';
import { normalizeGrade } from './grade.js';
import type { CreateSessionDto } from './sessions.dto.js';

export interface FactOfDay {
  text: string;
  index: number;
  total: number;
  date: string;
  offset: number;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly countries: CountriesService,
    private readonly store: StoreService,
  ) {}

  async create(dto: CreateSessionDto) {
    const country = this.countries.getCountry(dto.countryCode);
    if (!country) throw new BadRequestException(`El país ${dto.countryCode} no está disponible todavía.`);

    const committee = this.countries.getCommittee(dto.committee);
    if (!committee) throw new BadRequestException(`La comisión ${dto.committee} no existe.`);

    const delegate = await this.store.createDelegate({
      username: dto.username,
      countryCode: country.code,
      committee: dto.committee,
      grade: dto.grade ?? 'secundaria-5',
    });

    return this.buildProfile(delegate, country, committee);
  }

  async getProfile(delegateId: string) {
    const delegate = await this.store.getDelegate(delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');
    const country = this.countries.requireCountry(delegate.countryCode);
    const committee = this.countries.requireCommittee(delegate.committee);
    await this.store.touchDelegate(delegateId);
    return this.buildProfile(delegate, country, committee);
  }

  async getDashboard(delegateId: string) {
    const delegate = await this.store.getDelegate(delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');
    const country = this.countries.requireCountry(delegate.countryCode);
    const committee = this.countries.requireCommittee(delegate.committee);
    const stats = await this.store.turnStats(delegateId);
    const chats = await this.store.countChats(delegateId);
    const recentTurns = await this.store.listTurns(delegateId, 5);

    const checks = [
      { id: 'perfil', label: 'Perfil y comisión configurados', done: true, weight: 20 },
      { id: 'dossier', label: 'Dossier del país asignado', done: true, weight: 15 },
      { id: 'primera', label: 'Primera intervención evaluada', done: stats.count > 0, weight: 25 },
      { id: 'tres', label: 'Tres intervenciones completadas', done: stats.count >= 3, weight: 15 },
      { id: 'asistente', label: 'Primera consulta al asistente', done: chats > 0, weight: 15 },
      { id: 'fuentes', label: 'Fuentes oficiales localizadas', done: country.sources.length >= 2, weight: 10 },
    ];
    const readinessScore = checks.filter((check) => check.done).reduce((sum, check) => sum + check.weight, 0);
    const readinessLabel =
      readinessScore >= 80 ? 'Listo para debatir' : readinessScore >= 45 ? 'En preparación' : 'Explorando';

    const nextSteps: string[] = [];
    if (stats.count === 0) nextSteps.push('Completa tu primera intervención en la Arena de debate.');
    if (stats.count > 0 && stats.count < 3) nextSteps.push('Suma al menos tres intervenciones para estabilizar tu rúbrica.');
    if (chats === 0) nextSteps.push('Pregunta al asistente por una cifra o postura que necesites defender.');
    if (country.sources.length >= 2) nextSteps.push('Abre una fuente oficial y anota dos datos verificables.');
    nextSteps.push('Ensaya una respuesta de 60 segundos con la estructura que te sugiere la pregunta.');

    const factsOfDay = this.getFacts(country.code, 0, 4);

    return {
      delegate: this.publicDelegate(delegate),
      country,
      committee,
      factOfDay: factsOfDay[0] ?? this.getFact(country.code, 0),
      factsOfDay,
      conference: this.countries.getTopics().conference,
      countdownDays: this.daysUntilConference(),
      readiness: { score: readinessScore, label: readinessLabel, checks },
      debate: {
        turns: stats.count,
        average: stats.average,
        best: stats.best,
        last: stats.last,
        recent: recentTurns.map((turn) => ({
          id: turn.id,
          question: turn.question,
          overall: turn.overall,
          createdAt: turn.createdAt,
        })),
      },
      research: { messages: chats },
      nextSteps: nextSteps.slice(0, 4),
    };
  }

  getFact(countryCode: string, offset = 0): FactOfDay {
    return this.getFacts(countryCode, offset, 1)[0] as FactOfDay;
  }

  /**
   * Devuelve un bloque de datos consecutivo para el día. El punto de partida rota a diario y
   * `offset` permite pedir el siguiente bloque sin repetir los ya mostrados.
   */
  getFacts(countryCode: string, offset = 0, count = 4): FactOfDay[] {
    const country = this.countries.getCountry(countryCode);
    if (!country) throw new NotFoundException(`No hay datos para ${countryCode}.`);

    const date = new Date().toISOString().slice(0, 10);
    const total = Math.max(1, country.facts.length);
    const base = seedFrom(`${date}:${country.code}`) % total;
    const safeOffset = Math.max(0, Math.floor(offset));
    const size = Math.min(Math.max(1, Math.floor(count)), total);

    return Array.from({ length: size }, (_, position) => {
      const shift = safeOffset + position;
      const index = (base + shift) % total;
      return {
        text: country.facts[index] ?? country.summary,
        index,
        total: country.facts.length,
        date,
        offset: shift,
      };
    });
  }

  private buildProfile(delegate: DelegateRecord, country: CountryProfile, committee: CommitteeTopic) {
    return {
      delegate: this.publicDelegate(delegate),
      country,
      committee,
      factOfDay: this.getFact(country.code, 0),
      conference: this.countries.getTopics().conference,
      countdownDays: this.daysUntilConference(),
    };
  }

  private publicDelegate(delegate: DelegateRecord) {
    return {
      id: delegate.id,
      username: delegate.username,
      countryCode: delegate.countryCode,
      committee: delegate.committee,
      grade: normalizeGrade(delegate.grade) ?? delegate.grade,
      createdAt: delegate.createdAt,
    };
  }

  private daysUntilConference(): number {
    const target = new Date(`${this.countries.getTopics().conference.date}T00:00:00Z`).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((target - now) / 86_400_000));
  }
}
