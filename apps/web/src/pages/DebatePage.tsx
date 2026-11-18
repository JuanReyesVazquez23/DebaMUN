import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  Shuffle,
  Sparkles,
  Target,
} from 'lucide-react';
import { CriterionCard } from '../components/CriterionCard';
import { ScoreRing } from '../components/ScoreRing';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks';
import { api } from '../lib/api';
import { countWords, formatSeconds, gradeLabel, KIND_LABEL } from '../lib/format';
import { useSession } from '../lib/session';
import type { GeneratedQuestion, GradeId, TurnResult } from '../types';

type Difficulty = 1 | 2 | 3;

const LEVELS: Array<{
  id: Difficulty;
  name: string;
  tagline: string;
  detail: string;
  focus: string[];
}> = [
  {
    id: 1,
    name: 'Básico',
    tagline: 'Primeros pasos',
    detail: 'Consignas cortas y directas, con vocabulario claro y tiempo extra para responder.',
    focus: ['Qué defiendes', 'Una razón', 'Una medida'],
  },
  {
    id: 2,
    name: 'Intermedio',
    tagline: 'Ritmo de comisión',
    detail: 'Preguntas de seguimiento y contrapunto. Pide evidencia y una propuesta con responsables.',
    focus: ['Postura + evidencia', 'Contraargumento', 'Propuesta viable'],
  },
  {
    id: 3,
    name: 'Avanzado',
    tagline: 'Presión real',
    detail: 'Crisis, fuego cruzado y objeciones duras. Exige anticipar fallos y defender con precisión.',
    focus: ['Crisis', 'Objeciones hostiles', 'Verificación y rendición de cuentas'],
  },
];

const LEVEL_NAME: Record<Difficulty, string> = {
  1: 'Básico',
  2: 'Intermedio',
  3: 'Avanzado',
};

const GRADE_ORDER: GradeId[] = ['6', '7', '8', '9', '10', '11', '12', 'universidad'];

function suggestedLevel(grade: GradeId | null | undefined): Difficulty {
  if (!grade) return 2;
  const index = GRADE_ORDER.indexOf(grade);
  if (index <= 1) return 1;
  if (index <= 4) return 2;
  return 3;
}

function wordGoal(difficulty: Difficulty): string {
  if (difficulty === 1) return '40–80 palabras';
  if (difficulty === 2) return '70–120 palabras';
  return '90–150 palabras';
}

