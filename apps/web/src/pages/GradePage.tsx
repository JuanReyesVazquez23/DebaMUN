import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GraduationCap, School, University } from 'lucide-react';
import { OnboardingShell } from '../components/AppShell';
import { useSession } from '../lib/session';
import type { GradeId } from '../types';

type GradeStage = 'primaria' | 'secundaria' | 'universidad';

interface GradeOption {
  id: GradeId;
  label: string;
  hint: string;
  stage: GradeStage;
}

const YEAR_HINT = ['Primer año', 'Segundo año', 'Tercer año', 'Cuarto año', 'Quinto año', 'Sexto año'];

const GRADES: GradeOption[] = [
  ...YEAR_HINT.map((hint, index) => ({
    id: `primaria-${index + 1}` as GradeId,
    label: `${index + 1}.º de primaria`,
    hint,
    stage: 'primaria' as const,
  })),
  ...YEAR_HINT.map((hint, index) => ({
    id: `secundaria-${index + 1}` as GradeId,
    label: `${index + 1}.º de secundaria`,
    hint,
    stage: 'secundaria' as const,
  })),
  {
    id: 'universidad',
    label: 'Universidad',
    hint: 'Pregrado o ciclo técnico superior',
    stage: 'universidad',
  },
];

const STAGE_LABEL: Record<GradeStage, string> = {
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  universidad: 'Educación superior',
};

const STAGE_ORDER: GradeStage[] = ['primaria', 'secundaria', 'universidad'];

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
        {STAGE_ORDER.map((stage) => {
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
