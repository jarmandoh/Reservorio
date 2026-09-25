'use strict';

const bcrypt = require('bcryptjs');
const { sign } = require('../middleware/jwt');
const { clean } = require('../middleware/sanitize');
const { syncInBackground } = require('./syncService');
const { createNotification } = require('./notifications.service');
const businessRepository = require('../repositories/business.repository');
const db = require('../db');
const cache = require('../cache');

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);
const CACHE_ENABLED = process.env.NODE_ENV !== 'test' && String(process.env.CACHE_DISABLED || '').toLowerCase() !== '1';

function stableStringify(obj) {
  if (!obj || typeof obj !== 'object') return String(obj ?? '');
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

function businessListCacheKey(filters) {
  const raw = stableStringify(filters || {});
  // Evita keys gigantes: hash simple si es muy largo
  if (raw.length > 200) {
    const { createHash } = require('crypto');
    return `biz:list:${createHash('sha256').update(raw).digest('hex').slice(0, 16)}`;
  }
  return `biz:list:${raw}`;
}

async function invalidateBusinessCache(businessId) {
  // Invalida listados y detalle. No bloquea la respuesta si falla.
  try {
    await cache.delByPrefix('biz:list:');
    await cache.delByPrefix('biz:listAll');
    await cache.delByPrefix('biz:owner:');
    if (businessId) {
      await cache.del(`biz:detail:${businessId}`);
      await cache.del(`ratings:avg:${businessId}`);
      await cache.delByPrefix(`ratings:list:${businessId}`);
    }
  } catch {}
}

async function attachLiveRatings(rows) {
  if (!rows || !rows.length) return rows;
  const ids = rows.map((r) => String(r.id));
  try {
    const { rows: agg } = await db.query(
      `SELECT business_id,
              ROUND(AVG(rating)::numeric, 1) AS avg_rating,
              COUNT(*) AS review_count
         FROM ratings
        WHERE business_id = ANY($1::text[])
        GROUP BY business_id`,
      [ids]
    );
    const byId = new Map(agg.map((a) => [String(a.business_id), a]));
    return rows.map((row) => {
      const live = byId.get(String(row.id));
      if (live && Number(live.review_count) > 0) {
        return { ...row, rating: Number(live.avg_rating), reviews: Number(live.review_count) };
      }
      return row;
    });
  } catch (_error) {
    return rows;
  }
}

function safenegocio(b) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    description: b.description,
    location: b.location,
    rating: Number(b.rating),
    reviews: b.reviews,
    tags: b.tags ? b.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    gradient: b.gradient,
    icon: b.icon,
    schedule: b.schedule,
    logo: b.logo,
    phone: b.phone,
    active: b.active,
    verified: !!b.verified,
    cancellationPolicy: b.cancellation_policy ?? '',
    available: 0,
    total: 0,
    routePath: `/booking/${b.id}`,
  };
}

async function listBusinesses(filters = {}) {
  const key = businessListCacheKey(filters);
  if (CACHE_ENABLED) {
    const cached = await cache.get(key);
    if (cached) return { ok: true, status: 200, data: cached };
  }
  const { rows } = await businessRepository.listBusinesses(filters);
  const live = await attachLiveRatings(rows);
  const data = live.map(safenegocio);
  if (CACHE_ENABLED) await cache.set(key, data, CACHE_TTL_SECONDS);
  return { ok: true, status: 200, data };
}

async function listAllBusinesses() {
  const key = 'biz:listAll:all';
  if (CACHE_ENABLED) {
    const cached = await cache.get(key);
    if (cached) return { ok: true, status: 200, data: cached };
  }
  const { rows } = await businessRepository.listAllBusinesses();
  const live = await attachLiveRatings(rows);
  const data = live.map(safenegocio);
  if (CACHE_ENABLED) await cache.set(key, data, CACHE_TTL_SECONDS);
  return { ok: true, status: 200, data };
}

