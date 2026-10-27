'use strict';

const { createIdempotencyDb } = require('./helpers/idempotency-db');
const { db, state } = createIdempotencyDb();
jest.doMock('../src/db', () => db);
jest.doMock('../src/services/notifications.service', () => ({
  deliverExternalNotification: jest.fn().mockResolvedValue(undefined),
}));

const payments = require('../src/services/payments.service');

describe('payments idempotency', () => {
  const paymentPayload = {
    bookingId: 'booking-1',
    providerId: 'business-1',
    customerId: 'customer-1',
    amount: 25000,
    currency: 'COP',
    method: 'card',
  };

  beforeEach(() => {
    state.idempotency.clear();
    state.payments.clear();
    state.webhookEvents.clear();
    state.notifications.length = 0;
    db.connect.mockClear();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.FRONTEND_URL = 'http://localhost:4200';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  test('reintentar la creación del pago devuelve el mismo pago', async () => {
    const first = await payments.createPayment(paymentPayload, 'payment-attempt-1');
    const replay = await payments.createPayment(paymentPayload, 'payment-attempt-1');

    expect(first.ok).toBe(true);
    expect(replay.data.id).toBe(first.data.id);
    expect(replay.replayed).toBe(true);
    expect(state.payments.size).toBe(1);
  });

  test('reintentar checkout por transferencia reutiliza el pago y la respuesta', async () => {
    const payload = { ...paymentPayload, method: 'transfer' };
    const first = await payments.createCheckoutSession(payload, 'checkout-attempt-1');
    expect(first.ok).toBe(true);
    const replay = await payments.createCheckoutSession(payload, 'checkout-attempt-1');

    expect(first.data.paymentId).toBe(replay.data.paymentId);
    expect(replay.replayed).toBe(true);
    expect(state.payments.size).toBe(1);
  });

  test('procesa un webhook de pago una sola vez', async () => {
    state.payments.set('pay-webhook', {
      id: 'pay-webhook',
      booking_id: 'booking-1',
      provider_id: 'business-1',
      customer_id: 'customer-1',
      amount: 25000,
      currency: 'COP',
      method: 'card',
      status: 'pending',
    });
    const webhook = {
      event: {
        id: 'evt-1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs-1',
            payment_status: 'paid',
            amount_total: 2500000,
            currency: 'cop',
            metadata: {
              bookingId: 'booking-1',
              providerId: 'business-1',
              customerId: 'customer-1',
              paymentId: 'pay-webhook',
            },
          },
        },
      },
    };

    const first = await payments.processWebhook(webhook);
    const duplicate = await payments.processWebhook(webhook);

    expect(first).toMatchObject({ ok: true, data: { status: 'paid' } });
    expect(duplicate).toMatchObject({ ok: true, data: { status: 'duplicate' } });
    expect(state.webhookEvents.size).toBe(1);
    expect(state.notifications).toHaveLength(1);
  });
});
