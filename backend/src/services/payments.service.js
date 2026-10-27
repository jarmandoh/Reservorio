'use strict';

const { createHash, randomUUID } = require('crypto');
const db = require('../db');
const { deliverExternalNotification } = require('./notifications.service');
const idempotency = require('./idempotency.service');
const { parsePagination } = require('../utils/pagination');
const logger = require('../logger');
const { DEFAULT_CURRENCY, normalizeCurrency } = require('../config/currency');

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
    currency: row.currency ?? DEFAULT_CURRENCY,
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
  const currency = normalizeCurrency(payload.currency);
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

async function createPayment(payload = {}, idempotencyKey) {
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

  if (!process.env.DATABASE_URL) {
    logger.error('[payments] createPayment: DATABASE_URL no configurado');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  const scope = `payment-create:${bookingId}`;
  let claimed;
  try {
    claimed = await idempotency.claim(scope, idempotencyKey, {
      bookingId,
      providerId,
      customerId,
      amount,
      currency,
      method,
      status,
    });
  } catch (error) {
    logger.error('[payments] createPayment: no se pudo reservar la clave idempotente:', error.message);
    return { ok: false, status: 500, message: 'Error al registrar el pago en la base de datos' };
  }
  if (!claimed.claim)
    return {
      ...claimed.result,
      ...(claimed.inProgress ? { inProgress: true } : {}),
      ...(claimed.replayed ? { replayed: true } : {}),
    };

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

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO payments (id, booking_id, provider_id, customer_id, amount, currency, method, status, idempotency_scope, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [payment.id, bookingId, providerId, customerId, amount, currency, method, status, scope, claimed.claim.key]
    );
    const { rows } = await client.query(
      'SELECT * FROM payments WHERE idempotency_scope = $1 AND idempotency_key = $2',
      [scope, claimed.claim.key]
    );
    const result = { ok: true, status: 201, data: mapPayment(rows[0]) };
    await idempotency.complete(client, claimed.claim, result);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client?.query('ROLLBACK');
    } catch {}
    await idempotency.release(claimed.claim);
    logger.error('[payments] createPayment falló:', error.message);
    return { ok: false, status: 500, message: 'Error al registrar el pago en la base de datos' };
  } finally {
    client?.release();
  }
}

function getTransferInstructions(bookingId) {
  return {
    beneficiary: process.env.TRANSFER_BENEFICIARY || 'Reservorio S.A.S.',
    iban: process.env.TRANSFER_IBAN || 'CO00 0000 0000 0000 0000 0000',
    bank: process.env.TRANSFER_BANK || 'Bancolombia',
    reference: bookingId,
    currency: DEFAULT_CURRENCY,
  };
}

function getCheckoutReturnUrls(payload, bookingId) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  let frontendOrigin;

  try {
    frontendOrigin = new URL(frontendUrl);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(frontendOrigin.protocol)) return null;
  if (process.env.NODE_ENV === 'production' && frontendOrigin.protocol !== 'https:') return null;

  const urls = [
    [payload.successUrl, `/payment/success?bookingId=${encodeURIComponent(bookingId)}`, '/payment/success'],
    [payload.cancelUrl, `/payment/cancel?bookingId=${encodeURIComponent(bookingId)}`, '/payment/cancel'],
  ];

  const validatedUrls = urls.map(([providedUrl, fallbackPath, expectedPath]) => {
    let parsedUrl;
    try {
      parsedUrl = providedUrl ? new URL(String(providedUrl)) : new URL(fallbackPath, frontendOrigin);
    } catch {
      return null;
    }

    if (parsedUrl.origin !== frontendOrigin.origin || parsedUrl.pathname !== expectedPath) return null;
    if (parsedUrl.username || parsedUrl.password || parsedUrl.hash) return null;
    return parsedUrl.toString();
  });

  if (validatedUrls.some(url => url === null)) return null;
  return { successUrl: validatedUrls[0], cancelUrl: validatedUrls[1] };
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

