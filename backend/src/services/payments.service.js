'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const { createNotification } = require('./notifications.service');
const { parsePagination } = require('../utils/pagination');
const logger = require('../logger');

let stripeClient = null;

if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (_error) {
    stripeClient = null;
  }
}

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

const allowedPaymentMethods = ['card', 'paypal', 'transfer', 'cash'];

function normalizePaymentInput(payload = {}) {
  const bookingId = String(payload.bookingId ?? '').trim();
  const providerId = String(payload.providerId ?? '').trim();
  const customerId = String(payload.customerId ?? '').trim();
  const amount = Number(payload.amount ?? 0);
  const currency = String(payload.currency ?? 'EUR')
    .trim()
    .toUpperCase();
  const method = String(payload.method ?? 'card')
    .trim()
    .toLowerCase();
  const status = String(payload.status ?? 'pending').trim();

  return {
    bookingId,
    providerId,
    customerId,
    amount,
    currency,
    method: allowedPaymentMethods.includes(method) ? method : 'card',
    status,
  };
}

async function listPayments(filters = {}) {
  const providerId = String(filters.providerId ?? '').trim();

  try {
    const { page, pageSize, limit, offset, paginated } = parsePagination(filters);
    let query = 'SELECT * FROM payments';
    const values = [];

    if (providerId) {
      query += ' WHERE provider_id = $1';
      values.push(providerId);
    }

    query += ' ORDER BY created_at DESC';

    if (paginated) {
      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
    }

    const { rows } = await db.query(query, values);
    const result = { ok: true, status: 200, data: rows.map(mapPayment) };

    if (paginated) {
      const countValues = providerId ? [providerId] : [];
      const countQuery = providerId
        ? 'SELECT COUNT(*)::int AS total FROM payments WHERE provider_id = $1'
        : 'SELECT COUNT(*)::int AS total FROM payments';
      const count = await db.query(countQuery, countValues);
      result.meta = { total: Number(count.rows[0]?.total) || 0, page, pageSize };
    }

    return result;
  } catch (error) {
    logger.error('[payments] listPayments falló:', error.message);
    return { ok: false, status: 500, message: 'Error al listar los pagos' };
  }
}

