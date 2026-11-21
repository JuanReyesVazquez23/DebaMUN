import { beforeEach, describe, expect, it } from 'vitest';
import { applyPageMeta, canonicalForPath, metaForPath } from './seo';

describe('metaForPath', () => {
  it('indexa la portada y la bienvenida', () => {
    expect(metaForPath('/').index).toBe(true);
    expect(metaForPath('/bienvenida').index).toBe(true);

    for (const route of ['/grado', '/pais', '/comision', '/app', '/app/dossier', '/app/debate', '/no-existe']) {
      expect(metaForPath(route).index).toBe(false);
    }
  });

  it('tolera barras finales', () => {
    expect(metaForPath('/bienvenida/').index).toBe(true);
    expect(metaForPath('/app/').index).toBe(false);
  });

  it('usa el título de la bienvenida para la portada indexable', () => {
    expect(metaForPath('/bienvenida').title).toContain('DebaMun');
    expect(metaForPath('/no-existe').title).toContain('no existe');
  });
});

describe('canonicalForPath', () => {
  it('devuelve null mientras no haya dominio configurado', () => {
    expect(canonicalForPath('/bienvenida')).toBeNull();
  });
});

describe('applyPageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = [
      '<title>DebaMun</title>',
      '<meta name="description" content="Descripción inicial" />',
      '<meta name="robots" content="index,follow" />',
    ].join('');
  });

  it('actualiza las etiquetas existentes sin duplicarlas', () => {
    const meta = metaForPath('/grado');
    applyPageMeta(meta, 'https://debamun.vercel.app/grado');

    expect(document.title).toBe(meta.title);
    expect(document.head.querySelectorAll('title')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,nofollow',
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://debamun.vercel.app/grado',
    );
  });

  it('marca la bienvenida como indexable', () => {
    applyPageMeta(metaForPath('/bienvenida'), 'https://debamun.vercel.app/bienvenida');

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index,follow',
    );
  });

  it('elimina un canonical anterior si no hay dominio', () => {
    applyPageMeta(metaForPath('/bienvenida'), 'https://debamun.vercel.app/bienvenida');
    applyPageMeta(metaForPath('/bienvenida'), null);

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
  });

  it('crea las etiquetas si el HTML no las trae', () => {
    document.head.innerHTML = '';
    applyPageMeta(metaForPath('/bienvenida'), null);

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('title')).toHaveLength(1);
  });
});
