#!/usr/bin/env node
'use strict';

/**
 * Crea el siguiente archivo de migración numerado: `backend/db/migrations/NNNN_<nombre>.sql`.
 *
 * Uso:
 *   pnpm db:migrate:create -- nombre_de_la_migracion
 *   node scripts/create-migration.mjs mi_cambio
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'db', 'migrations');

const argIndex = process.argv.findIndex(a => a === '--');
const rawName = argIndex >= 0 ? process.argv.slice(argIndex + 1).join('_') : '';

if (!rawName) {
  console.error('Uso: pnpm db:migrate:create -- <nombre>');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => /^\d{4}_.*\.sql$/.test(f));
const next = (files.length ? Math.max(...files.map(f => Number(f.slice(0, 4)))) : 0) + 1;
const name = `${String(next).padStart(4, '0')}_${rawName.replace(/[^a-zA-Z0-9_]/g, '_')}.sql`;
const target = path.join(dir, name);

fs.writeFileSync(target, '-- Migración ' + name + '\n');
console.log(`[db:migrate:create] ${target}`);