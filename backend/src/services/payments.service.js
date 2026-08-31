'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

const fallbackPayments = [];

function mapPayment(row) {
  if (!row) return row;

  return {
    id: row.id,
    bookingId: row.booking_id ?? row.bookingId,
    providerId: row.provider_id ?? row.providerId,
    customerId: row.customer_id ?? row.customerId,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'EUR',
    method: row.method ?? 'card',
    status: row.status ?? 'pending',
    createdAt: row.created_at ?? row.createdAt,
  };
}

async function listPayments(filters = {}) {
  const providerId = String(filters.providerId ?? '').trim();

  if (!process.env.DATABASE_URL) {
    const rows = fallbackPayments.map(mapPayment);
    return { ok: true, status: 200, data: providerId ? rows.filter(row => row.providerId === providerId) : rows };
  }

  try {
    let query = 'SELECT * FROM payments ORDER BY created_at DESC';
    const values = [];

    if (providerId) {
      query = 'SELECT * FROM payments WHERE provider_id = $1 ORDER BY created_at DESC';
      values.push(providerId);
    }

    const { rows } = await db.query(query, values);
    return { ok: true, status: 200, data: rows.map(mapPayment) };
  } catch (error) {
    return { ok: true, status: 200, data: fallbackPayments.map(mapPayment) };
  }
}

async function createPayment(payload = {}) {
  const bookingId = String(payload.bookingId ?? '').trim();
  const providerId = String(payload.providerId ?? '').trim();
  const customerId = String(payload.customerId ?? '').trim();
  const amount = Number(payload.amount ?? 0);
  const currency = String(payload.currency ?? 'EUR').trim().toUpperCase();
  const method = String(payload.method ?? 'card').trim();
  const status = String(payload.status ?? 'pending').trim();

  if (!bookingId || !providerId || !customerId) {
    return { ok: false, status: 400, message: 'bookingId, providerId y customerId son requeridos' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, message: 'amount debe ser un número mayor que 0' };
  }

  if (!['card', 'transfer', 'cash'].includes(method)) {
    return { ok: false, status: 400, message: 'method inválido' };
  }

  if (!['pending', 'paid', 'failed'].includes(status)) {
    return { ok: false, status: 400, message: 'status inválido' };
  }

  const payment = {
    id: `pay-${Date.now()}-${randomUUID().slice(0, 8)}`,
    bookingId,
    providerId,
    customerId,
    amount,
    currency,
    method,
    status,
    createdAt: new Date().toISOString(),
  };

  if (!process.env.DATABASE_URL) {
    fallbackPayments.push(payment);
    return { ok: true, status: 201, data: payment };
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO payments (id, booking_id, provider_id, customer_id, amount, currency, method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [payment.id, bookingId, providerId, customerId, amount, currency, method, status]
    );

    return { ok: true, status: 201, data: mapPayment(rows[0]) };
  } catch (error) {
    fallbackPayments.push(payment);
    return { ok: true, status: 201, data: payment, message: 'Base de datos no disponible; uso en memoria' };
  }
}

module.exports = { listPayments, createPayment };
