import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from './database.service.js';
import type { CommitteeId } from '../countries/countries.types.js';

export interface DelegateRecord {
  id: string;
  username: string;
  countryCode: string;
  committee: CommitteeId;
  grade: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface DebateSessionRecord {
  id: string;
  delegateId: string;
  committee: CommitteeId;
  difficulty: 1 | 2 | 3;
  askedIds: string[];
  questionCount: number;
  createdAt: string;
}

export interface DebateTurnRecord {
  id: string;
  sessionId: string;
  delegateId: string;
  questionId: string;
  question: string;
  questionKind: string;
  answer: string;
  scores: unknown;
  overall: number;
  feedback: unknown;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  delegateId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: unknown;
  createdAt: string;
}

export interface TurnStats {
  count: number;
  average: number;
  best: number;
  last: number | null;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);
  private readonly delegates = new Map<string, DelegateRecord>();
  private readonly sessions = new Map<string, DebateSessionRecord>();
  private readonly turns = new Map<string, DebateTurnRecord[]>();
  private readonly chats = new Map<string, ChatMessageRecord[]>();

  constructor(private readonly db: DatabaseService) {}

  async createDelegate(input: {
    username: string;
    countryCode: string;
    committee: CommitteeId;
    grade?: string | null;
  }): Promise<DelegateRecord> {
    const now = new Date().toISOString();
    const record: DelegateRecord = {
      id: randomUUID(),
      username: input.username,
      countryCode: input.countryCode,
      committee: input.committee,
      grade: input.grade ?? null,
      createdAt: now,
      lastSeenAt: now,
    };

    if (this.db.isReady) {
      try {
        await this.db.query(
          `insert into delegates (id, username, country_code, committee, grade) values ($1, $2, $3, $4, $5)`,
          [record.id, record.username, record.countryCode, record.committee, record.grade],
        );
        return record;
      } catch (error) {
        this.logger.warn(`Fallo al guardar delegado en PostgreSQL: ${(error as Error).message}`);
      }
    }

    this.delegates.set(record.id, record);
    return record;
  }

