'use strict';

const { Pool } = require('pg');
const logger = require('./logger');

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

pool.on('error', err => {
  logger.error('[DB] Error inesperado en cliente idle:', err.message);
});

pool.on('connect', () => {
  // Opcional: log solo en debug para no saturar en alta carga
  if (String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
    logger.debug('[DB] nueva conexión del pool establecida');
  }
});

module.exports = pool;
