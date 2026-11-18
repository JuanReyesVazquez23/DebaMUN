import type { GradeId } from '../types';

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function countWords(value: string): number {
  return (value.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function longDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const KIND_LABEL: Record<string, string> = {
  apertura: 'Apertura',
  seguimiento: 'Seguimiento',
  contrapunto: 'Contrapunto',
  crisis: 'Crisis',
  resolucion: 'Resolución',
  punto_informacion: 'Punto de información',
  datos: 'Evidencia',
};

export const GRADE_LABEL: Record<GradeId, string> = {
  '6': '6.º grado',
  '7': '7.º grado',
  '8': '8.º grado',
  '9': '9.º grado',
  '10': '10.º grado',
  '11': '11.º grado',
  '12': '12.º grado',
  universidad: 'Universidad',
};

export function gradeLabel(grade?: GradeId | null): string {
  return grade ? GRADE_LABEL[grade] : 'Grado sin indicar';
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
