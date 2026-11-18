import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export type DatabaseStatus = 'up' | 'memory';

const SCHEMA_SQL = `
create extension if not exists pgcrypto;

create table if not exists delegates (
  id uuid primary key,
  username text not null,
  country_code text not null,
  committee text not null check (committee in ('UNESCO', 'ECOSOC')),
  grade text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table delegates add column if not exists grade text;

create table if not exists debate_sessions (
  id uuid primary key,
  delegate_id uuid not null references delegates(id) on delete cascade,
  committee text not null,
  difficulty integer not null default 2,
  asked_ids jsonb not null default '[]'::jsonb,
  question_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table debate_sessions add column if not exists difficulty integer not null default 2;

create table if not exists debate_turns (
  id uuid primary key,
  session_id uuid not null references debate_sessions(id) on delete cascade,
  delegate_id uuid not null references delegates(id) on delete cascade,
  question_id text not null,
  question text not null,
  question_kind text not null default 'seguimiento',
  answer text not null,
  scores jsonb not null,
  overall integer not null,
  feedback jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  delegate_id uuid not null references delegates(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists research_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_debate_turns_delegate on debate_turns(delegate_id, created_at desc);
create index if not exists idx_chat_messages_delegate on chat_messages(delegate_id, created_at desc);
create index if not exists idx_delegates_country on delegates(country_code);
`;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private status: DatabaseStatus = 'memory';

  get isReady(): boolean {
    return this.status === 'up';
  }

  get mode(): DatabaseStatus {
    return this.status;
  }

  async onModuleInit(): Promise<void> {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      this.logger.warn('DATABASE_URL no configurada: usando almacenamiento en memoria.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        max: Number(process.env.DATABASE_POOL_MAX ?? 8),
        connectionTimeoutMillis: 4000,
        idleTimeoutMillis: 30000,
      });
      await this.pool.query('select 1');
      await this.pool.query(SCHEMA_SQL);
      this.status = 'up';
      this.logger.log('PostgreSQL conectado y esquema verificado.');
    } catch (error) {
      this.logger.warn(
        `No se pudo conectar a PostgreSQL (${(error as Error).message}). Se usará memoria para el MVP.`,
      );
      await this.pool?.end().catch(() => undefined);
      this.pool = null;
      this.status = 'memory';
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.pool) throw new Error('PostgreSQL no disponible');
    return this.pool.query<T>(text, values);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end().catch(() => undefined);
  }
}
