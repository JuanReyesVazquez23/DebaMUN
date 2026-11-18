import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GraduationCap, School, University } from 'lucide-react';
import { OnboardingShell } from '../components/AppShell';
import { useSession } from '../lib/session';
import type { GradeId } from '../types';

interface GradeOption {
  id: GradeId;
  label: string;
  hint: string;
  stage: 'colegio' | 'universidad';
}

const GRADES: GradeOption[] = [
  { id: '6', label: '6.º grado', hint: 'Primer año de secundaria', stage: 'colegio' },
  { id: '7', label: '7.º grado', hint: 'Segundo año de secundaria', stage: 'colegio' },
  { id: '8', label: '8.º grado', hint: 'Tercer año de secundaria', stage: 'colegio' },
  { id: '9', label: '9.º grado', hint: 'Cuarto año de secundaria', stage: 'colegio' },
  { id: '10', label: '10.º grado', hint: 'Quinto año de secundaria', stage: 'colegio' },
  { id: '11', label: '11.º grado', hint: 'Penúltimo año de secundaria', stage: 'colegio' },
  { id: '12', label: '12.º grado', hint: 'Último año de secundaria', stage: 'colegio' },
  { id: 'universidad', label: 'Universidad', hint: 'Pregrado o ciclo técnico superior', stage: 'universidad' },
];

const STAGE_LABEL: Record<GradeOption['stage'], string> = {
  colegio: 'Colegio',
  universidad: 'Educación superior',
};

export function GradePage() {
  const { draft, setGrade } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<GradeId | ''>(draft.grade);

  if (!draft.username) return <Navigate to="/bienvenida" replace />;

  const chosen = GRADES.find((grade) => grade.id === selected) ?? null;

  return (
    <OnboardingShell
      step={2}
      title="¿Qué grado cursas?"
      lead="Ajustaré el vocabulario, la longitud de las preguntas y la exigencia de la rúbrica a tu nivel. Podrás elegir el nivel de cada ronda de debate."
      aside={
        <div className="onboarding__card onboarding__card--accent">
          <p className="eyebrow">Por qué lo pregunto</p>
          <ul className="feature-list">
            <li>
              <School aria-hidden="true" size={17} />
              <span>
                <strong>Preguntas a tu medida.</strong> En grados iniciales verás consignas cortas y
                concretas; en los finales, escenarios de crisis.
              </span>
            </li>
            <li>
              <GraduationCap aria-hidden="true" size={17} />
              <span>
                <strong>Evaluación justa.</strong> La rúbrica espera una profundidad distinta según
                tu etapa, no menos rigor.
              </span>
            </li>
            <li>
              <University aria-hidden="true" size={17} />
              <span>
                <strong>Sin datos sensibles.</strong> Solo guardo el grado para adaptar el
                entrenamiento; no se publica ni se comparte.
              </span>
            </li>
          </ul>
        </div>
      }
    >
      <div className="grade-groups">
        {(['colegio', 'universidad'] as const).map((stage) => {
          const options = GRADES.filter((grade) => grade.stage === stage);
          return (
            <section key={stage} className="grade-group" aria-label={STAGE_LABEL[stage]}>
              <p className="grade-group__label">{STAGE_LABEL[stage]}</p>
              <div className="grade-grid" role="radiogroup" aria-label={STAGE_LABEL[stage]}>
                {options.map((grade) => {
                  const active = selected === grade.id;
                  return (
                    <button
                      key={grade.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={active ? 'grade-card is-selected' : 'grade-card'}
                      onClick={() => setSelected(grade.id)}
                    >
                      <span className="grade-card__label">{grade.label}</span>
                      <span className="grade-card__hint">{grade.hint}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="actions actions--split">
        <button className="button button--ghost" type="button" onClick={() => navigate('/bienvenida')}>
          <ArrowLeft aria-hidden="true" size={16} /> Atrás
        </button>
        <button
          className="button"
          type="button"
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            setGrade(chosen.id);
            navigate('/pais');
          }}
        >
          {chosen ? `Continuar desde ${chosen.label}` : 'Elige tu grado'}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      </div>
    </OnboardingShell>
  );
}
