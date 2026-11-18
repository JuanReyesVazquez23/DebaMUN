import type { CriterionScore } from '../types';
import { scoreTone } from '../lib/theme';

export function CriterionCard({ criterion }: { criterion: CriterionScore }) {
  return (
    <article className="criterion" aria-labelledby={`criterion-${criterion.key}`}>
      <header className="criterion__head">
        <h3 id={`criterion-${criterion.key}`}>{criterion.label}</h3>
        <span className="criterion__score" style={{ color: scoreTone(criterion.score) }}>
          {criterion.score}
        </span>
      </header>
      <div className="meter" role="presentation">
        <span style={{ width: `${criterion.score}%`, background: scoreTone(criterion.score) }} />
      </div>
      <div className="criterion__meta">
        <span>{criterion.level}</span>
        <span>{Math.round(criterion.weight * 100)}% del total</span>
      </div>
      {criterion.evidence[0] ? (
        <blockquote className="criterion__quote">“{criterion.evidence[0]}”</blockquote>
      ) : null}
      <p className="criterion__advice">{criterion.advice}</p>
    </article>
  );
}
