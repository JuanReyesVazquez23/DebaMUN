import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Landmark, Users, type LucideIcon } from 'lucide-react';
import { OnboardingShell } from '../components/AppShell';
import { CountryFlag } from '../components/CountryFlag';
import { ErrorBlock } from '../components/StateBlocks';
import { gradeLabel } from '../lib/format';
import { useSession } from '../lib/session';
import type { CommitteeId } from '../types';

// Orden alfabético: ninguna comisión es la predeterminada ni tiene prioridad.
const COMMITTEES: Array<{
  id: CommitteeId;
  name: string;
  abbr: string;
  icon: LucideIcon;
  topic: string;
  question: string;
  seats: string;
  focus: string[];
}> = [
  {
    id: 'ECOSOC',
    name: 'Económico y Social',
    abbr: 'ECOSOC',
    icon: Users,
    topic: 'El futuro del empleo juvenil ante la inteligencia artificial',
    question:
      '¿Qué políticas garantizan trabajo decente para la juventud cuando la IA transforma las tareas, las plataformas y las habilidades requeridas?',
    seats: 'Sala ECOSOC',
    focus: ['Transición escuela-trabajo', 'Plataformas', 'Recualificación', 'Protección social'],
  },
  {
    id: 'UNESCO',
    name: 'Educación, Ciencia y Cultura',
    abbr: 'UNESCO',
    icon: Landmark,
    topic: 'IA generativa en la educación: oportunidades, riesgos y gobernanza',
    question:
      '¿Cómo garantizar que la IA generativa amplíe el aprendizaje sin sustituir el pensamiento crítico ni profundizar la brecha digital?',
    seats: 'Sala UNESCO',
    focus: ['Formación docente', 'Brecha digital', 'Evaluación y autoría', 'Privacidad de menores'],
  },
];

export function CommitteePage() {
  const { draft, startSession } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CommitteeId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!draft.username) return <Navigate to="/bienvenida" replace />;
  if (!draft.grade) return <Navigate to="/grado" replace />;
  if (!draft.country) return <Navigate to="/pais" replace />;

  const country = draft.country;

  async function enter() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await startSession(selected);
      navigate('/app', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pude crear tu sesión.');
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={4}
      title="Elige tu comisión"
      lead={`Vas a representar a ${country.name}. La comisión define el tópico, el reglamento y los criterios con los que entrenaré tu debate.`}
      aside={
        <div className="onboarding__card">
          <p className="eyebrow">Tu delegación</p>
          <div className="delegate-card">
            <CountryFlag code={country.code} className="delegate-card__flag" />
            <div>
              <strong>{draft.username}</strong>
              <span>
                {country.name} · {country.region} · {gradeLabel(draft.grade)}
              </span>
            </div>
          </div>
          <p className="muted small">
            Podrás cambiar de delegación desde el panel, pero perderás el historial de esta sesión
            en el dispositivo.
          </p>
        </div>
      }
    >
      <p className="muted small committee-note">
        Ambas comisiones tienen el mismo peso: misma rúbrica, mismo dossier y mismo asistente.
        Ninguna está preseleccionada.
      </p>

      <div className="committee-grid" role="radiogroup" aria-label="Comisión">
        {COMMITTEES.map((committee) => {
          const active = selected === committee.id;
          return (
            <button
              key={committee.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'committee-card is-selected' : 'committee-card'}
              onClick={() => setSelected(committee.id)}
              disabled={busy}
            >
              <span className="committee-card__head">
                <committee.icon aria-hidden="true" size={20} />
                <span>
                  <strong>{committee.abbr}</strong>
                  <span>{committee.name}</span>
                </span>
              </span>
              <span className="committee-card__topic">{committee.topic}</span>
              <span className="committee-card__question">“{committee.question}”</span>
              <span className="committee-card__tags">
                {committee.focus.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </span>
              <span className="committee-card__seats">{committee.seats} · 2 h 30 min</span>
            </button>
          );
        })}
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      <div className="actions actions--split">
        <button className="button button--ghost" type="button" onClick={() => navigate('/pais')} disabled={busy}>
          <ArrowLeft aria-hidden="true" size={16} /> Atrás
        </button>
        <button className="button" type="button" disabled={!selected || busy} onClick={enter}>
          {busy ? 'Preparando tu mesa…' : 'Entrar en la sala'}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      </div>
    </OnboardingShell>
  );
}
