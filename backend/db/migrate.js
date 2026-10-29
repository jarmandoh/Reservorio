'use strict';

/**
 * Aplicador del esquema SQL — sin dependencias externas.
 *
 * Ejecuta `backend/db/init.sql` completo dentro de una transacción. El archivo es
 * idempotente, por lo que se puede ejecutar sobre una base vacía o sobre una base
 * existente para aplicar cambios de esquema.
 *
 * Uso:
 *   node db/migrate.js
 *   pnpm db:migrate
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const SCHEMA_FILE = path.join(__dirname, 'init.sql');

if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  console.error('[db:migrate] DATABASE_URL inválida o ausente. Define la variable de entorno antes de ejecutar.');
  process.exit(1);
}

const ADVISORY_LOCK_ID = 727727727; // evita aplicar el esquema concurrentemente con --scale backend=3

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Lock distribuido: bloquea hasta adquirir, evita que 2 réplicas apliquen el esquema a la vez
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);

    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const startedAt = Date.now();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`[db:migrate] esquema aplicado desde init.sql (${Date.now() - startedAt}ms)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Fallo al aplicar init.sql: ${error.message}`);
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]);
    } catch {}
    await client.end();
  }
}

main().catch(error => {
  console.error(`[db:migrate] ${error.message}`);
  process.exit(1);
});