  async getDelegate(id: string): Promise<DelegateRecord | null> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select id, username, country_code, committee, grade, created_at, last_seen_at from delegates where id = $1`,
          [id],
        );
        const row = result.rows[0];
        if (row) return this.mapDelegate(row);
      } catch (error) {
        this.logger.warn(`Fallo al leer delegado: ${(error as Error).message}`);
      }
    }
    return this.delegates.get(id) ?? null;
  }

  async touchDelegate(id: string): Promise<void> {
    const now = new Date().toISOString();
    if (this.db.isReady) {
      try {
        await this.db.query(`update delegates set last_seen_at = now() where id = $1`, [id]);
        return;
      } catch (error) {
        this.logger.warn(`Fallo al actualizar delegado: ${(error as Error).message}`);
      }
    }
    const record = this.delegates.get(id);
    if (record) this.delegates.set(id, { ...record, lastSeenAt: now });
  }

  async createDebateSession(
    delegateId: string,
    committee: CommitteeId,
    difficulty: 1 | 2 | 3 = 2,
  ): Promise<DebateSessionRecord> {
    const record: DebateSessionRecord = {
      id: randomUUID(),
      delegateId,
      committee,
      difficulty,
      askedIds: [],
      questionCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (this.db.isReady) {
      try {
        await this.db.query(
          `insert into debate_sessions (id, delegate_id, committee, difficulty, asked_ids, question_count)
           values ($1, $2, $3, $4, '[]'::jsonb, 0)`,
          [record.id, delegateId, committee, difficulty],
        );
        return record;
      } catch (error) {
        this.logger.warn(`Fallo al crear sesión de debate: ${(error as Error).message}`);
      }
    }

    this.sessions.set(record.id, record);
    return record;
  }

  async getDebateSession(id: string): Promise<DebateSessionRecord | null> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select id, delegate_id, committee, difficulty, asked_ids, question_count, created_at
           from debate_sessions where id = $1`,
          [id],
        );
        const row = result.rows[0];
        if (row) return this.mapSession(row);
      } catch (error) {
        this.logger.warn(`Fallo al leer sesión de debate: ${(error as Error).message}`);
      }
    }
    return this.sessions.get(id) ?? null;
  }

  async recordAskedQuestion(sessionId: string, questionId: string): Promise<void> {
    if (this.db.isReady) {
      try {
        await this.db.query(
          `update debate_sessions
           set asked_ids = asked_ids || to_jsonb($2::text), question_count = question_count + 1
           where id = $1`,
          [sessionId, questionId],
        );
        return;
      } catch (error) {
        this.logger.warn(`Fallo al registrar pregunta: ${(error as Error).message}`);
      }
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, {
        ...session,
        askedIds: [...new Set([...session.askedIds, questionId])],
        questionCount: session.questionCount + 1,
      });
    }
  }

  async addTurn(input: Omit<DebateTurnRecord, 'id' | 'createdAt'>): Promise<DebateTurnRecord> {
    const record: DebateTurnRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    if (this.db.isReady) {
      try {
        await this.db.query(
          `insert into debate_turns
            (id, session_id, delegate_id, question_id, question, question_kind, answer, scores, overall, feedback)
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)`,
          [
            record.id,
            record.sessionId,
            record.delegateId,
            record.questionId,
            record.question,
            record.questionKind,
            record.answer,
            JSON.stringify(record.scores),
            record.overall,
            JSON.stringify(record.feedback),
          ],
        );
        return record;
      } catch (error) {
        this.logger.warn(`Fallo al guardar turno: ${(error as Error).message}`);
      }
    }

    const list = this.turns.get(record.delegateId) ?? [];
    list.unshift(record);
    this.turns.set(record.delegateId, list.slice(0, 100));
    return record;
  }

  async listTurns(delegateId: string, limit = 20): Promise<DebateTurnRecord[]> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select id, session_id, delegate_id, question_id, question, question_kind, answer,
                  scores, overall, feedback, created_at
           from debate_turns where delegate_id = $1 order by created_at desc limit $2`,
          [delegateId, limit],
        );
        return result.rows.map((row) => this.mapTurn(row));
      } catch (error) {
        this.logger.warn(`Fallo al listar turnos: ${(error as Error).message}`);
      }
    }
    return (this.turns.get(delegateId) ?? []).slice(0, limit);
  }

  async turnStats(delegateId: string): Promise<TurnStats> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select count(*)::int as count,
                  coalesce(avg(overall), 0)::float as average,
                  coalesce(max(overall), 0)::int as best,
                  (select overall from debate_turns t2
                   where t2.delegate_id = $1 order by created_at desc limit 1) as last
           from debate_turns where delegate_id = $1`,
          [delegateId],
        );
        const row = result.rows[0] as
          | { count: number; average: number; best: number; last: number | null }
          | undefined;
        if (row) {
          return {
            count: Number(row.count),
            average: Math.round(Number(row.average)),
            best: Number(row.best),
            last: row.last === null || row.last === undefined ? null : Number(row.last),
          };
        }
      } catch (error) {
        this.logger.warn(`Fallo al calcular estadísticas: ${(error as Error).message}`);
      }
    }

    const list = this.turns.get(delegateId) ?? [];
    if (list.length === 0) return { count: 0, average: 0, best: 0, last: null };
    const scores = list.map((turn) => turn.overall);
    return {
      count: list.length,
      average: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      best: Math.max(...scores),
      last: list[0]?.overall ?? null,
    };
  }

  async addChatMessage(input: Omit<ChatMessageRecord, 'id' | 'createdAt'>): Promise<ChatMessageRecord> {
    const record: ChatMessageRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    if (this.db.isReady) {
      try {
        await this.db.query(
          `insert into chat_messages (id, delegate_id, role, content, sources)
           values ($1, $2, $3, $4, $5::jsonb)`,
          [record.id, record.delegateId, record.role, record.content, JSON.stringify(record.sources)],
        );
        return record;
      } catch (error) {
        this.logger.warn(`Fallo al guardar mensaje: ${(error as Error).message}`);
      }
    }

    const list = this.chats.get(record.delegateId) ?? [];
    list.push(record);
    this.chats.set(record.delegateId, list.slice(-80));
    return record;
  }

  async listChatMessages(delegateId: string, limit = 30): Promise<ChatMessageRecord[]> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select id, delegate_id, role, content, sources, created_at
           from chat_messages where delegate_id = $1 order by created_at asc limit $2`,
          [delegateId, limit],
        );
        return result.rows.map((row) => ({
          id: String(row.id),
          delegateId: String(row.delegate_id),
          role: row.role === 'assistant' ? 'assistant' : 'user',
          content: String(row.content),
          sources: row.sources,
          createdAt: new Date(row.created_at as string).toISOString(),
        }));
      } catch (error) {
        this.logger.warn(`Fallo al listar mensajes: ${(error as Error).message}`);
      }
    }
    return (this.chats.get(delegateId) ?? []).slice(-limit);
  }

  async countChats(delegateId: string): Promise<number> {
    if (this.db.isReady) {
      try {
        const result = await this.db.query(
          `select count(*)::int as count from chat_messages where delegate_id = $1`,
          [delegateId],
        );
        return Number(result.rows[0]?.count ?? 0);
      } catch (error) {
        this.logger.warn(`Fallo al contar mensajes: ${(error as Error).message}`);
      }
    }
    return (this.chats.get(delegateId) ?? []).length;
  }

  private mapDelegate(row: Record<string, unknown>): DelegateRecord {
    return {
      id: String(row.id),
      username: String(row.username),
      countryCode: String(row.country_code),
      committee: row.committee === 'ECOSOC' ? 'ECOSOC' : 'UNESCO',
      grade: row.grade === null || row.grade === undefined ? null : String(row.grade),
      createdAt: new Date(row.created_at as string).toISOString(),
      lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
    };
  }

  private mapSession(row: Record<string, unknown>): DebateSessionRecord {
    const asked = Array.isArray(row.asked_ids) ? row.asked_ids.map(String) : [];
    const rawDifficulty = Number(row.difficulty);
    return {
      id: String(row.id),
      delegateId: String(row.delegate_id),
      committee: row.committee === 'ECOSOC' ? 'ECOSOC' : 'UNESCO',
      difficulty: rawDifficulty === 1 || rawDifficulty === 3 ? rawDifficulty : 2,
      askedIds: asked,
      questionCount: Number(row.question_count ?? asked.length),
      createdAt: new Date(row.created_at as string).toISOString(),
    };
  }

  private mapTurn(row: Record<string, unknown>): DebateTurnRecord {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      delegateId: String(row.delegate_id),
      questionId: String(row.question_id),
      question: String(row.question),
      questionKind: String(row.question_kind),
      answer: String(row.answer),
      scores: row.scores,
      overall: Number(row.overall),
      feedback: row.feedback,
      createdAt: new Date(row.created_at as string).toISOString(),
    };
  }
}