async function createPayment(payload = {}) {
  const { bookingId, providerId, customerId, amount, currency, method, status } = normalizePaymentInput(payload);

  if (!bookingId || !providerId || !customerId) {
    return { ok: false, status: 400, message: 'bookingId, providerId y customerId son requeridos' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, message: 'amount debe ser un número mayor que 0' };
  }

  if (!allowedPaymentMethods.includes(method)) {
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
    logger.error('[payments] createPayment: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
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
    logger.error('[payments] createPayment falló:', error.message);
    return { ok: false, status: 500, message: 'Error al registrar el pago en la base de datos' };
  }
}

function getTransferInstructions(bookingId) {
  return {
    beneficiary: process.env.TRANSFER_BENEFICIARY || 'Reservorio S.L.',
    iban: process.env.TRANSFER_IBAN || 'ES00 0000 0000 0000 0000 0000',
    bank: process.env.TRANSFER_BANK || 'Reservorio Bank',
    reference: bookingId,
    currency: 'EUR',
  };
}

async function getPayment(id) {
  const cleanId = String(id ?? '').trim();
  if (!cleanId) {
    return { ok: false, status: 400, message: 'id requerido' };
  }

  if (!process.env.DATABASE_URL) {
    logger.error('[payments] getPayment: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  try {
    const { rows } = await db.query('SELECT * FROM payments WHERE id = $1', [cleanId]);
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Pago no encontrado' };
    }
    return { ok: true, status: 200, data: mapPayment(rows[0]) };
  } catch (error) {
    logger.error('[payments] getPayment falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

async function updatePaymentStatus(id, status) {
  const cleanId = String(id ?? '').trim();
  if (!['pending', 'paid', 'failed', 'refunded'].includes(status)) {
    return { ok: false, status: 400, message: 'status inválido' };
  }

  if (!process.env.DATABASE_URL) {
    logger.error('[payments] updatePaymentStatus: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  try {
    const { rows } = await db.query('UPDATE payments SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', [
      status,
      cleanId,
    ]);
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Pago no encontrado' };
    }

    const payment = mapPayment(rows[0]);
    if (status === 'paid' && payment.bookingId) {
      await db.query("UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1", [payment.bookingId]);
      await createNotification({
        businessId: payment.providerId,
        customerId: payment.customerId,
        bookingId: payment.bookingId,
        type: 'payment_received',
        channel: 'in_app',
        title: 'Pago confirmado',
        message: `Se registró el pago (${payment.amount} ${payment.currency}) de la reserva.`,
        status: 'queued',
      });
    }

    return { ok: true, status: 200, data: payment };
  } catch (error) {
    logger.error('[payments] updatePaymentStatus falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

async function createCheckoutSession(payload = {}) {
  const { bookingId, providerId, customerId, amount, currency, method } = normalizePaymentInput(payload);

  if (!bookingId || !providerId || !customerId) {
    return { ok: false, status: 400, message: 'bookingId, providerId y customerId son requeridos' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, message: 'amount debe ser un número mayor que 0' };
  }

  if (!allowedPaymentMethods.includes(method)) {
    return { ok: false, status: 400, message: 'method inválido' };
  }

  const paymentRecord = await createPayment({
    bookingId,
    providerId,
    customerId,
    amount,
    currency,
    method,
    status: 'pending',
  });

  if (!paymentRecord.ok) {
    return paymentRecord;
  }

  // Canales sin pasarela online: se registran con instrucciones para el cliente.
  if (method === 'transfer') {
    return {
      ok: true,
      status: 200,
      data: {
        paymentId: paymentRecord.data?.id,
        method: 'transfer',
        checkoutUrl: null,
        status: 'pending',
        instructions: getTransferInstructions(bookingId),
      },
    };
  }

  if (method === 'cash') {
    return {
      ok: true,
      status: 200,
      data: {
        paymentId: paymentRecord.data?.id,
        method: 'cash',
        checkoutUrl: null,
        status: 'pending',
        instructions: { message: 'Paga en efectivo en el establecimiento al completar el servicio.' },
      },
    };
  }

  const successUrl = String(
    payload.successUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:4200'}/payment/success?bookingId=${encodeURIComponent(bookingId)}`
  );
  const cancelUrl = String(
    payload.cancelUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:4200'}/payment/cancel?bookingId=${encodeURIComponent(bookingId)}`
  );

  const paymentMethodTypes = method === 'paypal' ? ['paypal'] : ['card'];

  if (stripeClient) {
    try {
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `Reserva ${bookingId}`,
                description: `Pago para ${providerId} · ${method}`,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          bookingId,
          providerId,
          customerId,
          paymentId: paymentRecord.data?.id || `pay-${Date.now()}`,
          method,
        },
        payment_method_types: paymentMethodTypes,
      });

      return {
        ok: true,
        status: 200,
        data: {
          sessionId: session.id,
          checkoutUrl: session.url,
          paymentId: paymentRecord.data?.id || session.metadata.paymentId,
        },
      };
    } catch (_error) {
      // fall through to dev fallback if Stripe is misconfigured
    }
  }

  const sessionId = `dev_session_${Date.now()}`;
  return {
    ok: true,
    status: 200,
    data: {
      sessionId,
      checkoutUrl: `${successUrl}&dev=1&session_id=${encodeURIComponent(sessionId)}`,
      paymentId: paymentRecord.data?.id,
    },
  };
}

async function processWebhook({ rawBody, signature, event }) {
  let processedEvent = event;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (endpointSecret && stripeClient) {
    if (!rawBody || !Buffer.isBuffer(rawBody) || !signature) {
      return { ok: false, status: 400, message: 'Firma de webhook inválida' };
    }
    try {
      processedEvent = stripeClient.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (_error) {
      return { ok: false, status: 400, message: 'Firma de webhook inválida' };
    }
  }

  const payloadEvent = processedEvent || {};
  if (!payloadEvent.type) {
    return { ok: false, status: 400, message: 'Evento de webhook inválido' };
  }

  if (payloadEvent.type !== 'checkout.session.completed') {
    return { ok: true, status: 200, data: { type: payloadEvent.type, status: 'ignored' } };
  }

  const session = payloadEvent.data?.object || {};
  const metadata = session.metadata || {};
  const bookingId = String(metadata.bookingId || session.bookingId || '').trim();
  const providerId = String(metadata.providerId || '').trim();
  const customerId = String(metadata.customerId || '').trim();
  const method = String(metadata.method || 'card')
    .trim()
    .toLowerCase();
  const status = session.payment_status === 'paid' ? 'paid' : 'pending';

  if (!bookingId || !providerId || !customerId) {
    return { ok: false, status: 400, message: 'Webhook sin metadata válida' };
  }

  const payment = {
    id: metadata.paymentId || `pay-${Date.now()}-${randomUUID().slice(0, 8)}`,
    bookingId,
    providerId,
    customerId,
    amount: Number((session.amount_total || 0) / 100) || 0,
    currency: String(session.currency || 'EUR').toUpperCase(),
    method: allowedPaymentMethods.includes(method) ? method : 'card',
    status,
    createdAt: new Date().toISOString(),
  };

  if (!process.env.DATABASE_URL) {
    logger.warn('[payments] webhook procesado sin DATABASE_URL; no se persiste');
  } else if (status === 'paid') {
    try {
      await db.query(`UPDATE payments SET status = $1, external_reference = $2, updated_at = now() WHERE id = $3`, [
        status,
        String(session.payment_intent || ''),
        payment.id,
      ]);
      await db.query(`UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1`, [bookingId]);
      await db.query(
        `UPDATE reservations SET disponibilidad = 'Confirmado', updated_at = now()
         WHERE business_id = $1 AND franja = (SELECT slot FROM bookings WHERE id = $2)`,
        [providerId, bookingId]
      );
    } catch (error) {
      logger.error('[payments] webhook: error al confirmar el pago en BD:', error.message);
      return { ok: false, status: 500, message: 'Error al confirmar el pago en la base de datos' };
    }
  }

  if (status === 'paid') {
    await createNotification({
      businessId: providerId,
      customerId,
      bookingId,
      type: 'payment_received',
      channel: 'in_app',
      title: 'Pago confirmado',
      message: `Se recibió el pago (${payment.amount} ${payment.currency}) de la reserva.`,
      status: 'queued',
    });
  }

  return { ok: true, status: 200, data: payment };
}

module.exports = {
  listPayments,
  createPayment,
  createCheckoutSession,
  processWebhook,
  getPayment,
  updatePaymentStatus,
};
