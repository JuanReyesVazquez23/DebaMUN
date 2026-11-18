import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { OnboardingShell } from '../components/AppShell';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { mix } from '../lib/theme';
import type { CountrySummary } from '../types';

export function CountryPage() {
  const { draft, setCountry } = useSession();
  const navigate = useNavigate();
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Todos');
  const [selected, setSelected] = useState<CountrySummary | null>(draft.country);

  useEffect(() => {
    if (!draft.username) return;
    let cancelled = false;
    api
      .countries()
      .then(({ countries: list }) => {
        if (cancelled) return;
        setCountries(list);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'No pude cargar los países.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [draft.username]);

  const regions = useMemo(
    () => ['Todos', ...Array.from(new Set(countries.map((country) => country.region))).sort()],
    [countries],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return countries.filter((country) => {
      const matchesRegion = region === 'Todos' || country.region === region;
      const matchesQuery =
        needle.length === 0 ||
        country.name.toLowerCase().includes(needle) ||
        country.officialName.toLowerCase().includes(needle) ||
        country.code.toLowerCase() === needle;
      return matchesRegion && matchesQuery;
    });
  }, [countries, query, region]);

  if (!draft.username) return <Navigate to="/bienvenida" replace />;
  if (!draft.grade) return <Navigate to="/grado" replace />;

  return (
    <OnboardingShell
      step={3}
      title="¿Qué país defiendes?"
      lead="Cada dossier está escrito para esta conferencia: postura en tu comisión, prioridades, vulnerabilidades, líneas rojas y fuentes oficiales para citar."
      aside={
        <div className="onboarding__card onboarding__card--accent">
          <p className="eyebrow">33 delegaciones</p>
          <p>
            La lista incluye las 22 delegaciones asignadas y diez adicionales para completar el
            tablero. Escocia aparece marcada porque no es Estado miembro de la ONU: su política
            exterior corresponde al Reino Unido.
          </p>
          <p className="muted small">
            Elige con criterio: tu país condiciona el tono, los aliados y las líneas rojas que
            defenderás.
          </p>
        </div>
      }
    >
      {status === 'loading' ? <LoadingBlock label="Cargando las delegaciones…" /> : null}
      {status === 'error' ? (
        <ErrorBlock
          message={error}
          onRetry={() => {
            setStatus('loading');
            api
              .countries()
              .then(({ countries: list }) => {
                setCountries(list);
                setStatus('ready');
              })
              .catch((cause: unknown) => {
                setError(cause instanceof Error ? cause.message : 'Error de red.');
                setStatus('error');
              });
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          <div className="filters">
            <label className="search">
              <Search aria-hidden="true" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar país o código (CH, Japón…)"
                aria-label="Buscar país"
              />
            </label>
            <div className="chips" role="group" aria-label="Filtrar por región">
              {regions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === region ? 'chip is-active' : 'chip'}
                  onClick={() => setRegion(item)}
                  aria-pressed={item === region}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <p className="muted small" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'delegación' : 'delegaciones'} disponibles
          </p>

          <ul className="country-grid">
            {visible.map((country) => {
              const isSelected = selected?.code === country.code;
              return (
                <li key={country.code}>
                  <button
                    type="button"
                    className={isSelected ? 'country-card is-selected' : 'country-card'}
                    onClick={() => setSelected(country)}
                    aria-pressed={isSelected}
                    style={{
                      borderColor: isSelected ? country.palette.primary : undefined,
                      background: isSelected ? mix(country.palette.primary, '#fffdf8', 0.92) : undefined,
                    }}
                  >
                    <span className="country-card__top">
                      <span className="country-card__flag" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span className="country-card__code">{country.code}</span>
                      {isSelected ? (
                        <span className="country-card__check" aria-hidden="true">
                          <Check size={13} />
                        </span>
                      ) : null}
                    </span>
                    <span className="country-card__name">{country.name}</span>
                    <span className="country-card__region">{country.region}</span>
                    {!country.unMember ? (
                      <span className="country-card__note">No es Estado miembro de la ONU</span>
                    ) : null}
                    <span className="country-card__palette" aria-hidden="true">
                      <i style={{ background: country.palette.primary }} />
                      <i style={{ background: country.palette.secondary }} />
                      <i style={{ background: country.palette.accent }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="actions actions--split">
            <button className="button button--ghost" type="button" onClick={() => navigate('/grado')}>
              <ArrowLeft aria-hidden="true" size={16} /> Atrás
            </button>
            <button
              className="button"
              type="button"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setCountry(selected);
                navigate('/comision');
              }}
            >
              {selected ? `Continuar con ${selected.name}` : 'Elige un país'}
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </div>
        </>
      ) : null}
    </OnboardingShell>
  );
}
