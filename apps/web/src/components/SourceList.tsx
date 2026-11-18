import { ArrowUpRight } from 'lucide-react';
import { hostOf } from '../lib/format';
import type { CountrySource } from '../types';

export function SourceList({
  sources,
  compact = false,
}: {
  sources: CountrySource[];
  compact?: boolean;
}) {
  if (sources.length === 0) {
    return <p className="muted">Todavía no hay fuentes registradas.</p>;
  }

  return (
    <ul className={compact ? 'sources sources--compact' : 'sources'}>
      {sources.map((source) => (
        <li key={`${source.url}-${source.label}`} className="source">
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            <span className="source__label">{source.label}</span>
            <span className="source__host">
              {hostOf(source.url)}
              <ArrowUpRight aria-hidden="true" size={13} />
            </span>
          </a>
          <span className="source__kind">{source.kind}</span>
        </li>
      ))}
    </ul>
  );
}