async function listOwnerBusinesses(ownerId) {
  const key = `biz:owner:${String(ownerId)}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(key);
    if (cached) return { ok: true, status: 200, data: cached };
  }
  const { rows } = await businessRepository.listOwnerBusinesses(ownerId);
  const live = await attachLiveRatings(rows);
  const data = live.map(safenegocio);
  if (CACHE_ENABLED) await cache.set(key, data, CACHE_TTL_SECONDS);
  return { ok: true, status: 200, data };
}

async function authenticateBusiness(businessId, pin) {
  const { rows } = await businessRepository.findBusinessById(businessId);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  const negocio = rows[0];
  if (!negocio.pin_hash) {
    return { ok: false, status: 503, message: 'PIN no configurado para este negocio' };
  }

  const valid = await bcrypt.compare(String(pin), negocio.pin_hash);
  if (!valid) {
    return { ok: false, status: 401, message: 'PIN incorrecto' };
  }

  const token = sign({ businessId: negocio.id, role: 'business-admin' });
  return { ok: true, status: 200, data: { token, business: safenegocio(negocio) } };
}

async function createBusiness(payload, ownerId = null) {
  const {
    name, category, description, location, rating, reviews, tags,
    gradient, icon, schedule, logo, phone,
    facebook, instagram, tiktok, whatsapp, linkedin, pin,
  } = payload ?? {};

  const id = clean(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + '_' + Date.now().toString(36);
  const pinHash = await bcrypt.hash(String(pin), 10);
  const tagsStr = Array.isArray(tags) ? tags.join(',') : clean(tags ?? '');

  await businessRepository.createBusiness({
    id,
    name,
    category,
    description,
    location,
    rating,
    reviews,
    tagsStr,
    gradient,
    icon,
    schedule,
    logo,
    phone,
    facebook,
    instagram,
    tiktok,
    whatsapp,
    linkedin,
    pinHash,
  }, ownerId);

  const { rows } = await businessRepository.findBusinessById(id);
  await invalidateBusinessCache(id);
  return { ok: true, status: 201, data: safenegocio(rows[0]) };
}

async function getBusinessById(businessId) {
  const key = `biz:detail:${businessId}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(key);
    if (cached) return { ok: true, status: 200, data: cached };
  }
  const { rows } = await businessRepository.findBusinessById(businessId);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  const live = await attachLiveRatings(rows);
  const data = safenegocio(live[0]);
  if (CACHE_ENABLED) await cache.set(key, data, CACHE_TTL_SECONDS);
  return { ok: true, status: 200, data };
}

