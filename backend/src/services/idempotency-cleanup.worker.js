'use strict';

const db = require('../db');
const logger = require('../logger');

// shortcut: los replays se conservan 30 días y los webhooks 90; amplía estos plazos si la política operativa lo exige.
const IDEMPOTENCY_RETENTION_DAYS = 30;
const WEBHOOK_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function cleanupExpiredIdempotencyRecords() {
  const expiredRequests = await db.query(
    `DELETE FROM idempotency_requests
     WHERE (state = 'completed' AND updated_at < now() - ($1 * interval '1 day'))
        OR (state = 'processing' AND lease_until < now() - interval '1 day')`,
    [IDEMPOTENCY_RETENTION_DAYS]
  );
  const expiredEvents = await db.query(
    `DELETE FROM payment_webhook_events
     WHERE processed_at < now() - ($1 * interval '1 day')`,
    [WEBHOOK_RETENTION_DAYS]
  );

  return {
    requests: expiredRequests.rowCount || 0,
    webhookEvents: expiredEvents.rowCount || 0,
  };
}

function startIdempotencyCleanupWorker() {
  const cleanup = () =>
    cleanupExpiredIdempotencyRecords().catch(error => {
      logger.warn('[idempotency] no se pudo limpiar registros expirados:', error.message);
    });
  void cleanup();
  const interval = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  interval.unref();
  return interval;
}

module.exports = { cleanupExpiredIdempotencyRecords, startIdempotencyCleanupWorker };
