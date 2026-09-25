'use strict';

const db = require('../db');
const { clean } = require('../middleware/sanitize');

function buildBusinessWhereClauses(filters = {}) {
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
    clauses.push(
      `(name ILIKE $${values.length} OR description ILIKE $${values.length} OR location ILIKE $${values.length} OR category ILIKE $${values.length} OR tags ILIKE $${values.length})`
    );
  }

  const tagInput = String(tags ?? interest ?? '').trim();
  if (tagInput) {
    const tagList = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    for (const tag of tagList) {
      values.push(`%${clean(tag)}%`);
      clauses.push(`tags ILIKE $${values.length}`);
    }
  }

  return { clauses, values };
}

async function listBusinesses(filters = {}, pagination = null) {
  const { clauses, values } = buildBusinessWhereClauses(filters);

  let query = `SELECT * FROM businesses WHERE ${clauses.join(' AND ')} ORDER BY name`;
  if (pagination && pagination.paginated) {
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(pagination.limit, pagination.offset);
  }
  return db.query(query, values);
}

async function countBusinesses(filters = {}) {
  const { clauses, values } = buildBusinessWhereClauses(filters);
  const query = `SELECT COUNT(*)::int AS total FROM businesses WHERE ${clauses.join(' AND ')}`;
  const { rows } = await db.query(query, values);
  return Number(rows[0]?.total) || 0;
}

async function listAllBusinesses() {
  return db.query('SELECT * FROM businesses ORDER BY name');
}

async function listOwnerBusinesses(ownerId) {
  return db.query(
    `SELECT b.* FROM businesses b
       JOIN business_owners bo ON bo.business_id = b.id
       WHERE bo.owner_id = $1
       ORDER BY b.name`,
    [ownerId]
  );
}

async function findBusinessById(businessId) {
  return db.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
}

async function createBusiness(payload, ownerId = null) {
  const {
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
  } = payload;

  const result = await db.query(
    `INSERT INTO businesses
       (id, name, category, description, location, rating, reviews,
        tags, gradient, icon, schedule, logo, phone,
        facebook, instagram, tiktok, whatsapp, linkedin,
        active, pin_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id,
      clean(name),
      clean(category),
      clean(description ?? ''),
      clean(location ?? ''),
      Number(rating ?? 5.0),
      Number(reviews ?? 0),
      tagsStr,
      clean(gradient ?? 'linear-gradient(135deg,#005bbf,#1a73e8)'),
      clean(icon ?? 'store'),
      clean(schedule ?? ''),
      clean(logo ?? ''),
      clean(phone ?? ''),
      clean(facebook ?? ''),
      clean(instagram ?? ''),
      clean(tiktok ?? ''),
      clean(whatsapp ?? ''),
      clean(linkedin ?? ''),
      true,
      pinHash,
    ]
  );

  if (ownerId) {
    await db.query('INSERT INTO business_owners (business_id, owner_id) VALUES ($1, $2)', [id, ownerId]);
  }

  return result;
}

async function updateBusiness(businessId, sets, values) {
  return db.query(`UPDATE businesses SET ${sets.join(', ')} WHERE id = $${values.length + 1} RETURNING *`, [
    ...values,
    businessId,
  ]);
}

async function toggleBusiness(businessId) {
  return db.query('UPDATE businesses SET active = NOT active WHERE id = $1 RETURNING *', [businessId]);
}

async function setBusinessVerified(businessId, verified) {
  return db.query('UPDATE businesses SET verified = $1 WHERE id = $2 RETURNING *', [verified, businessId]);
}

async function deleteBusiness(businessId) {
  return db.query('DELETE FROM businesses WHERE id = $1 RETURNING *', [businessId]);
}

async function listReservations(businessId, pagination = null) {
  if (pagination && pagination.paginated) {
    return db.query('SELECT * FROM reservations WHERE business_id = $1 ORDER BY franja LIMIT $2 OFFSET $3', [
      businessId,
      pagination.limit,
      pagination.offset,
    ]);
  }
  return db.query('SELECT * FROM reservations WHERE business_id = $1 ORDER BY franja', [businessId]);
}

async function countReservations(businessId) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM reservations WHERE business_id = $1', [
    businessId,
  ]);
  return Number(rows[0]?.total) || 0;
}

async function createReservation(businessId, franja, cliente, telefono, servicio, notas) {
  return db.query(
    `INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
     VALUES ($1,$2,'Reservado',$3,$4,$5,$6) RETURNING *`,
    [businessId, clean(franja), clean(cliente), clean(telefono), clean(servicio ?? ''), clean(notas ?? '')]
  );
}

async function checkReservationSlotTaken(businessId, franja) {
  return db.query(
    `SELECT id FROM reservations WHERE business_id = $1 AND franja = $2 AND disponibilidad != 'Disponible'`,
    [businessId, clean(franja)]
  );
}

async function updateReservation(businessId, reservationId, disponibilidad, notas) {
  return db.query(
    `UPDATE reservations SET disponibilidad = $1, notas = $2, updated_at = now()
     WHERE id = $3 AND business_id = $4 RETURNING *`,
    [clean(disponibilidad), clean(notas ?? ''), reservationId, businessId]
  );
}

async function listServices(businessId) {
  return db.query('SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre', [businessId]);
}

async function addService(businessId, nombre) {
  return db.query('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', [businessId, clean(nombre)]);
}

async function removeService(businessId, nombre) {
  return db.query('DELETE FROM services WHERE business_id = $1 AND nombre = $2', [
    businessId,
    clean(decodeURIComponent(nombre ?? '')),
  ]);
}

module.exports = {
  listBusinesses,
  countBusinesses,
  listAllBusinesses,
  listOwnerBusinesses,
  findBusinessById,
  getBusinessById: findBusinessById,
  createBusiness,
  updateBusiness,
  toggleBusiness,
  setBusinessVerified,
  deleteBusiness,
  listReservations,
  countReservations,
  createReservation,
  checkReservationSlotTaken,
  updateReservation,
  listServices,
  addService,
  removeService,
};