async function updateBusiness(businessId, payload) {
  const sets = [];
  const vals = [];
  let idx = 1;

  const strFields = ['name', 'category', 'description', 'location', 'gradient', 'icon', 'schedule', 'logo', 'phone', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'linkedin'];
  for (const key of strFields) {
    if (payload?.[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(clean(payload[key]));
    }
  }

  if (payload?.cancellationPolicy !== undefined) {
    sets.push(`cancellation_policy = $${idx++}`);
    vals.push(clean(payload.cancellationPolicy));
  }

  if (payload?.rating !== undefined) {
    sets.push(`rating = $${idx++}`);
    vals.push(Number(payload.rating));
  }

  if (payload?.reviews !== undefined) {
    sets.push(`reviews = $${idx++}`);
    vals.push(Number(payload.reviews));
  }

  if (payload?.tags !== undefined) {
    const t = Array.isArray(payload.tags) ? payload.tags.join(',') : clean(payload.tags);
    sets.push(`tags = $${idx++}`);
    vals.push(t);
  }

  if (payload?.pin !== undefined) {
    sets.push(`pin_hash = $${idx++}`);
    vals.push(await bcrypt.hash(String(payload.pin), 10));
  }

  if (!sets.length) {
    return { ok: false, status: 400, message: 'Sin campos para actualizar' };
  }

  const result = await businessRepository.updateBusiness(businessId, sets, vals);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  await invalidateBusinessCache(businessId);
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function toggleBusiness(businessId) {
  const result = await businessRepository.toggleBusiness(businessId);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  await invalidateBusinessCache(businessId);
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function setBusinessVerified(businessId, verified) {
  const result = await businessRepository.setBusinessVerified(businessId, !!verified);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  await invalidateBusinessCache(businessId);
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function deleteBusiness(businessId) {
  const result = await businessRepository.deleteBusiness(businessId);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  await invalidateBusinessCache(businessId);
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function listReservations(businessId) {
  const { rows } = await businessRepository.listReservations(businessId);
  return { ok: true, status: 200, data: rows };
}

async function listAvailability(businessId) {
  const { rows } = await businessRepository.listReservations(businessId);
  return {
    ok: true,
    status: 200,
    data: rows.map(r => ({ id: r.id, franja: r.franja, disponibilidad: r.disponibilidad })),
  };
}

async function createReservation(businessId, payload) {
  const { franja, cliente, telefono, servicio, notas } = payload ?? {};
  const { rows: negocioRows } = await businessRepository.findBusinessById(businessId);
  if (!negocioRows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  let rows;
  try {
    const result = await businessRepository.createReservation(businessId, franja, cliente, telefono, servicio, notas);
    rows = result.rows;
  } catch (error) {
    if (String(error.code) === '23505') {
      return { ok: false, status: 409, message: 'Franja no disponible' };
    }
    throw error;
  }

  if (!rows.length) {
    return { ok: false, status: 409, message: 'Franja no disponible' };
  }

  syncInBackground(businessId, 'reservations');

  await createNotification({
    businessId,
    type: 'booking_created',
    channel: 'in_app',
    title: 'Nueva reserva',
    message: `${cliente || 'Un cliente'} pidió la franja de las ${franja}.`,
    status: 'queued',
  });

  return { ok: true, status: 201, data: rows[0] };
}

async function updateReservation(businessId, reservationId, payload) {
  const result = await businessRepository.updateReservation(businessId, reservationId, payload.disponibilidad, payload?.notas ?? '');
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Reserva no encontrada' };
  }
  syncInBackground(businessId, 'reservations');

  const estado = String(payload.disponibilidad ?? '').trim().toLowerCase();
  if (estado === 'confirmado' || estado === 'cancelado') {
    await createNotification({
      businessId,
      type: estado === 'confirmado' ? 'booking_confirmed' : 'booking_cancelled',
      channel: 'in_app',
      title: estado === 'confirmado' ? 'Reserva confirmada' : 'Reserva cancelada',
      message: estado === 'confirmado'
        ? `La reserva de las ${result.rows[0].franja} fue confirmada.`
        : `La reserva de las ${result.rows[0].franja} fue cancelada.`,
      status: 'queued',
    });
  }

  return { ok: true, status: 200, data: result.rows[0] };
}

async function listServices(businessId) {
  const { rows } = await businessRepository.listServices(businessId);
  return { ok: true, status: 200, data: rows.map((row) => row.nombre) };
}

async function addService(businessId, nombre) {
  const cleanedName = clean(nombre);
  await businessRepository.addService(businessId, cleanedName);
  syncInBackground(businessId, 'services');
  return { ok: true, status: 201, data: { nombre: cleanedName } };
}

async function removeService(businessId, nombre) {
  const cleanedName = clean(decodeURIComponent(nombre ?? ''));
  const result = await businessRepository.removeService(businessId, cleanedName);
  if (!result.rowCount) {
    return { ok: false, status: 404, message: 'Servicio no encontrado' };
  }
  syncInBackground(businessId, 'services');
  return { ok: true, status: 200 };
}

module.exports = {
  safenegocio,
  listBusinesses,
  listAllBusinesses,
  listOwnerBusinesses,
  authenticateBusiness,
  createBusiness,
  getBusinessById,
  updateBusiness,
  toggleBusiness,
  setBusinessVerified,
  deleteBusiness,
  listReservations,
  listAvailability,
  createReservation,
  updateReservation,
  listServices,
  addService,
  removeService,
};
