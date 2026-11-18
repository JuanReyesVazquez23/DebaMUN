/** Grados escolares del sistema de DebaMun: primaria 1–6, secundaria 1–6 y universidad. */
export const GRADES = [
  'primaria-1',
  'primaria-2',
  'primaria-3',
  'primaria-4',
  'primaria-5',
  'primaria-6',
  'secundaria-1',
  'secundaria-2',
  'secundaria-3',
  'secundaria-4',
  'secundaria-5',
  'secundaria-6',
  'universidad',
] as const;

export type GradeId = (typeof GRADES)[number];

/** Valores guardados con el esquema anterior (6.º a 12.º). */
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

export function normalizeGrade(value?: string | null): GradeId | null {
  if (!value) return null;
  if ((GRADES as readonly string[]).includes(value)) return value as GradeId;
  return LEGACY_GRADE[value] ?? null;
}
