import { describe, expect, it } from 'vitest';
import { countWords, formatSeconds, gradeLabel, hostOf, initials, longDate } from './format';

describe('format', () => {
  it('cuenta palabras con acentos y números', () => {
    expect(countWords('La educación es un derecho, no un privilegio.')).toBe(8);
    expect(countWords('')).toBe(0);
  });

  it('genera iniciales para el avatar', () => {
    expect(initials('Valentina Ríos')).toBe('VR');
    expect(initials('  ')).toBe('');
  });

  it('extrae el dominio sin www', () => {
    expect(hostOf('https://www.unesco.org/en/ai')).toBe('unesco.org');
    expect(hostOf('no-es-url')).toBe('no-es-url');
  });

  it('formatea segundos como mm:ss', () => {
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(-4)).toBe('0:00');
  });

  it('formatea la fecha de la conferencia en español', () => {
    expect(longDate('2026-12-09').toLowerCase()).toContain('diciembre');
  });

  it('etiqueta los grados nuevos y migra los antiguos', () => {
    expect(gradeLabel('primaria-3')).toBe('3.º de primaria');
    expect(gradeLabel('secundaria-6')).toBe('6.º de secundaria');
    expect(gradeLabel('universidad')).toBe('Universidad');
    expect(gradeLabel('10')).toBe('4.º de secundaria');
    expect(gradeLabel(null)).toBe('Grado sin indicar');
  });
});
