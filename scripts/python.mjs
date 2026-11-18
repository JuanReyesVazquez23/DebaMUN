#!/usr/bin/env node
/**
 * Resuelve el intérprete de Python del servicio de investigación.
 *
 * Uso:
 *   node scripts/python.mjs dev            # arranca FastAPI en :8000
 *   node scripts/python.mjs test           # pytest del servicio
 *   node scripts/python.mjs ingest CH      # ingesta Scrapy para un país
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serviceDir = join(root, 'services', 'research');
const isWindows = process.platform === 'win32';
const venvPython = join(
  serviceDir,
  '.venv',
  isWindows ? 'Scripts' : 'bin',
  isWindows ? 'python.exe' : 'python',
);
const python = existsSync(venvPython) ? venvPython : isWindows ? 'python' : 'python3';

const [command = 'dev', ...rest] = process.argv.slice(2);

function run(args, label, cwd = root) {
  console.log(`\n[debamun] ${label}\n`);
  const result = spawnSync(python, args, { stdio: 'inherit', cwd, env: process.env });
  if (result.error) {
    console.error(`[debamun] No pude ejecutar ${python}: ${result.error.message}`);
    console.error('[debamun] Crea el entorno con: cd services/research && python -m venv .venv');
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

switch (command) {
  case 'dev':
    run([join(serviceDir, 'run.py'), '--port', process.env.RESEARCH_PORT ?? '8000'], 'Servicio de investigación');
    break;
  case 'test':
    run(['-m', 'pytest', join(serviceDir, 'tests'), '-q'], 'Tests Python', serviceDir);
    break;
  case 'ingest': {
    const country = rest[0];
    if (!country) {
      console.error('[debamun] Indica un código de país: node scripts/python.mjs ingest CH');
      process.exit(1);
    }
    run([join(serviceDir, 'run.py'), '--ingest', country, ...rest.slice(1)], `Ingesta ${country}`);
    break;
  }
  default:
    console.error(`[debamun] Comando desconocido: ${command}`);
    process.exit(1);
}
