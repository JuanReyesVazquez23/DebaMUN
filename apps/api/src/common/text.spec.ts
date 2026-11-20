import { describe, expect, it } from 'vitest';
import { truncate } from './text.js';

describe('truncate', () => {
  it('devuelve el texto intacto cuando cabe', () => {
    expect(truncate('Texto corto.', 40)).toBe('Texto corto.');
  });

  it('no corta palabras a la mitad', () => {
    const result = truncate('La Universidad Técnica de Dinamarca es la referencia en ingeniería', 30);

    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('La Universidad Técnica de…');
  });

  it('cae al recorte directo si el texto no tiene espacios', () => {
    expect(truncate('abcdefghijklmnop', 8)).toBe('abcdefg…');
  });
});