async function insertPaymentNotification(client, payment, message) {
  if (!payment.customer_id) return null;
  const notification = {
    id: `ntf-${randomUUID()}`,
    businessId: payment.provider_id,
    customerId: payment.customer_id,
    bookingId: payment.booking_id,
    type: 'payment_received',
    title: 'Pago confirmado',
    message,
  };
  await client.query(
    `INSERT INTO notifications (id, business_id, customer_id, booking_id, type, channel, title, message, status)
     VALUES ($1, $2, $3, $4, $5, 'in_app', $6, $7, 'queued')`,
    [
      notification.id,
      notification.businessId,
      notification.customerId,
      notification.bookingId,
      notification.type,
      notification.title,
      notification.message,
    ]
  );
  return notification;
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

  let client;
  let notification = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    let { rows } = await client.query(
      'UPDATE payments SET status = $1, updated_at = now() WHERE id = $2 AND status IS DISTINCT FROM $1 RETURNING *',
      [status, cleanId]
    );
    const transitioned = rows.length > 0;
    if (!transitioned) {
      ({ rows } = await client.query('SELECT * FROM payments WHERE id = $1', [cleanId]));
    }
    if (!rows.length) {
      await client.query('ROLLBACK');
      return { ok: false, status: 404, message: 'Pago no encontrado' };
    }

    const row = rows[0];
    if (transitioned && status === 'paid' && row.booking_id) {
      await client.query("UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1", [
        row.booking_id,
      ]);
      notification = await insertPaymentNotification(
        client,
        row,
        `Se registró el pago (${row.amount} ${row.currency}) de la reserva.`
      );
    }
    await client.query('COMMIT');
    if (notification) deliverExternalNotification(notification).catch(() => {});
    return { ok: true, status: 200, data: mapPayment(row) };
  } catch (error) {
    try {
      await client?.query('ROLLBACK');
    } catch {}
    logger.error('[payments] updatePaymentStatus falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  } finally {
    client?.release();
  }
}

