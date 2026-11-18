import { beforeEach, describe, expect, it } from 'vitest';
import { COLOR_SCHEME_KEY, readColorScheme } from './color-scheme';

describe('color scheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('respeta la preferencia guardada por el usuario', () => {
    localStorage.setItem(COLOR_SCHEME_KEY, 'dark');
    expect(readColorScheme()).toBe('dark');

    localStorage.setItem(COLOR_SCHEME_KEY, 'light');
    expect(readColorScheme()).toBe('light');
  });

  it('ignora valores desconocidos y usa el sistema', () => {
    localStorage.setItem(COLOR_SCHEME_KEY, 'sepia');
    expect(['light', 'dark']).toContain(readColorScheme());
  });
});
