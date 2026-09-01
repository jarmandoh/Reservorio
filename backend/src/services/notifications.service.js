'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

const fallbackNotifications = [];

function mapNotification(row) {
  if (!row) return row;

  return {
    id: row.id,
    businessId: row.business_id ?? row.businessId,
    customerId: row.customer_id ?? row.customerId,
    bookingId: row.booking_id ?? row.bookingId,
    type: row.type ?? 'booking_created',
    channel: row.channel ?? 'in_app',
    title: row.title ?? '',
    message: row.message ?? '',
    status: row.status ?? 'queued',
    createdAt: row.created_at ?? row.createdAt,
    sentAt: row.sent_at ?? row.sentAt ?? null,
  };
}

async function listNotifications(filters = {}) {
  const businessId = String(filters.businessId ?? '').trim();
  const bookingId = String(filters.bookingId ?? '').trim();

  try {
    let query = 'SELECT * FROM notifications';
    const values = [];
    const clauses = [];

    if (businessId) {
      values.push(businessId);
      clauses.push(`business_id = $${values.length}`);
    }

    if (bookingId) {
      values.push(bookingId);
      clauses.push(`booking_id = $${values.length}`);
    }

    if (clauses.length) {
      query += ` WHERE ${clauses.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, values);
    return { ok: true, status: 200, data: rows.map(mapNotification) };
  } catch (_error) {
    const rows = fallbackNotifications.filter((notification) => {
      const matchesBusiness = !businessId || notification.businessId === businessId;
      const matchesBooking = !bookingId || notification.bookingId === bookingId;
      return matchesBusiness && matchesBooking;
    });
    return { ok: true, status: 200, data: rows.map(mapNotification) };
  }
}

async function createNotification(payload = {}) {
  const businessId = String(payload.businessId ?? '').trim();
  const customerId = String(payload.customerId ?? '').trim();
  const bookingId = String(payload.bookingId ?? '').trim();
  const type = String(payload.type ?? 'booking_created').trim();
  const channel = String(payload.channel ?? 'in_app').trim();
  const title = String(payload.title ?? '').trim();
  const message = String(payload.message ?? '').trim();
  const status = String(payload.status ?? 'queued').trim();

  if (!businessId || !title || !message) {
    return { ok: false, status: 400, message: 'businessId, title y message son requeridos' };
  }

  const notification = {
    id: `ntf-${Date.now()}-${randomUUID().slice(0, 8)}`,
    businessId,
    customerId: customerId || null,
    bookingId: bookingId || null,
    type,
    channel,
    title,
    message,
    status,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };

  try {
    const { rows } = await db.query(
      `INSERT INTO notifications (id, business_id, customer_id, booking_id, type, channel, title, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [notification.id, businessId, customerId || null, bookingId || null, type, channel, title, message, status]
    );

    return { ok: true, status: 201, data: mapNotification(rows[0]) };
  } catch (_error) {
    fallbackNotifications.push(notification);
    return { ok: true, status: 201, data: notification, message: 'Base de datos no disponible; se usó almacenamiento en memoria' };
  }
}

async function sendReminderNotification(payload = {}) {
  const businessId = String(payload.businessId ?? '').trim();
  const bookingId = String(payload.bookingId ?? '').trim();
  const customerId = String(payload.customerId ?? '').trim();

  if (!businessId || !bookingId) {
    return { ok: false, status: 400, message: 'businessId y bookingId son requeridos' };
  }

  return createNotification({
    businessId,
    customerId,
    bookingId,
    type: 'reminder',
    channel: 'in_app',
    title: 'Recordatorio de reserva',
    message: 'Tu cita está próxima. Revisa los detalles y confirma cualquier cambio.',
    status: 'queued',
  });
}

module.exports = { listNotifications, createNotification, sendReminderNotification };
