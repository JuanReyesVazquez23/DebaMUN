import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, mix, readableOn, scoreTone, themeVars } from './theme';

describe('theme', () => {
  it('convierte hex corto y largo a rgb', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('CE1126')).toEqual({ r: 206, g: 17, b: 38 });
  });

  it('devuelve un fallback seguro ante un color inválido', () => {
    expect(hexToRgb('no-es-un-color')).toEqual({ r: 22, g: 22, b: 22 });
  });

  it('elige tinta legible según el fondo', () => {
    expect(readableOn('#16130e')).toBe('#ffffff');
    expect(readableOn('#ffd166')).toBe('#17140f');
  });

  it('mantiene contraste AA entre el acento y la tinta elegida', () => {
    const palette = ['#FF5A5F', '#FFD166', '#2ECC71', '#74ACDF', '#FF9933'];
    for (const color of palette) {
      expect(contrastRatio(color, readableOn(color))).toBeGreaterThanOrEqual(4.2);
    }
  });

  it('mezcla colores hacia el papel sin salir del rango', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000000', '#ffffff', 2)).toBe('#ffffff');
  });

  it('expone variables del país y de la comisión', () => {
    const vars = themeVars({ primary: '#FF5A5F', secondary: '#fff', accent: '#D80621' }, 'ECOSOC');
    expect(vars['--country']).toBe('#FF5A5F');
    expect(vars['--committee']).toBe('#1d7a4f');
    expect(vars['--country-soft']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('asigna tonos crecientes de puntaje', () => {
    expect(scoreTone(90)).toBe('var(--score-high)');
    expect(scoreTone(65)).toBe('var(--score-mid)');
    expect(scoreTone(45)).toBe('var(--score-low)');
    expect(scoreTone(10)).toBe('var(--score-weak)');
  });
});
