'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

const fallbackPayments = [];
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
  const currency = String(payload.currency ?? 'EUR').trim().toUpperCase();
  const method = String(payload.method ?? 'card').trim().toLowerCase();
  const status = String(payload.status ?? 'pending').trim();

  return { bookingId, providerId, customerId, amount, currency, method: allowedPaymentMethods.includes(method) ? method : 'card', status };
}

function upsertFallbackPayment(payment) {
  const idx = fallbackPayments.findIndex(item => item.bookingId === payment.bookingId);
  if (idx >= 0) {
    fallbackPayments[idx] = { ...fallbackPayments[idx], ...payment };
    return fallbackPayments[idx];
  }

  fallbackPayments.push(payment);
  return payment;
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
  } catch (_error) {
    return { ok: true, status: 200, data: fallbackPayments.map(mapPayment) };
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
    upsertFallbackPayment(payment);
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
  } catch (_error) {
    upsertFallbackPayment(payment);
    return { ok: true, status: 201, data: payment, message: 'Base de datos no disponible; uso en memoria' };
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

  const paymentRecord = await createPayment({
    bookingId,
    providerId,
    customerId,
    amount,
    currency,
    method,
    status: 'pending',
  });

  const successUrl = String(payload.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/payment/success?bookingId=${encodeURIComponent(bookingId)}`);
  const cancelUrl = String(payload.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/payment/cancel?bookingId=${encodeURIComponent(bookingId)}`);

  const paymentMethodTypes = method === 'paypal' ? ['paypal'] : ['card'];

  if (stripeClient) {
    try {
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Reserva ${bookingId}`,
              description: `Pago para ${providerId} · ${method}`,
            },
          },
        }],
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

  if (rawBody && Buffer.isBuffer(rawBody) && endpointSecret && stripeClient && signature) {
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
  const method = String(metadata.method || 'card').trim().toLowerCase();
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

  upsertFallbackPayment(payment);

  return { ok: true, status: 200, data: payment };
}

module.exports = { listPayments, createPayment, createCheckoutSession, processWebhook };
