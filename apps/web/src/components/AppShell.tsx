import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Compass, LogOut, MessagesSquare, Swords } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { useSession } from '../lib/session';
import { themeVars } from '../lib/theme';
import { initials } from '../lib/format';
import type { CommitteeId } from '../types';

const NAV = [
  { to: '/app', label: 'Panel', icon: Compass, end: true },
  { to: '/app/dossier', label: 'Dossier', icon: BookOpen, end: false },
  { to: '/app/debate', label: 'Debate', icon: Swords, end: false },
  { to: '/app/investigacion', label: 'Investigación', icon: MessagesSquare, end: false },
];

const ROOM: Record<CommitteeId, string> = {
  UNESCO: 'Sala UNESCO · Educación',
  ECOSOC: 'Sala ECOSOC · Empleo',
};

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'brand brand--compact' : 'brand'}>
      <span className="brand__mark" aria-hidden="true">
        D
      </span>
      <span className="brand__word">
        Deba<span>Mun</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = profile ? `${profile.country.name} · DebaMun` : 'DebaMun';
  }, [profile]);

  if (!profile) return <>{children}</>;

  const style = themeVars(profile.country.palette, profile.committee.id);

  return (
    <div className="shell" style={style as CSSProperties}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/app" className="topbar__brand" aria-label="DebaMun, ir al panel">
            <Brand />
          </NavLink>

          <nav className="topnav" aria-label="Navegación principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'topnav__link is-active' : 'topnav__link')}
              >
                <item.icon aria-hidden="true" size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="topbar__identity">
            <div className="identity">
              <CountryFlag code={profile.country.code} className="identity__flag" />
              <span className="identity__text">
                <strong>{profile.country.name}</strong>
                <span>{ROOM[profile.committee.id]}</span>
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                signOut();
                navigate('/bienvenida', { replace: true });
              }}
              title="Cambiar delegación"
              aria-label="Salir y cambiar de delegación"
            >
              <LogOut aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      </header>

      <main id="contenido" className="page">
        {children}
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <span>
            DebaMun · {profile.conference.name} · {profile.conference.date}
          </span>
          <span className="footer__note">
            Asistente con fuentes verificables · Evaluación en Diálogo, Argumentos, Coherencia y
            Resolución
          </span>
        </div>
      </footer>

      <nav className="bottomnav" aria-label="Navegación principal móvil">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'bottomnav__link is-active' : 'bottomnav__link')}
          >
            <item.icon aria-hidden="true" size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function OnboardingShell({
  step,
  title,
  lead,
  children,
  aside,
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
  lead: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const steps = ['Tu nombre', 'Tu grado', 'Tu país', 'Tu comisión'];

  return (
    <div className="onboarding">
      <header className="onboarding__head">
        <Brand />
        <span className="onboarding__edition">Ecosoft 2026 · 9 de diciembre</span>
      </header>

      <div className="onboarding__body">
        <div className="onboarding__main">
          <ol className="steps" aria-label="Progreso del registro">
            {steps.map((label, index) => {
              const number = (index + 1) as 1 | 2 | 3 | 4;
              const state = number < step ? 'done' : number === step ? 'current' : 'todo';
              return (
                <li key={label} className={`steps__item is-${state}`}>
                  <span className="steps__number">{state === 'done' ? '✓' : number}</span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>

          <section className="onboarding__panel" aria-live="polite">
            <p className="eyebrow">Paso {step} de 4</p>
            <h1 className="display">{title}</h1>
            <p className="lead">{lead}</p>
            {children}
          </section>

          {aside ? <aside className="onboarding__aside">{aside}</aside> : null}
        </div>
      </div>
    </div>
  );
}

export function IdentityInline({ name, country }: { name: string; country: string }) {
  return (
    <span className="identity-inline" title={`${name} · ${country}`}>
      <span aria-hidden="true">{initials(name) || 'D'}</span>
      {name}
    </span>
  );
}
