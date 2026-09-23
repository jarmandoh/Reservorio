'use strict';

const bcrypt = require('bcryptjs');
const { sign } = require('../middleware/jwt');
const { clean } = require('../middleware/sanitize');
const { syncInBackground } = require('./syncService');
const businessRepository = require('../repositories/business.repository');
const db = require('../db');

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
  const { rows } = await businessRepository.listBusinesses(filters);
  const live = await attachLiveRatings(rows);
  return { ok: true, status: 200, data: live.map(safenegocio) };
}

async function listAllBusinesses() {
  const { rows } = await businessRepository.listAllBusinesses();
  const live = await attachLiveRatings(rows);
  return { ok: true, status: 200, data: live.map(safenegocio) };
}

async function listOwnerBusinesses(ownerId) {
  const { rows } = await businessRepository.listOwnerBusinesses(ownerId);
  const live = await attachLiveRatings(rows);
  return { ok: true, status: 200, data: live.map(safenegocio) };
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
  return { ok: true, status: 201, data: safenegocio(rows[0]) };
}

async function getBusinessById(businessId) {
  const { rows } = await businessRepository.findBusinessById(businessId);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  const live = await attachLiveRatings(rows);
  return { ok: true, status: 200, data: safenegocio(live[0]) };
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

  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function toggleBusiness(businessId) {
  const result = await businessRepository.toggleBusiness(businessId);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function setBusinessVerified(businessId, verified) {
  const result = await businessRepository.setBusinessVerified(businessId, !!verified);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function deleteBusiness(businessId) {
  const result = await businessRepository.deleteBusiness(businessId);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safenegocio(result.rows[0]) };
}

async function listReservations(businessId) {
  const { rows } = await businessRepository.listReservations(businessId);
  return { ok: true, status: 200, data: rows };
}

async function createReservation(businessId, payload) {
  const { franja, cliente, telefono, servicio, notas } = payload ?? {};
  const { rows: negocioRows } = await businessRepository.findBusinessById(businessId);
  if (!negocioRows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  const { rows: taken } = await businessRepository.checkReservationSlotTaken(businessId, franja);
  if (taken.length) {
    return { ok: false, status: 409, message: 'Franja no disponible' };
  }

  const { rows } = await businessRepository.createReservation(businessId, franja, cliente, telefono, servicio, notas);
  syncInBackground(businessId, 'reservations');
  return { ok: true, status: 201, data: rows[0] };
}

async function updateReservation(businessId, reservationId, payload) {
  const result = await businessRepository.updateReservation(businessId, reservationId, payload.disponibilidad, payload?.notas ?? '');
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Reserva no encontrada' };
  }
  syncInBackground(businessId, 'reservations');
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
  createReservation,
  updateReservation,
  listServices,
  addService,
  removeService,
};
