'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const channels = require('./channels');
const logger = require('../logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Tipos que además generan SMS (los recordatorios y confirmaciones lleguen al móvil).
const SMS_TYPES = new Set(['reminder', 'booking_confirmed', 'payment_received']);

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
  } catch (error) {
    logger.error('[notifications] listNotifications falló:', error.message);
    return { ok: false, status: 500, message: error.message };
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

    if (customerId) {
      // Copia externa (email/sms) � fire-and-forget, nunca bloquea ni propaga errores.
      deliverExternalNotification(notification).catch(error => {
        logger.error('[notifications] envío externo falló:', error?.message ?? error);
      });
    }

    return { ok: true, status: 201, data: mapNotification(rows[0]) };
  } catch (error) {
    logger.error('[notifications] createNotification falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

/**
 * Envía una copia del aviso por email (y SMS según el tipo) al cliente.
 * Tolerante a fallos: ante cualquier problema solo registra y continúa.
 */
async function deliverExternalNotification(notification) {
  const { businessId, bookingId, type, title, message } = notification;
  if (!notification.customerId) return;

  const rowsOf = result => (result && Array.isArray(result.rows) ? result.rows : []);

  try {
    const customerRows = rowsOf(await db.query('SELECT id, name, email, phone, sms_opt_in FROM customers WHERE id = $1', [notification.customerId]));
    const customer = customerRows[0];
    if (!customer) return;

    const businessRows = rowsOf(await db.query('SELECT name FROM businesses WHERE id = $1', [businessId]));
    const businessName = businessRows[0]?.name ?? '';

    let detail = '';
    if (bookingId) {
      try {
        const bookingRows = rowsOf(await db.query('SELECT booking_date, slot, service_id FROM bookings WHERE id = $1', [bookingId]));
        const booking = bookingRows[0];
        if (booking) {
          detail = ` el ${String(booking.booking_date).slice(0, 10)} a las ${booking.slot}${booking.service_id ? ` (${booking.service_id})` : ''}`;
        }
      } catch {
        // El detalle de la reserva es opcional.
      }
    }

    const businessRef = businessName ? ` en ${businessName}` : '';
    const subject = `${title}${businessRef}`;
    const body = `Hola ${customer.name},\n\n${message.trim()}${detail}.\n\nPuedes consultar tu historial en ${FRONTEND_URL}/customer/history.\n\n� Reservorio`;

    const outcome = { email: 'skipped', sms: 'skipped' };
    if (customer.email) {
      const emailResult = await channels.sendEmail({ to: customer.email, subject, textBody: body });
      outcome.email = emailResult.ok ? 'sent' : 'failed';
    }

    if (SMS_TYPES.has(type) && customer.phone && customer.sms_opt_in !== false) {
      const sms = `${subject}: ${message.trim()}${detail}`.slice(0, 160);
      const smsResult = await channels.sendSms({ to: customer.phone, message: sms });
      outcome.sms = smsResult.ok ? 'sent' : 'failed';
    }

    logger.info(`[notifications] externo ${type} �  email:${outcome.email} sms:${outcome.sms}`);
  } catch (error) {
    logger.error('[notifications] deliverExternalNotification ignorado:', error.message);
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

module.exports = { listNotifications, createNotification, sendReminderNotification, deliverExternalNotification };

