'use strict';

/**
 * Logger estructurado basado en pino.
 *
 * - Emite JSON por línea (stdout) listo para ser recogido por Docker/journald
 *   o un agregador con `prettyPrint` en desarrollo.
 * - Añade contexto de servicio y un minimum ojo con NODE_ENV=test para no
 *   ensuciar la salida de los tests: en tests todo se reduce a warnings.
 * - Nivel configurable con LOG_LEVEL (info por defecto).
 */

const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';
const level = process.env.LOG_LEVEL || (isTest ? 'warn' : 'info');

const logger = pino({
  level,
  base: { service: 'reservorio-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'authorization',
      'req.headers.authorization',
      '*.token',
      'token',
      '*.pin',
      '*.password',
      'cookie',
      'x-api-key',
      'stripe-signature',
    ],
    censor: '[REDACTED]',
  },
  ...(isTest ? { enabled: false } : {}),
});

module.exports = logger;
