'use strict';

const { Pool } = require('pg');
const logger = require('./logger');
const { getRlsContext } = require('./db-context');

//const supabase = require('@supabase/supabase-js');
//supabase.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
logger.error('---> [DB] Conectando a la base de datos con URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_TIMEOUT || '10000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_POOL_CONNECTION_TIMEOUT || '5000', 10),
  statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '10000', 10),
  query_timeout: parseInt(process.env.PG_QUERY_TIMEOUT || '10000', 10),
  // PgBouncer (transaction pooling) es compatible: si PG_POOL_MODE=transaction,
  // el pool local sigue funcionando; documentado en .env.production.example
});



async function applyRlsContext(client) {
  const context = getRlsContext();
  await client.query(
    `SELECT
       set_config('app.rls.role', $1, false),
       set_config('app.rls.business_id', $2, false),
       set_config('app.rls.owner_id', $3, false),
       set_config('app.rls.customer_id', $4, false)`,
    [context.role, context.businessId, context.ownerId, context.customerId]
  );
}

async function connect() {
  const client = await pool.connect();
  try {
    await applyRlsContext(client);
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

async function query(text, values) {
  const client = await connect();
  try {
    return await client.query(text, values);
  } finally {
    client.release();
  }
}

pool.on('error', err => {
  logger.error('[DB] Error inesperado en cliente idle:', err.message);

});

pool.on('connect', () => {

  // Opcional: log solo en debug para no saturar en alta carga
  if (String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
    logger.debug('[DB] nueva conexión del pool establecida');
  }
});

module.exports = { query, connect, end: (...args) => pool.end(...args), pool };
