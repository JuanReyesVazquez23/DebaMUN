#!/usr/bin/env node
/**
 * Crea la base de datos (si no existe) y aplica db/schema.sql.
 *
 * Uso: node scripts/setup-db.mjs
 * Requiere DATABASE_URL o, por defecto, PostgreSQL local con debamun/postgres/postgres.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'apps', 'api', 'package.json'));
const { Client } = require('pg');

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/debamun';
const useSsl = process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(connectionString);

const parsed = new URL(connectionString);
const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'debamun';

function clientFor(connection, targetDatabase) {
  const url = new URL(connection);
  url.pathname = `/${targetDatabase}`;
  return new Client({
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });
}

async function ensureDatabase() {
  const client = clientFor(connectionString, database);
  try {
    await client.connect();
    await client.end();
    console.log(`[debamun] Base de datos "${database}" disponible.`);
    return;
  } catch (error) {
    if (error.code !== '3D000') {
      console.error(`[debamun] No pude conectar a PostgreSQL: ${error.message}`);
      console.error('[debamun] Revisa DATABASE_URL en apps/api/.env o arranca PostgreSQL.');
      process.exit(1);
    }
  }

  const admin = clientFor(connectionString, 'postgres');
  try {
    await admin.connect();
    const safeName = database.replace(/"/g, '""');
    await admin.query(`create database "${safeName}"`);
    console.log(`[debamun] Base de datos "${database}" creada.`);
  } catch (error) {
    console.error(`[debamun] No pude crear la base: ${error.message}`);
    process.exit(1);
  } finally {
    await admin.end().catch(() => undefined);
  }
}

async function applySchema() {
  const schema = readFileSync(join(root, 'db', 'schema.sql'), 'utf8');
  const client = clientFor(connectionString, database);
  try {
    await client.connect();
    await client.query(schema);
    const { rows } = await client.query(
      "select count(*)::int as tables from information_schema.tables where table_schema = 'public'",
    );
    console.log(`[debamun] Esquema aplicado: ${rows[0].tables} tablas en public.`);
  } catch (error) {
    console.error(`[debamun] Error aplicando el esquema: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

await ensureDatabase();
await applySchema();
