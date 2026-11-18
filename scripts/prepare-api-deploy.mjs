#!/usr/bin/env node
/**
 * Prepara la función serverless de la API para Vercel.
 *
 * Copia el corpus editorial dentro de apps/api/data para que `includeFiles`
 * lo empaquete junto a la función. No se versiona: se genera en cada build.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'data');
const target = join(root, 'apps', 'api', 'data');

if (!existsSync(source)) {
  console.error('[debamun] No encontré la carpeta data/.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const file of ['topics.json', 'sources.json']) {
  cpSync(join(source, file), join(target, file));
}

for (const directory of ['countries', 'knowledge']) {
  cpSync(join(source, directory), join(target, directory), { recursive: true });
}

console.log('[debamun] Corpus copiado a apps/api/data para Vercel.');