export function DebatePage() {
  const { profile } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [asked, setAsked] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<TurnResult | null>(null);
  const [status, setStatus] = useState<'choose' | 'loading' | 'ready' | 'error'>('choose');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const loadQuestion = useCallback(async (id: string) => {
    const data = await api.nextQuestion(id);
    setQuestion(data.question);
    setAsked(data.session.uniqueAsked);
    setAnswer('');
    setResult(null);
    setRemaining(data.question.timeSeconds);
    setTimerOn(true);
    setStatus('ready');
  }, []);

  const start = useCallback(
    async (level: Difficulty) => {
      if (!profile) return;
      setDifficulty(level);
      setStatus('loading');
      setError('');
      try {
        const { session } = await api.createDebateSession(profile.delegate.id, level);
        setSessionId(session.id);
        await loadQuestion(session.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No pude abrir la arena de debate.');
        setStatus('error');
      }
    },
    [profile, loadQuestion],
  );

  useEffect(() => {
    if (!timerOn || remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setTimerOn(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerOn, remaining]);

  if (!profile) return null;

  const words = countWords(answer);
  const tooShort = answer.trim().length < 12;
  const progress = question ? Math.round((remaining / question.timeSeconds) * 100) : 0;

  async function submit() {
    if (!sessionId || !question || submitting) return;
    if (tooShort) {
      setError('Escribe al menos una oración completa (12 caracteres). La rúbrica necesita contenido real.');
      answerRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const next = await api.submitTurn({
        sessionId,
        questionId: question.id,
        question: question.text,
        kind: question.kind,
        answer,
      });
      setResult(next);
      setTimerOn(false);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pude evaluar tu intervención.');
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (!sessionId) return;
    setSubmitting(true);
    setError('');
    try {
      await loadQuestion(sessionId);
      answerRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pude cargar la siguiente pregunta.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'choose') {
    const suggestion = suggestedLevel(profile.delegate.grade);
    return (
      <div className="debate-setup">
        <header className="page__head debate-setup__head">
          <div>
            <p className="eyebrow">Arena de debate · {profile.committee.abbr}</p>
            <h1 className="display">Elige el nivel de tu ronda</h1>
            <p className="lead">
              La dificultad cambia las preguntas y el tiempo de palabra, no la rúbrica. Empieza donde
              te sientas cómodo y sube cuando quieras: cada ronda abre una sesión nueva.
            </p>
          </div>
          <div className="debate__meta">
            <span className="pill">
              <Gauge aria-hidden="true" size={14} /> {gradeLabel(profile.delegate.grade)}
            </span>
            <span className="pill">
              <Target aria-hidden="true" size={14} /> Tu país: {profile.country.name}
            </span>
          </div>
        </header>

        <div className="difficulty-grid">
          {LEVELS.map((level) => (
            <article
              key={level.id}
              className={level.id === suggestion ? 'difficulty-card is-suggested' : 'difficulty-card'}
            >
              <header className="difficulty-card__head">
                <span className="difficulty-card__level">{level.id}</span>
                <div>
                  <h2>{level.name}</h2>
                  <p className="eyebrow">{level.tagline}</p>
                </div>
              </header>
              <p className="difficulty-card__detail">{level.detail}</p>
              <ul className="difficulty-card__focus">
                {level.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                className={level.id === suggestion ? 'button' : 'button button--ghost'}
                type="button"
                onClick={() => void start(level.id)}
              >
                Empezar en {level.name} <ArrowRight aria-hidden="true" size={16} />
              </button>
              {level.id === suggestion ? (
                <p className="difficulty-card__hint">Sugerido para tu grado</p>
              ) : null}
            </article>
          ))}
        </div>

        <section className="panel debate-setup__note">
          <p className="eyebrow">Cómo se evalúa</p>
          <p>
            Las cuatro dimensiones pesan distinto según la pregunta, pero ninguna desaparece. Una
            respuesta breve no se castiga por longitud: se evalúa si responde, si justifica y si
            propone algo verificable.
          </p>
        </section>
      </div>
    );
  }

  if (status === 'loading') return <LoadingBlock label="Abriendo la arena de debate…" />;
  if (status === 'error')
    return (
      <ErrorBlock
        message={error}
        onRetry={() => void start(difficulty ?? suggestedLevel(profile.delegate.grade))}
      />
    );
  if (!question) return null;

  return (
    <div className="debate">
      <header className="page__head">
        <div>
          <p className="eyebrow">Arena de debate · {profile.committee.abbr}</p>
          <h1 className="display">Intervención guiada</h1>
          <p className="lead">
            Cada pregunta es nueva dentro de tu sesión. Responde como si tuvieras la palabra: postura,
            evidencia y propuesta.
          </p>
        </div>
        <div className="debate__meta">
          <span className="pill">
            <Shuffle aria-hidden="true" size={14} /> {asked} preguntas únicas
          </span>
          <span className="pill pill--level">
            <Gauge aria-hidden="true" size={14} /> Nivel {LEVEL_NAME[question.difficulty]}
          </span>
          <span className="pill">{KIND_LABEL[question.kind] ?? question.kind}</span>
          <button
            type="button"
            className="pill pill--action"
            onClick={() => {
              setStatus('choose');
              setQuestion(null);
              setResult(null);
              setSessionId(null);
              setTimerOn(false);
            }}
          >
            Cambiar nivel
          </button>
        </div>
      </header>

      <div className="debate__grid">
        <div className="debate__main">
          <article className="question">
            <header className="question__head">
              <span className={`kind kind--${question.kind}`}>{KIND_LABEL[question.kind] ?? question.kind}</span>
              <span className="question__focus">{question.focus}</span>
            </header>
            <p className="question__text">{question.text}</p>
            <p className="question__why">
              <Target aria-hidden="true" size={14} /> {question.whyItMatters}
            </p>
          </article>

          <div className="composer">
            <label className="field">
              <span className="field__label">
                Tu intervención
                <span className={words < 40 ? 'counter counter--low' : 'counter'}>{words} palabras</span>
              </span>
              <textarea
                ref={answerRef}
                className="textarea"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Honorable Presidencia, la delegación de… reconoce… y propone…"
                rows={9}
                maxLength={6000}
                aria-describedby="answer-help"
                disabled={Boolean(result)}
              />
              <span id="answer-help" className="field__help">
                {result
                  ? 'Intervención evaluada. Pasa a la siguiente pregunta para seguir entrenando.'
                  : `Objetivo: ${wordGoal(question.difficulty)}. Cierra con responsable, financiamiento, plazo e indicador. Ctrl + Enter para enviar.`}
              </span>
            </label>

            {error ? (
              <p className="notice notice--error" role="alert">
                <AlertCircle aria-hidden="true" size={16} /> {error}
              </p>
            ) : null}

            <div className="actions actions--split">
              <button
                className="button button--ghost"
                type="button"
                onClick={() => {
                  setAnswer('');
                  answerRef.current?.focus();
                }}
                disabled={submitting || Boolean(result) || answer.length === 0}
              >
                <RotateCcw aria-hidden="true" size={15} /> Limpiar
              </button>
              {result ? (
                <button className="button" type="button" onClick={() => void next()} disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoaderCircle className="spin" aria-hidden="true" size={16} /> Cargando…
                    </>
                  ) : (
                    <>
                      Siguiente pregunta <ArrowRight aria-hidden="true" size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button className="button" type="button" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoaderCircle className="spin" aria-hidden="true" size={16} /> Evaluando…
                    </>
                  ) : (
                    <>
                      <Send aria-hidden="true" size={16} /> Enviar intervención
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="debate__aside">
          <section className="panel panel--timer" aria-label="Temporizador y estructura">
            <div className="timer">
              <div className="timer__ring" style={{ '--progress': `${progress}%` } as CSSProperties}>
                <Clock3 aria-hidden="true" size={18} />
                <strong>{formatSeconds(remaining)}</strong>
              </div>
              <div className="timer__controls">
                <p className="eyebrow">Tiempo de palabra</p>
                <p className="muted small">
                  {remaining === 0 ? 'Tiempo agotado: en la sala te llamarían al orden.' : 'Ensaya el ritmo real de la comisión.'}
                </p>
                <button
                  className="button button--tiny"
                  type="button"
                  onClick={() => setTimerOn((value) => !value)}
                  disabled={remaining === 0 || Boolean(result)}
                >
                  {timerOn ? <Pause aria-hidden="true" size={14} /> : <Play aria-hidden="true" size={14} />}
                  {timerOn ? 'Pausar' : 'Reanudar'}
                </button>
              </div>
            </div>

            <h2 className="subhead">
              <Sparkles aria-hidden="true" size={15} /> Estructura sugerida
            </h2>
            <ol className="structure">
              {question.suggestedStructure.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <p className="muted small">
              {question.resolutionExpected
                ? 'Esta pregunta exige propuesta: la resolución pesa un 25 % del puntaje.'
                : 'Esta pregunta no exige resolución formal: el peso se concentra en argumentos y coherencia.'}
            </p>
            <p className="muted small">
              Nivel {LEVEL_NAME[question.difficulty]} · {question.timeSeconds}s de palabra. Puedes
              cambiar de dificultad al terminar esta ronda.
            </p>
          </section>

          <section className="panel panel--rubric" aria-label="Criterios de evaluación">
            <p className="eyebrow">Rúbrica</p>
            <ul className="rubric">
              <li>
                <strong>Diálogo</strong> Registro diplomático, reconocimiento del otro y apertura al consenso.
              </li>
              <li>
                <strong>Argumentos</strong> Evidencia verificable y mecanismo causal.
              </li>
              <li>
                <strong>Coherencia</strong> Estructura, conectores y respuesta exacta a la pregunta.
              </li>
              <li>
                <strong>Resolución</strong> Responsable, financiamiento, plazo e indicador.
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {result ? (
        <section className="results" ref={resultRef} aria-live="polite">
          <div className="results__head">
            <div>
              <p className="eyebrow">
                <CheckCircle2 aria-hidden="true" size={13} /> Evaluación
              </p>
              <h2 className="display display--small">{result.evaluation.level}</h2>
              <p className="lead">{result.evaluation.verdict}</p>
            </div>
            <ScoreRing score={result.evaluation.overall} size={148} label="Puntaje total" caption="de 100" />
          </div>

          <div className="criteria-grid">
            {result.evaluation.criteria.map((criterion) => (
              <CriterionCard key={criterion.key} criterion={criterion} />
            ))}
          </div>

          <div className="results__grid">
            <div className="panel">
              <h3 className="subhead">Lo que funciona</h3>
              <ul className="bullet-list">
                {result.evaluation.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="panel">
              <h3 className="subhead">Lo que ajustar</h3>
              <ul className="bullet-list">
                {result.evaluation.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="results__next">
            <ArrowRight aria-hidden="true" size={16} /> {result.nextStep}
          </p>
          <p className="muted small">
            Historial de esta sesión: {result.stats.count} intervenciones · media {result.stats.average} ·
            mejor {result.stats.best}.
          </p>
        </section>
      ) : null}
    </div>
  );
}
