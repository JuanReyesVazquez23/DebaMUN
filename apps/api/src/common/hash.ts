import { createHash } from 'node:crypto';

/** Hash estable y corto, usado para IDs de preguntas y semillas deterministas. */
export function shortHash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

/** PRNG determinista (mulberry32) para que una sesión pueda reproducirse. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(value: string): number {
  const hex = shortHash(value);
  return Number.parseInt(hex.slice(0, 8), 16);
}
