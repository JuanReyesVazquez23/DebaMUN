-- ============================================================================
-- DebaMun · esquema PostgreSQL (compatible con Neon)
-- Ejecutar con: node scripts/setup-db.mjs
-- ============================================================================

create extension if not exists pgcrypto;

-- Delegados: identidad mínima, sin correo ni datos sensibles.
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

-- Una sesión de entrenamiento por delegado y momento de práctica.
create table if not exists debate_sessions (
  id uuid primary key,
  delegate_id uuid not null references delegates(id) on delete cascade,
  committee text not null,
  difficulty integer not null default 2 check (difficulty between 1 and 3),
  asked_ids jsonb not null default '[]'::jsonb,
  question_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table debate_sessions add column if not exists difficulty integer not null default 2;

-- Turnos evaluados: se guarda la evidencia completa para poder auditar la nota.
create table if not exists debate_turns (
  id uuid primary key,
  session_id uuid not null references debate_sessions(id) on delete cascade,
  delegate_id uuid not null references delegates(id) on delete cascade,
  question_id text not null,
  question text not null,
  question_kind text not null default 'seguimiento',
  answer text not null,
  scores jsonb not null,
  overall integer not null check (overall between 0 and 100),
  feedback jsonb not null,
  created_at timestamptz not null default now()
);

-- Historial del asistente de investigación, con fuentes citadas.
create table if not exists chat_messages (
  id uuid primary key,
  delegate_id uuid not null references delegates(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Caché persistente de respuestas (Redis es la primera capa).
create table if not exists research_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_debate_turns_delegate on debate_turns(delegate_id, created_at desc);
create index if not exists idx_debate_turns_session on debate_turns(session_id, created_at desc);
create index if not exists idx_chat_messages_delegate on chat_messages(delegate_id, created_at desc);
create index if not exists idx_delegates_country on delegates(country_code);
create index if not exists idx_research_cache_expires on research_cache(expires_at);

-- ---------------------------------------------------------------------------
-- Fase 1 (dossier vivo): tablas preparadas para evidencia editorial revisada.
-- Se crean vacías; el MVP no depende de ellas.
-- ---------------------------------------------------------------------------

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  title text not null,
  country_code text,
  committee text,
  source_kind text not null default 'editorial',
  content text not null,
  fingerprint text not null unique,
  fetched_at timestamptz not null default now(),
  approved boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  text text not null,
  token_count integer,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- La extensión vectorial solo existe en PostgreSQL con pgvector (Neon la soporta).
-- Si no está disponible, el chunk se guarda sin embedding y se busca con BM25.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    alter table document_chunks add column if not exists embedding vector;
    create index if not exists idx_document_chunks_embedding
      on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
  end if;
end $$;

create table if not exists source_health (
  domain text primary key,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_status integer,
  consecutive_failures integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Vistas de apoyo para paneles docentes (Fase 2/4).
-- ---------------------------------------------------------------------------

create or replace view delegate_progress as
select
  d.id as delegate_id,
  d.username,
  d.country_code,
  d.committee,
  count(t.id)::int as turns,
  coalesce(round(avg(t.overall)), 0)::int as average,
  coalesce(max(t.overall), 0)::int as best,
  max(t.created_at) as last_turn_at
from delegates d
left join debate_turns t on t.delegate_id = d.id
group by d.id, d.username, d.country_code, d.committee;

create or replace view country_turn_quality as
select
  d.country_code,
  d.committee,
  count(t.id)::int as turns,
  coalesce(round(avg(t.overall)), 0)::int as average
from delegates d
join debate_turns t on t.delegate_id = d.id
group by d.country_code, d.committee;
