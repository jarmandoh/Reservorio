'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

// Vista en memoria (sin DATABASE_URL) con recorte para no crecer indefinidamente.
const memoryEvents = [];

async function recordView({ businessId } = {}) {
  const cleanBusinessId = businessId ? String(businessId).trim() : null;

  if (!process.env.DATABASE_URL) {
    memoryEvents.push({ eventType: 'view', businessId: cleanBusinessId, createdAt: new Date() });
    if (memoryEvents.length > 10_000) memoryEvents.splice(0, memoryEvents.length - 5_000);
    return { ok: true, status: 201, data: { accepted: true } };
  }

  try {
    await db.query(
      'INSERT INTO analytics_events (id, event_type, business_id) VALUES ($1, $2, $3)',
      [randomUUID(), 'view', cleanBusinessId]
    );
    return { ok: true, status: 201, data: { accepted: true } };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

/** Conteo de vistas en la ventana (default 30 días). Fallback en memoria. */
async function countViews({ days = 30 } = {}) {
  if (!process.env.DATABASE_URL) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return memoryEvents.filter(e => e.eventType === 'view' && e.createdAt.getTime() >= since).length;
  }

  try {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM analytics_events
       WHERE event_type = 'view' AND created_at >= now() - ($1::int * interval '1 day')`,
      [days]
    );
    return Number(rows[0]?.total) || 0;
  } catch {
    return 0;
  }
}

module.exports = { recordView, countViews };