async function createCheckoutSession(payload = {}, idempotencyKey) {
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

  if (!process.env.DATABASE_URL) {
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; el servicio requiere PostgreSQL' };
  }

  const returnUrls = getCheckoutReturnUrls(payload, bookingId);
  if (!returnUrls) {
    return { ok: false, status: 400, message: 'successUrl o cancelUrl inválida' };
  }

  const scope = `payment-checkout:${bookingId}`;
  let claimed;
  try {
    claimed = await idempotency.claim(scope, idempotencyKey, {
      bookingId,
      providerId,
      customerId,
      amount,
      currency,
      method,
      ...returnUrls,
    });
  } catch (error) {
    logger.error('[payments] createCheckoutSession: no se pudo reservar la clave idempotente:', error.message);
    return { ok: false, status: 500, message: 'Error al iniciar el checkout en la base de datos' };
  }
  if (!claimed.claim)
    return {
      ...claimed.result,
      ...(claimed.inProgress ? { inProgress: true } : {}),
      ...(claimed.replayed ? { replayed: true } : {}),
    };

  const payment = {
    id: `pay-${Date.now()}-${randomUUID().slice(0, 8)}`,
    bookingId,
    providerId,
    customerId,
    amount,
    currency,
    method,
    status: 'pending',
  };
  let paymentRow;
  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO payments (id, booking_id, provider_id, customer_id, amount, currency, method, status, idempotency_scope, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
       ON CONFLICT DO NOTHING`,
      [payment.id, bookingId, providerId, customerId, amount, currency, method, scope, claimed.claim.key]
    );
    const { rows } = await client.query(
      'SELECT * FROM payments WHERE idempotency_scope = $1 AND idempotency_key = $2',
      [scope, claimed.claim.key]
    );
    paymentRow = rows[0];
    if (!paymentRow) throw new Error('No se pudo recuperar el pago asociado a la clave');
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client?.query('ROLLBACK');
    } catch {}
    await idempotency.release(claimed.claim);
    logger.error('[payments] crear registro de checkout falló:', error.message);
    return { ok: false, status: 500, message: 'Error al registrar el pago en la base de datos' };
  } finally {
    client?.release();
  }

  const finalize = async (result, sessionId = null) => {
    let finalClient;
    try {
      finalClient = await db.connect();
      await finalClient.query('BEGIN');
      if (sessionId) {
        await finalClient.query('UPDATE payments SET checkout_session_id = $1, updated_at = now() WHERE id = $2', [
          sessionId,
          paymentRow.id,
        ]);
      }
      await idempotency.complete(finalClient, claimed.claim, result);
      await finalClient.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await finalClient?.query('ROLLBACK');
      } catch {}
      await idempotency.release(claimed.claim);
      throw error;
    } finally {
      finalClient?.release();
    }
  };

  // Canales sin pasarela online: se registran con instrucciones para el cliente.
  if (method === 'transfer') {
    return finalize({
      ok: true,
      status: 200,
      data: {
        paymentId: paymentRow.id,
        method: 'transfer',
        checkoutUrl: null,
        status: 'pending',
        instructions: getTransferInstructions(bookingId),
      },
    });
  }

  if (method === 'cash') {
    return finalize({
      ok: true,
      status: 200,
      data: {
        paymentId: paymentRow.id,
        method: 'cash',
        checkoutUrl: null,
        status: 'pending',
        instructions: { message: 'Paga en efectivo en el establecimiento al completar el servicio.' },
      },
    });
  }

  const { successUrl, cancelUrl } = returnUrls;

  const paymentMethodTypes = method === 'paypal' ? ['paypal'] : ['card'];

  if (stripeClient) {
    try {
      const stripeIdempotencyKey = `checkout-${createHash('sha256').update(`${scope}:${claimed.claim.key}`).digest('hex')}`;
      const params = {
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
          paymentId: paymentRow.id,
          method,
        },
        payment_method_types: paymentMethodTypes,
      };
      const session = paymentRow.checkout_session_id
        ? await stripeClient.checkout.sessions.retrieve(paymentRow.checkout_session_id)
        : await stripeClient.checkout.sessions.create(params, { idempotencyKey: stripeIdempotencyKey });

      return finalize(
        {
          ok: true,
          status: 200,
          data: {
            sessionId: session.id,
            checkoutUrl: session.url,
            paymentId: paymentRow.id,
          },
        },
        session.id
      );
    } catch (error) {
      await idempotency.release(claimed.claim);
      logger.error('[payments] Stripe checkout falló:', error.message);
      return { ok: false, status: 502, message: 'No se pudo iniciar el checkout con el proveedor de pagos' };
    }
  }

  const sessionId = paymentRow.checkout_session_id || `dev_session_${paymentRow.id}`;
  return finalize(
    {
      ok: true,
      status: 200,
      data: {
        sessionId,
        checkoutUrl: `${successUrl}&dev=1&session_id=${encodeURIComponent(sessionId)}`,
        paymentId: paymentRow.id,
      },
    },
    sessionId
  );
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
    currency: normalizeCurrency(session.currency),
    method: allowedPaymentMethods.includes(method) ? method : 'card',
    status,
    createdAt: new Date().toISOString(),
  };

  if (!process.env.DATABASE_URL) {
    logger.warn('[payments] webhook procesado sin DATABASE_URL; no se persiste');
    return { ok: false, status: 500, message: 'DATABASE_URL no configurado; no se puede deduplicar el webhook' };
  }

  const eventId = String(
    payloadEvent.id ||
      `payload-${createHash('sha256')
        .update(rawBody || JSON.stringify(payloadEvent))
        .digest('hex')}`
  );
  let client;
  let notification = null;
  let persistedPayment;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const receipt = await client.query(
      `INSERT INTO payment_webhook_events (provider, event_id)
       VALUES ('stripe', $1)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING event_id`,
      [eventId]
    );
    if (!receipt.rows.length) {
      await client.query('COMMIT');
      return { ok: true, status: 200, data: { type: payloadEvent.type, status: 'duplicate' } };
    }

    let rows = [];
    let transitioned = false;
    if (status === 'paid') {
      ({ rows } = await client.query(
        `UPDATE payments
         SET status = 'paid', external_reference = $1, updated_at = now()
         WHERE id = $2 AND status IS DISTINCT FROM 'paid'
         RETURNING *`,
        [String(session.payment_intent || ''), payment.id]
      ));
      transitioned = rows.length > 0;
    }
    if (!rows.length) {
      ({ rows } = await client.query('SELECT * FROM payments WHERE id = $1', [payment.id]));
    }
    if (!rows.length) {
      await client.query('ROLLBACK');
      return { ok: false, status: 404, message: 'Pago no encontrado para el evento recibido' };
    }
    persistedPayment = rows[0];

    if (transitioned) {
      await client.query("UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1", [bookingId]);
      await client.query(
        `UPDATE reservations SET disponibilidad = 'Confirmado', updated_at = now()
         WHERE business_id = $1 AND franja = (SELECT slot FROM bookings WHERE id = $2)`,
        [providerId, bookingId]
      );
      notification = await insertPaymentNotification(
        client,
        persistedPayment,
        `Se recibió el pago (${payment.amount} ${payment.currency}) de la reserva.`
      );
    }
    await client.query('COMMIT');
    if (notification) deliverExternalNotification(notification).catch(() => {});
    return { ok: true, status: 200, data: mapPayment(persistedPayment) };
  } catch (error) {
    try {
      await client?.query('ROLLBACK');
    } catch {}
    logger.error('[payments] webhook: error al confirmar el pago en BD:', error.message);
    return { ok: false, status: 500, message: 'Error al confirmar el pago en la base de datos' };
  } finally {
    client?.release();
  }
}

module.exports = {
  listPayments,
  createPayment,
  createCheckoutSession,
  processWebhook,
  getPayment,
  updatePaymentStatus,
};
