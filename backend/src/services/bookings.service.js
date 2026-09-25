'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const { createNotification } = require('./notifications.service');
const { parsePagination } = require('../utils/pagination');
const logger = require('../logger');
const { broadcastBookingCreated } = require('./realtime.service');

function mapBooking(row) {
  if (!row) return row;

  return {
    id: row.id,
    providerId: row.provider_id ?? row.providerId,
    customerId: row.customer_id ?? row.customerId,
    serviceId: row.service_id ?? row.serviceId,
    date: row.booking_date ?? row.date,
    slot: row.slot,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBookings(query = {}) {
  if (!process.env.DATABASE_URL) {
    logger.error('[bookings] listBookings: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  try {
    const { page, pageSize, limit, offset, paginated } = parsePagination(query);
    let sql = 'SELECT * FROM bookings ORDER BY created_at DESC';
    const values = [];
    if (paginated) {
      sql += ' LIMIT $1 OFFSET $2';
      values.push(limit, offset);
    }

    const { rows } = await db.query(sql, values);
    const result = { ok: true, status: 200, data: rows.map(mapBooking) };

    if (paginated) {
      const count = await db.query('SELECT COUNT(*)::int AS total FROM bookings');
      result.meta = { total: Number(count.rows[0]?.total) || 0, page, pageSize };
    }

    return result;
  } catch (error) {
    logger.error('[bookings] listBookings falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

async function createBooking(payload = {}) {
  const providerId = String(payload.providerId ?? '').trim();
  const customerId = String(payload.customerId ?? '').trim();
  const serviceId = String(payload.serviceId ?? '').trim();
  const date = String(payload.date ?? '').trim();
  const slot = String(payload.slot ?? '').trim();
  const notes = String(payload.notes ?? '').trim();

  if (!providerId || !customerId || !serviceId || !date || !slot) {
    return { ok: false, status: 400, message: 'providerId, customerId, serviceId, date y slot son requeridos' };
  }

  if (!process.env.DATABASE_URL) {
    logger.error('[bookings] createBooking: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  try {
    const providerCheck = await db.query('SELECT id FROM businesses WHERE id = $1', [providerId]);
    if (!providerCheck.rows.length) {
      return { ok: false, status: 404, message: 'Proveedor no encontrado' };
    }

    const customerCheck = await db.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (!customerCheck.rows.length) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }

    const id = randomUUID();
    let rows;
    try {
      const result = await db.query(
        `INSERT INTO bookings (id, provider_id, customer_id, service_id, booking_date, slot, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, providerId, customerId, serviceId, date, slot, 'pending', notes]
      );
      rows = result.rows;
    } catch (error) {
      if (String(error.code) === '23505') {
        return { ok: false, status: 409, message: 'Horario no disponible, ya hay una reserva en esa franja' };
      }
      throw error;
    }

    await createNotification({
      businessId: providerId,
      customerId,
      bookingId: id,
      type: 'booking_created',
      channel: 'in_app',
      title: 'Nueva reserva',
      message: `Nueva solicitud para ${serviceId} en ${date} · ${slot}.`,
      status: 'queued',
    });

    try {
      broadcastBookingCreated(rows[0]);
    } catch {}

    return { ok: true, status: 201, data: mapBooking(rows[0]) };
  } catch (error) {
    logger.error('[bookings] createBooking falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = { listBookings, createBooking };
