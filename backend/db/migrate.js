'use strict';

/**
 * Runner de migraciones SQL — sin dependencias externas.
 *
 * Aplica en orden todos los archivos `*.sql` de `backend/db/migrations/` y registra
 * cada uno en la tabla `schema_migrations` (nombre + timestamp). Es idempotente:
 * una migración ya aplicada nunca se vuelve a ejecutar, y cada una corre dentro de
 * una transacción (si falla, se revierte).
 *
 * Uso:
 *   node db/migrate.js
 *   pnpm db:migrate
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  console.error('[db:migrate] DATABASE_URL inválida o ausente. Define la variable de entorno antes de ejecutar.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => /\.sql$/i.test(file))
      .sort();

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map(row => row.name));

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const startedAt = Date.now();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        appliedCount += 1;
        console.log(`[db:migrate] aplicada ${file} (${Date.now() - startedAt}ms)`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Fallo al aplicar ${file}: ${error.message}`);
      }
    }

    console.log(`[db:migrate] ${appliedCount === 0 ? 'sin migraciones pendientes' : `${appliedCount} migración(es) aplicada(s)`}`);
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(`[db:migrate] ${error.message}`);
  process.exit(1);
});