import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gavel, Mic, Sparkles } from 'lucide-react';
import { OnboardingShell } from '../components/AppShell';
import { useSession } from '../lib/session';

const NAME_PATTERN = /^[\p{L}\p{N} ._'’-]+$/u;

export function WelcomePage() {
  const { draft, setUsername } = useSession();
  const navigate = useNavigate();
  const [value, setValue] = useState(draft.username);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const tooShort = trimmed.length < 2;
  const invalid = trimmed.length > 0 && !NAME_PATTERN.test(trimmed);
  const error = tooShort ? 'Necesito al menos dos caracteres para dirigirme a ti.' : invalid ? 'Usa solo letras, números, espacios y . _ - ’' : '';

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (tooShort || invalid) {
      inputRef.current?.focus();
      return;
    }
    setUsername(trimmed);
    navigate('/grado');
  }

  return (
    <OnboardingShell
      step={1}
      title="Investiga. Debate. Mejora."
      lead="DebaMun es tu mesa de preparación para tus modelos de las naciones. Te asignaré un país, te daré un dossier con fuentes y entrenaré tu debate con evaluación en cuatro criterios."
      aside={
        <div className="onboarding__card">
          <p className="eyebrow">Cómo funciona</p>
          <ul className="feature-list">
            <li>
              <Sparkles aria-hidden="true" size={17} />
              <span>
                <strong>Dossier personalizado.</strong> Postura, prioridades, líneas rojas y
                vulnerabilidades de tu país.
              </span>
            </li>
            <li>
              <Mic aria-hidden="true" size={17} />
              <span>
                <strong>Asistente con fuentes.</strong> Respuestas acotadas al corpus, con URL
                verificable y nivel de confianza.
              </span>
            </li>
            <li>
              <Gavel aria-hidden="true" size={17} />
              <span>
                <strong>Arena de debate.</strong> Preguntas que no se repiten y rúbrica en Diálogo,
                Argumentos, Coherencia y Resolución.
              </span>
            </li>
          </ul>
          <p className="onboarding__dates">
            <span>09 · 12 · 2026</span>
            Miércoles · jornada completa
          </p>
        </div>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">¿Cómo te llamas?</span>
          <input
            ref={inputRef}
            className={touched && error ? 'input input--error' : 'input'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Nombre y apellido"
            autoComplete="name"
            maxLength={40}
            aria-describedby="name-help"
            aria-invalid={Boolean(touched && error)}
          />
          <span id="name-help" className={touched && error ? 'field__help is-error' : 'field__help'}>
            {touched && error
              ? error
              : 'Lo usaré para dirigirme a ti y para firmar tus intervenciones.'}
          </span>
        </label>

        <div className="actions">
          <button className="button" type="submit" disabled={trimmed.length === 0}>
            Continuar <ArrowRight aria-hidden="true" size={17} />
          </button>
          <span className="muted small">Sin registro, sin correo. Todo queda en este dispositivo.</span>
        </div>
      </form>
    </OnboardingShell>
  );
}
