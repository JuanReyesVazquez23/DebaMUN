import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  Gauge,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import { ScoreRing } from '../components/ScoreRing';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks';
import { api } from '../lib/api';
import { formatDateTime, gradeLabel } from '../lib/format';
import { useSession } from '../lib/session';
import type { DashboardData, FactOfDay } from '../types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  const { profile } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [facts, setFacts] = useState<FactOfDay[]>([]);
  const [factOffset, setFactOffset] = useState(0);
  const [factsBusy, setFactsBusy] = useState(false);

  const load = useCallback(() => {
    if (!profile) return;
    setStatus('loading');
    api
      .dashboard(profile.delegate.id)
      .then((next) => {
        setData(next);
        setFacts(next.factsOfDay ?? [next.factOfDay]);
        setFactOffset(0);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No pude cargar tu panel.');
        setStatus('error');
      });
  }, [profile]);

  useEffect(load, [load]);

  if (!profile) return null;
  if (status === 'loading' && !data) return <LoadingBlock label="Preparando tu panel…" />;
  if (status === 'error' && !data) return <ErrorBlock message={error} onRetry={load} />;
  if (!data) return null;

  const { country, committee, readiness, debate } = data;
  const averageTone = debate.average >= 70 ? 'alta' : debate.average >= 50 ? 'media' : 'inicial';
  const totalFacts = facts[0]?.total ?? 0;

  async function loadOtherFacts() {
    if (!data || factsBusy) return;
    const nextOffset = factOffset + facts.length >= totalFacts ? 0 : factOffset + facts.length;
    setFactsBusy(true);
    try {
      if (nextOffset === 0) {
        setFacts(data.factsOfDay ?? [data.factOfDay]);
      } else {
        const response = await api.factsOfDay(country.code, nextOffset);
        setFacts(response.facts);
      }
      setFactOffset(nextOffset);
    } catch {
      // Si falla la petición, conservamos los datos que ya están en pantalla.
    } finally {
      setFactsBusy(false);
    }
  }

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">
            Delegación de {country.name} · {committee.abbr}
          </p>
          <h1 className="display">
            {greeting()}, {profile.delegate.username.split(' ')[0]}.
          </h1>
          <p className="lead">{country.summary}</p>
          <div className="hero__meta">
            <span className="pill">
              <Target aria-hidden="true" size={14} /> {gradeLabel(profile.delegate.grade)}
            </span>
            <span className="pill">{committee.room}</span>
          </div>
          <div className="hero__actions">
            <Link className="button" to="/app/debate">
              Entrar al debate <Swords aria-hidden="true" size={17} />
            </Link>
            <Link className="button button--ghost" to="/app/dossier">
              <BookOpen aria-hidden="true" size={16} /> Repasar dossier
            </Link>
          </div>
        </div>
      </section>

      <div className="dashboard__grid">
        <section className="panel panel--facts" aria-labelledby="facts-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Sparkles aria-hidden="true" size={13} /> Datos del día
              </p>
              <h2 id="facts-title">{country.name} en cifras y contexto</h2>
            </div>
            <button
              className="button button--ghost button--tiny"
              type="button"
              onClick={() => void loadOtherFacts()}
              disabled={factsBusy || totalFacts <= facts.length}
            >
              <RefreshCw aria-hidden="true" size={14} className={factsBusy ? 'spin' : undefined} />
              Otros datos
            </button>
          </header>

          <ol className="fact-grid">
            {facts.map((fact, index) => (
              <li key={`${fact.offset}-${fact.index}`} className="fact-item">
                <span className="fact-item__num">{String(factOffset + index + 1).padStart(2, '0')}</span>
                <p>{fact.text}</p>
              </li>
            ))}
          </ol>

          <p className="fact-foot">
            {totalFacts > 0
              ? `${Math.min(factOffset + 1, totalFacts)}–${Math.min(factOffset + facts.length, totalFacts)} de ${totalFacts} datos · rotan cada día`
              : 'Sin datos disponibles por ahora.'}
          </p>
        </section>

        <section className="panel panel--readiness" aria-labelledby="readiness-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Gauge aria-hidden="true" size={13} /> Preparación
              </p>
              <h2 id="readiness-title">{readiness.label}</h2>
            </div>
            <ScoreRing score={readiness.score} size={96} stroke={8} label="Preparación" caption="listo" />
          </header>

          <ul className="checks">
            {readiness.checks.map((check) => (
              <li key={check.id} className={check.done ? 'checks__item is-done' : 'checks__item'}>
                <span className="checks__icon" aria-hidden="true">
                  {check.done ? <Check size={13} /> : <Circle size={13} />}
                </span>
                <span>{check.label}</span>
                <span className="checks__weight">+{check.weight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="stats-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Target aria-hidden="true" size={13} /> Tu rúbrica
              </p>
              <h2 id="stats-title">Progreso del debate</h2>
            </div>
            <span className={`badge badge--${averageTone}`}>
              {debate.turns > 0 ? `Media ${debate.average}` : 'Sin intervenciones'}
            </span>
          </header>

          <div className="stat-row">
            <div className="stat">
              <strong>{debate.turns}</strong>
              <span>intervenciones</span>
            </div>
            <div className="stat">
              <strong>{debate.turns > 0 ? debate.average : '—'}</strong>
              <span>media</span>
            </div>
            <div className="stat">
              <strong>{debate.turns > 0 ? debate.best : '—'}</strong>
              <span>mejor</span>
            </div>
            <div className="stat">
              <strong>{debate.last ?? '—'}</strong>
              <span>última</span>
            </div>
          </div>

          {debate.recent.length > 0 ? (
            <ul className="recent">
              {debate.recent.map((turn) => (
                <li key={turn.id}>
                  <span className="recent__score">{turn.overall}</span>
                  <span className="recent__text">{turn.question}</span>
                  <span className="recent__date">{formatDateTime(turn.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Aún no hay intervenciones. La primera pregunta se adapta a tu país y comisión.
            </p>
          )}
        </section>

        <section className="panel" aria-labelledby="steps-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">Ruta de hoy</p>
              <h2 id="steps-title">Qué haría ahora</h2>
            </div>
          </header>
          <ol className="nextsteps">
            {data.nextSteps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <Link className="text-link" to="/app/investigacion">
            Abrir el asistente <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </section>

        <section className="panel panel--topic" aria-labelledby="topic-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">{committee.abbr} · Tópico</p>
              <h2 id="topic-title">{committee.shortTopic}</h2>
            </div>
          </header>
          <p className="topic__question">“{committee.essentialQuestion}”</p>
          <ul className="tag-list">
            {committee.subtopics.map((subtopic) => (
              <li key={subtopic.id} className="tag">
                {subtopic.label}
              </li>
            ))}
          </ul>
          <div className="topic__links">
            <Link className="text-link" to="/app/dossier">
              Ver postura de {country.name} <ArrowRight aria-hidden="true" size={15} />
            </Link>
            <Link className="text-link" to="/app/investigacion">
              <MessagesSquare aria-hidden="true" size={15} /> Preguntar con fuentes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
