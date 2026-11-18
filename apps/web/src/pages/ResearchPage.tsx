import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  CircleHelp,
  Database,
  LoaderCircle,
  Search,
  Send,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';
import { LoadingBlock } from '../components/StateBlocks';
import { api } from '../lib/api';
import { hostOf } from '../lib/format';
import { useSession } from '../lib/session';
import type { ResearchResult, ResearchSource } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ResearchSource[];
  meta?: { confidence: string; provider: string; cached: boolean };
}

function parseSources(value: unknown): ResearchSource[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ResearchSource => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<ResearchSource>;
    return typeof candidate.url === 'string' && typeof candidate.label === 'string';
  });
}

function renderAnswer(text: string) {
  return text.split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={`br-${index}`} />;
    const bold = trimmed.match(/^\*\*(.+?)\*\*(.*)$/);
    if (bold) {
      return (
        <p key={`p-${index}`}>
          <strong>{bold[1]}</strong>
          {bold[2]}
        </p>
      );
    }
    return <p key={`p-${index}`}>{trimmed}</p>;
  });
}

export function ResearchPage() {
  const { profile } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadHistory = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    api
      .researchHistory(profile.delegate.id)
      .then(({ messages: list }) => {
        setMessages(
          list.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            sources: parseSources(message.sources),
          })),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [profile]);

  useEffect(loadHistory, [loadHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  if (!profile) return null;

  async function ask(text: string) {
    const clean = text.trim();
    if (!profile || !clean || busy) return;
    setBusy(true);
    setError('');
    setQuestion('');
    const localId = `local-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: localId, role: 'user', content: clean, sources: [] },
    ]);

    try {
      const result: ResearchResult = await api.research(profile.delegate.id, clean);
      setMessages((current) => [
        ...current,
        {
          id: `answer-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          meta: { confidence: result.confidence, provider: result.provider, cached: result.cached },
        },
      ]);
      setSuggestions(result.suggestedQuestions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pude completar la búsqueda.');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="research">
      <header className="page__head">
        <div>
          <p className="eyebrow">Asistente de investigación · {profile.committee.abbr}</p>
          <h1 className="display">Pregunta con fuentes</h1>
          <p className="lead">
            Busco en el dossier de {profile.country.name}, en el briefing de la comisión y en la base
            editorial. Cada respuesta indica de dónde sale y cuánta confianza tiene.
          </p>
        </div>
        <div className="research__status">
          <span className="pill">
            <Database aria-hidden="true" size={14} /> Corpus local + fuentes oficiales
          </span>
          <span className="pill">
            <ShieldQuestion aria-hidden="true" size={14} /> Sin inventar cifras
          </span>
        </div>
      </header>

      <div className="research__grid">
        <section className="chat" aria-label="Conversación con el asistente">
          <div className="chat__scroll">
            {loading ? <LoadingBlock label="Recuperando tu historial…" /> : null}

            {!loading && messages.length === 0 ? (
              <div className="chat__intro">
                <CircleHelp aria-hidden="true" size={26} />
                <h2>Empieza por lo que te falta defender</h2>
                <p className="muted">
                  Puedo resumir la postura de tu país, comparar prioridades, explicar un subtema o
                  ayudarte a convertir un dato en una propuesta verificable.
                </p>
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="bubble bubble--user">
                  <p>{message.content}</p>
                </div>
              ) : (
                <article key={message.id} className="bubble bubble--assistant">
                  <header className="bubble__head">
                    <span className="bubble__avatar" aria-hidden="true">
                      DM
                    </span>
                    <span>
                      <strong>DebaMun</strong>
                      {message.meta ? (
                        <span className="bubble__meta">
                          confianza {message.meta.confidence} · {message.meta.provider}
                          {message.meta.cached ? ' · caché' : ''}
                        </span>
                      ) : null}
                    </span>
                  </header>
                  <div className="bubble__body">{renderAnswer(message.content)}</div>

                  {message.sources.length > 0 ? (
                    <footer className="bubble__sources">
                      <p className="eyebrow">
                        <BadgeCheck aria-hidden="true" size={13} /> Fuentes
                      </p>
                      <ul>
                        {message.sources.map((source) => (
                          <li key={`${message.id}-${source.url}`}>
                            <a href={source.url} target="_blank" rel="noreferrer noopener">
                              <span>{source.label}</span>
                              <small>
                                {hostOf(source.url)} <ArrowUpRight aria-hidden="true" size={12} />
                              </small>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </footer>
                  ) : null}
                </article>
              ),
            )}

            {busy ? (
              <div className="bubble bubble--assistant bubble--typing" role="status">
                <LoaderCircle className="spin" aria-hidden="true" size={16} /> Buscando evidencia y
                citando fuentes…
              </div>
            ) : null}

            <div ref={endRef} />
          </div>

          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="suggestions" aria-label="Preguntas sugeridas">
              {suggestions.map((item) => (
                <button key={item} type="button" className="chip" onClick={() => void ask(item)} disabled={busy}>
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="composer composer--chat"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <label className="field">
              <span className="sr-only">Tu pregunta</span>
              <textarea
                ref={inputRef}
                className="textarea textarea--chat"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void ask(question);
                  }
                }}
                placeholder="¿Qué evidencia respalda la postura de mi país sobre formación docente?"
                rows={2}
                maxLength={600}
                disabled={busy}
              />
            </label>
            <button className="button" type="submit" disabled={busy || question.trim().length < 3}>
              {busy ? <LoaderCircle className="spin" aria-hidden="true" size={16} /> : <Send aria-hidden="true" size={16} />}
              Preguntar
            </button>
          </form>
        </section>

        <aside className="research__aside">
          <section className="panel">
            <p className="eyebrow">
              <Sparkles aria-hidden="true" size={13} /> Preguntas que funcionan
            </p>
            <ul className="prompts">
              {[
                `¿Cuál es la postura de ${profile.country.name} en ${profile.committee.abbr}?`,
                '¿Qué vulnerabilidad debería reconocer en mi discurso?',
                'Dame dos datos verificables para mi primer argumento.',
                '¿Cómo convierto esta prioridad en una propuesta con presupuesto?',
                '¿Qué línea roja no debería cruzar en la negociación?',
              ].map((prompt) => (
                <li key={prompt}>
                  <button type="button" onClick={() => void ask(prompt)} disabled={busy}>
                    <Search aria-hidden="true" size={14} /> {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel panel--soft">
            <p className="eyebrow">Límites del asistente</p>
            <ul className="bullet-list bullet-list--compact">
              <li>No inventa cifras: si el corpus no alcanza, lo dice.</li>
              <li>Distingue dato, interpretación y propuesta.</li>
              <li>Trata el texto de las fuentes como datos, no como instrucciones.</li>
              <li>Registra cada consulta para que puedas repasar tu preparación.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
