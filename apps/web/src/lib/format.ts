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
  'primaria-1': '1.º de primaria',
  'primaria-2': '2.º de primaria',
  'primaria-3': '3.º de primaria',
  'primaria-4': '4.º de primaria',
  'primaria-5': '5.º de primaria',
  'primaria-6': '6.º de primaria',
  'secundaria-1': '1.º de secundaria',
  'secundaria-2': '2.º de secundaria',
  'secundaria-3': '3.º de secundaria',
  'secundaria-4': '4.º de secundaria',
  'secundaria-5': '5.º de secundaria',
  'secundaria-6': '6.º de secundaria',
  universidad: 'Universidad',
};

/** Grados guardados con el esquema anterior (6.º a 12.º). */
const LEGACY_GRADE: Record<string, GradeId> = {
  '6': 'primaria-6',
  '7': 'secundaria-1',
  '8': 'secundaria-2',
  '9': 'secundaria-3',
  '10': 'secundaria-4',
  '11': 'secundaria-5',
  '12': 'secundaria-6',
  universidad: 'universidad',
};

/** Acepta el id actual o uno antiguo guardado en localStorage. */
export function normalizeGrade(grade?: string | null): GradeId | null {
  if (!grade) return null;
  if (Object.hasOwn(GRADE_LABEL, grade)) return grade as GradeId;
  return LEGACY_GRADE[grade] ?? null;
}

export function gradeLabel(grade?: string | null): string {
  const normalized = normalizeGrade(grade);
  return normalized ? GRADE_LABEL[normalized] : 'Grado sin indicar';
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
