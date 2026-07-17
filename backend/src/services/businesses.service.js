'use strict';

const bcrypt = require('bcryptjs');
const { sign } = require('../middleware/jwt');
const { clean } = require('../middleware/sanitize');
const db = require('../db');
const { syncInBackground } = require('./syncService');

function safeBiz(b) {
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
    available: 0,
    total: 0,
    routePath: `/booking/${b.id}`,
  };
}

async function listBusinesses(filters = {}) {
  const { q, category, tags, location, interest } = filters;
  const values = [];
  const clauses = ['active = true'];

  if (category) {
    values.push(`%${clean(String(category))}%`);
    clauses.push(`category ILIKE $${values.length}`);
  }

  if (location) {
    values.push(`%${clean(String(location))}%`);
    clauses.push(`location ILIKE $${values.length}`);
  }

  const search = String(q ?? '').trim();
  if (search) {
    values.push(`%${clean(search)}%`);
    clauses.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length} OR location ILIKE $${values.length} OR category ILIKE $${values.length} OR tags ILIKE $${values.length})`);
  }

  const tagInput = String(tags ?? interest ?? '').trim();
  if (tagInput) {
    const tagList = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    for (const tag of tagList) {
      values.push(`%${clean(tag)}%`);
      clauses.push(`tags ILIKE $${values.length}`);
    }
  }

  const query = `SELECT * FROM businesses WHERE ${clauses.join(' AND ')} ORDER BY name`;
  const { rows } = await db.query(query, values);
  return { ok: true, status: 200, data: rows.map(safeBiz) };
}

async function listAllBusinesses() {
  const { rows } = await db.query('SELECT * FROM businesses ORDER BY name');
  return { ok: true, status: 200, data: rows.map(safeBiz) };
}

async function listOwnerBusinesses(ownerId) {
  const { rows } = await db.query(
    `SELECT b.* FROM businesses b
       JOIN business_owners bo ON bo.business_id = b.id
       WHERE bo.owner_id = $1
       ORDER BY b.name`,
    [ownerId]
  );
  return { ok: true, status: 200, data: rows.map(safeBiz) };
}

async function authenticateBusiness(businessId, pin) {
  const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  const biz = rows[0];
  if (!biz.pin_hash) {
    return { ok: false, status: 503, message: 'PIN no configurado para este negocio' };
  }

  const valid = await bcrypt.compare(String(pin), biz.pin_hash);
  if (!valid) {
    return { ok: false, status: 401, message: 'PIN incorrecto' };
  }

  const token = sign({ businessId: biz.id, role: 'business-admin' });
  return { ok: true, status: 200, data: { token, business: safeBiz(biz) } };
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

  await db.query(
    `INSERT INTO businesses
       (id, name, category, description, location, rating, reviews,
        tags, gradient, icon, schedule, logo, phone,
        facebook, instagram, tiktok, whatsapp, linkedin,
        active, pin_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id,
      clean(name), clean(category), clean(description ?? ''), clean(location ?? ''),
      Number(rating ?? 5.0), Number(reviews ?? 0),
      tagsStr,
      clean(gradient ?? 'linear-gradient(135deg,#005bbf,#1a73e8)'),
      clean(icon ?? 'store'), clean(schedule ?? ''), clean(logo ?? ''), clean(phone ?? ''),
      clean(facebook ?? ''), clean(instagram ?? ''), clean(tiktok ?? ''), clean(whatsapp ?? ''), clean(linkedin ?? ''),
      true, pinHash,
    ]
  );

  if (ownerId) {
    await db.query('INSERT INTO business_owners (business_id, owner_id) VALUES ($1, $2)', [id, ownerId]);
  }

  const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
  return { ok: true, status: 201, data: safeBiz(rows[0]) };
}

async function getBusinessById(businessId) {
  const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safeBiz(rows[0]) };
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

  vals.push(businessId);
  const result = await db.query(`UPDATE businesses SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  return { ok: true, status: 200, data: safeBiz(result.rows[0]) };
}

async function toggleBusiness(businessId) {
  const result = await db.query('UPDATE businesses SET active = NOT active WHERE id = $1 RETURNING *', [businessId]);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safeBiz(result.rows[0]) };
}

async function deleteBusiness(businessId) {
  const result = await db.query('DELETE FROM businesses WHERE id = $1 RETURNING *', [businessId]);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }
  return { ok: true, status: 200, data: safeBiz(result.rows[0]) };
}

async function listReservations(businessId) {
  const { rows } = await db.query('SELECT * FROM reservations WHERE business_id = $1 ORDER BY franja', [businessId]);
  return { ok: true, status: 200, data: rows };
}

async function createReservation(businessId, payload) {
  const { franja, cliente, telefono, servicio, notas } = payload ?? {};
  const { rows: bizRows } = await db.query('SELECT id FROM businesses WHERE id = $1 AND active = true', [businessId]);
  if (!bizRows.length) {
    return { ok: false, status: 404, message: 'Negocio no encontrado' };
  }

  const { rows: taken } = await db.query(`SELECT id FROM reservations WHERE business_id = $1 AND franja = $2 AND disponibilidad != 'Disponible'`, [businessId, clean(franja)]);
  if (taken.length) {
    return { ok: false, status: 409, message: 'Franja no disponible' };
  }

  const { rows } = await db.query(`INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
     VALUES ($1,$2,'Reservado',$3,$4,$5,$6) RETURNING *`, [businessId, clean(franja), clean(cliente), clean(telefono), clean(servicio ?? ''), clean(notas ?? '')]);
  syncInBackground(businessId, 'reservations');
  return { ok: true, status: 201, data: rows[0] };
}

async function updateReservation(businessId, reservationId, payload) {
  const result = await db.query(`UPDATE reservations SET disponibilidad = $1, notas = $2, updated_at = now()
     WHERE id = $3 AND business_id = $4 RETURNING *`, [clean(payload.disponibilidad), clean(payload?.notas ?? ''), reservationId, businessId]);
  if (!result.rows.length) {
    return { ok: false, status: 404, message: 'Reserva no encontrada' };
  }
  syncInBackground(businessId, 'reservations');
  return { ok: true, status: 200, data: result.rows[0] };
}

async function listServices(businessId) {
  const { rows } = await db.query('SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre', [businessId]);
  return { ok: true, status: 200, data: rows.map((row) => row.nombre) };
}

async function addService(businessId, nombre) {
  const cleanedName = clean(nombre);
  await db.query('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', [businessId, cleanedName]);
  syncInBackground(businessId, 'services');
  return { ok: true, status: 201, data: { nombre: cleanedName } };
}

async function removeService(businessId, nombre) {
  const cleanedName = clean(decodeURIComponent(nombre ?? ''));
  const result = await db.query('DELETE FROM services WHERE business_id = $1 AND nombre = $2', [businessId, cleanedName]);
  if (!result.rowCount) {
    return { ok: false, status: 404, message: 'Servicio no encontrado' };
  }
  syncInBackground(businessId, 'services');
  return { ok: true, status: 200 };
}

module.exports = {
  safeBiz,
  listBusinesses,
  listAllBusinesses,
  listOwnerBusinesses,
  authenticateBusiness,
  createBusiness,
  getBusinessById,
  updateBusiness,
  toggleBusiness,
  deleteBusiness,
  listReservations,
  createReservation,
  updateReservation,
  listServices,
  addService,
  removeService,
};
