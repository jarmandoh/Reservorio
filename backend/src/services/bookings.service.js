'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

const fallbackBookings = [];

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

async function listBookings() {
  if (!process.env.DATABASE_URL) {
    return { ok: true, status: 200, data: fallbackBookings.map(mapBooking) };
  }

  try {
    const { rows } = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return { ok: true, status: 200, data: rows.map(mapBooking) };
  } catch (error) {
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
    const booking = {
      id: `booking-${Date.now()}`,
      providerId,
      customerId,
      serviceId,
      date,
      slot,
      status: 'pending',
      notes,
    };
    fallbackBookings.push(booking);
    return { ok: true, status: 201, data: booking };
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
    const { rows } = await db.query(
      `INSERT INTO bookings (id, provider_id, customer_id, service_id, booking_date, slot, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, providerId, customerId, serviceId, date, slot, 'pending', notes]
    );

    return { ok: true, status: 201, data: mapBooking(rows[0]) };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = { listBookings, createBooking };
