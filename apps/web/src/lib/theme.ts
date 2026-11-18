import type { CountryPalette, CommitteeId } from '../types';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;

  if (!/^[0-9a-f]{6}$/i.test(full)) return { r: 22, g: 22, b: 22 };

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Devuelve tinta clara u oscura según el fondo, con umbral conservador. */
export function readableOn(background: string): string {
  return contrastRatio(background, '#ffffff') >= 4.2 ? '#ffffff' : '#17140f';
}

export function mix(hex: string, target: string, weight: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const ratio = Math.min(1, Math.max(0, weight));
  const blend = (x: number, y: number) => Math.round(x * (1 - ratio) + y * ratio);
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(blend(a.r, b.r))}${toHex(blend(a.g, b.g))}${toHex(blend(a.b, b.b))}`;
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const COMMITTEE_ACCENT: Record<CommitteeId, string> = {
  UNESCO: '#0b6fb8',
  ECOSOC: '#1d7a4f',
};

/**
 * Traduce la paleta del país a variables CSS. La tinta y el acento se ajustan
 * para mantener contraste AA sobre el papel cálido de la interfaz, y se
 * recalibran cuando el tema es oscuro.
 * La comisión es obligatoria: ninguna comisión actúa como valor por defecto.
 */
export function themeVars(
  palette: CountryPalette,
  committee: CommitteeId,
  scheme: 'light' | 'dark' = 'light',
): Record<string, string> {
  const primary = palette.primary;
  const accent = COMMITTEE_ACCENT[committee];
  const dark = scheme === 'dark';

  return {
    '--country': primary,
    '--country-ink': readableOn(primary),
    '--country-deep': dark ? mix(primary, '#f3ecd9', 0.42) : mix(primary, '#141109', 0.45),
    '--country-soft': dark ? mix(primary, '#24211c', 0.8) : mix(primary, '#fbf7ee', 0.86),
    '--country-line': dark ? mix(primary, '#4a4236', 0.5) : mix(primary, '#e6dcc8', 0.55),
    '--country-wash': dark ? mix(primary, '#1a1814', 0.88) : mix(primary, '#f7f2e7', 0.93),
    '--country-halo': rgba(primary, dark ? 0.2 : 0.16),
    '--country-halo-accent': rgba(palette.accent, dark ? 0.16 : 0.12),
    '--country-accent': palette.accent,
    '--committee': accent,
    '--committee-soft': dark ? mix(accent, '#24211c', 0.8) : mix(accent, '#fbf7ee', 0.9),
  };
}

export function scoreTone(score: number): string {
  if (score >= 80) return 'var(--score-high)';
  if (score >= 60) return 'var(--score-mid)';
  if (score >= 40) return 'var(--score-low)';
  return 'var(--score-weak)';
}
