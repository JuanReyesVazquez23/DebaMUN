import { Injectable, NotFoundException } from '@nestjs/common';
import { CountriesService } from '../countries/countries.service.js';
import { RateLimitService } from '../common/rate-limit.service.js';
import { sanitizeUserText, truncate } from '../common/text.js';
import { StoreService } from '../database/store.service.js';
import type { CreateDebateSessionDto, SubmitTurnDto } from './debate.dto.js';
import { QuestionGenerator } from './question.generator.js';
import { ScoringService } from './scoring.service.js';

@Injectable()
export class DebateService {
  constructor(
    private readonly store: StoreService,
    private readonly countries: CountriesService,
    private readonly generator: QuestionGenerator,
    private readonly scoring: ScoringService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async createSession(dto: CreateDebateSessionDto) {
    const delegate = await this.store.getDelegate(dto.delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');
    const session = await this.store.createDebateSession(
      delegate.id,
      delegate.committee,
      dto.difficulty,
    );
    return {
      session,
      delegate: { id: delegate.id, committee: delegate.committee, grade: delegate.grade },
    };
  }

  async nextQuestion(sessionId: string) {
    const session = await this.store.getDebateSession(sessionId);
    if (!session) throw new NotFoundException('Sesión de debate no encontrada.');
    const delegate = await this.store.getDelegate(session.delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');

    this.rateLimit.check(`debate:next:${delegate.id}`, 60, 60_000);

    const country = this.countries.requireCountry(delegate.countryCode);
    const committee = this.countries.requireCommittee(session.committee);
    const question = this.generator.next({
      committee,
      country,
      sessionId: session.id,
      questionCount: session.questionCount,
      askedIds: session.askedIds,
      difficulty: session.difficulty,
    });

    await this.store.recordAskedQuestion(session.id, question.id);

    return {
      question,
      session: {
        id: session.id,
        committee: session.committee,
        difficulty: session.difficulty,
        questionCount: session.questionCount + 1,
        uniqueAsked: session.askedIds.length + 1,
      },
    };
  }

  async submitTurn(dto: SubmitTurnDto) {
    const session = await this.store.getDebateSession(dto.sessionId);
    if (!session) throw new NotFoundException('Sesión de debate no encontrada.');
    const delegate = await this.store.getDelegate(session.delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');

    this.rateLimit.check(`debate:submit:${delegate.id}`, 30, 60_000);

    const country = this.countries.requireCountry(delegate.countryCode);
    const answer = sanitizeUserText(dto.answer, 6000);
    const question = sanitizeUserText(dto.question, 1200);
    const evaluation = this.scoring.evaluate({
      question,
      answer,
      kind: dto.kind,
      countryName: country.name,
    });

    const turn = await this.store.addTurn({
      sessionId: session.id,
      delegateId: delegate.id,
      questionId: dto.questionId,
      question,
      questionKind: dto.kind,
      answer,
      scores: evaluation.criteria,
      overall: evaluation.overall,
      feedback: {
        verdict: evaluation.verdict,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        level: evaluation.level,
        resolutionExpected: evaluation.resolutionExpected,
      },
    });

    const stats = await this.store.turnStats(delegate.id);
    await this.store.touchDelegate(delegate.id);

    return {
      evaluation,
      turn: {
        id: turn.id,
        createdAt: turn.createdAt,
        overall: turn.overall,
      },
      stats,
      nextStep:
        evaluation.overall >= 70
          ? 'Buen nivel. Sube la dificultad pidiendo una pregunta de crisis o resolución.'
          : `Prioriza esta mejora: ${truncate(evaluation.improvements[0] ?? 'Añade evidencia verificable.', 220)}`,
    };
  }

  async history(delegateId: string, limit = 20) {
    const delegate = await this.store.getDelegate(delegateId);
    if (!delegate) throw new NotFoundException('Delegado no encontrado.');
    const [turns, stats] = await Promise.all([
      this.store.listTurns(delegateId, Math.min(Math.max(limit, 1), 50)),
      this.store.turnStats(delegateId),
    ]);
    return {
      turns: turns.map((turn) => ({
        id: turn.id,
        questionId: turn.questionId,
        question: turn.question,
        kind: turn.questionKind,
        answer: turn.answer,
        scores: turn.scores,
        overall: turn.overall,
        feedback: turn.feedback,
        createdAt: turn.createdAt,
      })),
      stats,
    };
  }
}
