import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowRight,
  Building2,
  Compass,
  Globe2,
  Languages,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { SourceList } from '../components/SourceList';
import { useSession } from '../lib/session';

const SECTIONS = [
  { id: 'postura', label: 'Postura' },
  { id: 'contexto', label: 'Contexto' },
  { id: 'perfil', label: 'Perfil ONU' },
  { id: 'tips', label: 'Tips' },
  { id: 'datos', label: 'Datos' },
  { id: 'fuentes', label: 'Fuentes' },
];

export function DossierPage() {
  const { profile } = useSession();
  if (!profile) return null;

  const { country, committee } = profile;
  const stance = committee.id === 'UNESCO' ? country.unesco : country.ecosoc;

  return (
    <div className="dossier">
      <header className="dossier__head">
        <div className="dossier__title">
          <span className="dossier__flag" aria-hidden="true">
            {country.flag}
          </span>
          <div>
            <p className="eyebrow">Dossier de delegación · {country.region}</p>
            <h1 className="display">{country.name}</h1>
            <p className="muted">{country.officialName}</p>
          </div>
        </div>
        <div className="dossier__facts">
          <span>
            <Building2 aria-hidden="true" size={15} /> {country.capital}
          </span>
          <span>
            <Languages aria-hidden="true" size={15} /> {country.languages.join(' · ')}
          </span>
          <span>
            <MapPin aria-hidden="true" size={15} /> {country.region}
          </span>
          {country.unMember ? (
            <span className="badge badge--ok">
              <ShieldCheck aria-hidden="true" size={13} /> Estado miembro
            </span>
          ) : (
            <span className="badge badge--warn">No es Estado miembro</span>
          )}
        </div>
      </header>

      {country.modelNote ? (
        <p className="notice" role="note">
          <AlertOctagon aria-hidden="true" size={17} /> {country.modelNote}
        </p>
      ) : null}

      <nav className="section-nav" aria-label="Secciones del dossier">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <div className="dossier__grid">
        <section id="postura" className="panel panel--stance" aria-labelledby="stance-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Compass aria-hidden="true" size={13} /> {committee.abbr} · Postura oficial
              </p>
              <h2 id="stance-title">Qué defiende {country.name}</h2>
            </div>
          </header>
          <p className="stance__position">{stance.position}</p>

          <h3 className="subhead">
            <Sparkles aria-hidden="true" size={15} /> Prioridades
          </h3>
          <ul className="bullet-list">
            {stance.priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="split">
            <div>
              <h3 className="subhead">
                <AlertOctagon aria-hidden="true" size={15} /> Vulnerabilidad
              </h3>
              <p>{stance.vulnerability}</p>
            </div>
            <div>
              <h3 className="subhead">
                <Lightbulb aria-hidden="true" size={15} /> Palanca
              </h3>
              <p>{stance.leverage}</p>
            </div>
          </div>
        </section>

        <section id="contexto" className="panel" aria-labelledby="context-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Globe2 aria-hidden="true" size={13} /> Contexto
              </p>
              <h2 id="context-title">Realidad que debes conocer</h2>
            </div>
          </header>
          <dl className="context-list">
            <div>
              <dt>IA y educación</dt>
              <dd>{country.context.aiAndEducation}</dd>
            </div>
            <div>
              <dt>Empleo juvenil</dt>
              <dd>{country.context.youthLabour}</dd>
            </div>
            <div>
              <dt>Gobernanza digital</dt>
              <dd>{country.context.digitalGovernance}</dd>
            </div>
            <div>
              <dt>Tópico de la comisión</dt>
              <dd>{committee.topic}</dd>
            </div>
          </dl>
        </section>

        <section id="perfil" className="panel" aria-labelledby="profile-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Users aria-hidden="true" size={13} /> Perfil en la ONU
              </p>
              <h2 id="profile-title">Cómo negocia</h2>
            </div>
          </header>
          <p className="profile__style">{country.unProfile.style}</p>
          <p className="muted small">Bloque: {country.unProfile.bloc}</p>

          <div className="split">
            <div>
              <h3 className="subhead">Aliados habituales</h3>
              <ul className="tag-list tag-list--tight">
                {country.unProfile.allies.map((ally) => (
                  <li key={ally} className="tag">
                    {ally}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="subhead">Tensiones</h3>
              <ul className="bullet-list bullet-list--compact">
                {country.unProfile.tensions.map((tension) => (
                  <li key={tension}>{tension}</li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className="subhead">
            <ShieldCheck aria-hidden="true" size={15} /> Líneas rojas
          </h3>
          <ul className="redlines">
            {country.unProfile.redLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section id="tips" className="panel panel--tips" aria-labelledby="tips-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">
                <Lightbulb aria-hidden="true" size={13} /> Estrategia
              </p>
              <h2 id="tips-title">Tips para la sala</h2>
            </div>
          </header>
          <ol className="tips">
            {country.tips.map((tip, index) => (
              <li key={tip}>
                <span>{index + 1}</span>
                <p>{tip}</p>
              </li>
            ))}
          </ol>
          <Link className="button button--ghost" to="/app/debate">
            Practicar esta postura <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </section>

        <section id="datos" className="panel" aria-labelledby="facts-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">Datos verificables</p>
              <h2 id="facts-title">Para citar sin inventar</h2>
            </div>
          </header>
          <ul className="facts">
            {country.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>

        <section id="fuentes" className="panel" aria-labelledby="sources-title">
          <header className="panel__head">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2 id="sources-title">Fuentes de esta delegación</h2>
            </div>
          </header>
          <SourceList sources={[...country.sources, ...committee.sources]} />
        </section>
      </div>
    </div>
  );
}
