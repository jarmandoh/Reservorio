'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const { clean } = require('../middleware/sanitize');
const idempotency = require('./idempotency.service');
const { syncInBackground } = require('./syncService');
const { broadcastBookingCreated } = require('./realtime.service');
const { deliverExternalNotification } = require('./notifications.service');

async function checkoutForBusiness(businessId, payload = {}, idempotencyKey) {
  const data = {
    businessId: String(businessId ?? '').trim(),
    franja: String(payload.franja ?? '').trim(),
    cliente: String(payload.cliente ?? '').trim(),
    telefono: String(payload.telefono ?? '').trim(),
    servicio: String(payload.servicio ?? '').trim(),
    notas: String(payload.notas ?? '').trim(),
    email: String(payload.email ?? payload._customerEmail ?? '').trim().toLowerCase(),
    dataConsent: payload.dataConsent === true,
    marketingConsent: payload.marketingConsent === true,
    customerId: String(payload._customerId ?? '').trim(),
  };

  if (!data.franja || !data.cliente || !data.telefono) {
    return { ok: false, status: 400, message: 'franja, cliente y telefono son requeridos' };
  }

  const scope = `business-checkout:${data.businessId}:${data.customerId || data.email}`;
  let claimed;
  try {
    claimed = await idempotency.claim(scope, idempotencyKey, data);
  } catch (error) {
    return { ok: false, status: 500, message: error.message || 'No se pudo iniciar la reserva' };
  }
  if (!claimed.claim) return { ...claimed.result, ...(claimed.inProgress ? { inProgress: true } : {}), ...(claimed.replayed ? { replayed: true } : {}) };

  let client;
  let booking;
  let customerNotification;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const { rows: businessRows } = await client.query('SELECT id FROM businesses WHERE id = $1', [data.businessId]);
    if (!businessRows.length) throw Object.assign(new Error('Negocio no encontrado'), { status: 404 });

    const { rows: reservationRows } = await client.query(
      `INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
       VALUES ($1, $2, 'Reservado', $3, $4, $5, $6)
       RETURNING id`,
      [data.businessId, clean(data.franja), clean(data.cliente), clean(data.telefono), clean(data.servicio), clean(data.notas)]
    );
    const actualReservationId = reservationRows[0]?.id;
    if (!actualReservationId) throw new Error('No se pudo recuperar la reserva creada');

    let customerId = data.customerId;
    if (customerId) {
      const { rows } = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
      if (!rows.length) throw Object.assign(new Error('Cliente autenticado no encontrado'), { status: 401 });
    } else {
      if (!data.email) data.email = `guest-${claimed.claim.key}@reservando.local`;
      const { rows } = await client.query(
        `INSERT INTO customers (id, name, email, phone, data_consent, consent_at, marketing_consent)
         VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN now() ELSE NULL END, $6)
         ON CONFLICT (email) DO UPDATE SET
           data_consent = customers.data_consent OR EXCLUDED.data_consent,
           consent_at = CASE WHEN EXCLUDED.data_consent THEN COALESCE(customers.consent_at, now()) ELSE customers.consent_at END
         RETURNING id`,
        [randomUUID(), clean(data.cliente), data.email, clean(data.telefono), data.dataConsent, data.marketingConsent]
      );
      customerId = rows[0].id;
    }

    const bookingId = randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings (id, provider_id, customer_id, service_id, booking_date, slot, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [bookingId, data.businessId, customerId, data.servicio || '-', date, clean(data.franja), clean(data.notas)]
    );
    booking = bookingRows[0];

    const businessNoticeId = `ntf-${randomUUID()}`;
    const customerNoticeId = `ntf-${randomUUID()}`;
    await client.query(
      `INSERT INTO notifications (id, business_id, booking_id, type, channel, title, message, status)
       VALUES ($1, $2, $3, 'booking_created', 'in_app', 'Nueva reserva', $4, 'queued')`,
      [businessNoticeId, data.businessId, bookingId, `${data.cliente || 'Un cliente'} pidió la franja de las ${data.franja}.`]
    );
    await client.query(
      `INSERT INTO notifications (id, business_id, customer_id, booking_id, type, channel, title, message, status)
       VALUES ($1, $2, $3, $4, 'booking_created', 'in_app', 'Nueva reserva', $5, 'queued')`,
      [customerNoticeId, data.businessId, customerId, bookingId, `Nueva solicitud para ${data.servicio || '-'} en ${date} · ${data.franja}.`]
    );
    customerNotification = {
      id: customerNoticeId,
      businessId: data.businessId,
      customerId,
      bookingId,
      type: 'booking_created',
      title: 'Nueva reserva',
      message: `Nueva solicitud para ${data.servicio || '-'} en ${date} · ${data.franja}.`,
    };

    const result = {
      ok: true,
      status: 201,
      data: { bookingId, customerId, reservationId: actualReservationId },
    };
    await idempotency.complete(client, claimed.claim, result);
    await client.query('COMMIT');

    try { syncInBackground(data.businessId, 'reservations'); } catch {}
    try { broadcastBookingCreated(booking); } catch {}
    try { deliverExternalNotification(customerNotification).catch(() => {}); } catch {}
    return result;
  } catch (error) {
    try { await client?.query('ROLLBACK'); } catch {}
    await idempotency.release(claimed.claim);
    if (String(error.code) === '23505') {
      return { ok: false, status: 409, message: 'Franja no disponible' };
    }
    if (error.status) return { ok: false, status: error.status, message: error.message };
    throw error;
  } finally {
    client?.release();
  }
}

module.exports = { checkoutForBusiness };
