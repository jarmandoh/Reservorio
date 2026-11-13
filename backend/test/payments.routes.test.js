'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://test';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { createIdempotencyDb } = require('./helpers/idempotency-db');
const { db, state } = createIdempotencyDb();
jest.doMock('../src/db', () => db);
jest.doMock('../src/services/notifications.service', () => ({
  deliverExternalNotification: jest.fn().mockResolvedValue(undefined),
}));

const paymentsRoutes = require('../src/routes/payments.routes');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentsRoutes);
const customerAuth = `Bearer ${jwt.sign({ role: 'customer', customerId: 'c1' }, 'test-secret')}`;

const insertedPayment = {
  id: 'pay-1',
  booking_id: 'b1',
  provider_id: 'neg1',
  customer_id: 'c1',
  amount: 89,
  currency: 'EUR',
  method: 'card',
  status: 'pending',
};

describe('Payments API', () => {
  beforeEach(() => {
    state.idempotency.clear();
    state.payments.clear();
    state.bookingPaymentDetails.clear();
    state.webhookEvents.clear();
    state.notifications.length = 0;
    db.query.mockClear();
    db.connect.mockClear();
  });

  test('GET /api/payments returns a valid payload', async () => {
    state.payments.set(insertedPayment.id, { ...insertedPayment });

    const response = await request(app).get('/api/payments').set('Authorization', customerAuth);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/payments creates a payment record', async () => {
    const payload = {
      bookingId: 'booking-123',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 1,
      currency: 'EUR',
      method: 'card',
      status: 'pending',
    };
    state.bookingPaymentDetails.set('booking-123', {
      id: 'booking-123',
      provider_id: 'neg1',
      customer_id: 'c1',
      service_id: 'Corte',
      precio: 89,
    });
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', customerAuth)
      .set('Idempotency-Key', 'payment-create-1')
      .send({ ...payload, status: 'paid' });
    const replay = await request(app)
      .post('/api/payments')
      .set('Authorization', customerAuth)
      .set('Idempotency-Key', 'payment-create-1')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.amount).toBe(89);
    expect(response.body.data.status).toBe('pending');
    expect(replay.status).toBe(201);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data.id).toBe(response.body.data.id);
  });

  test('POST /api/payments accepts alternative payment methods', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', customerAuth)
      .send({
        bookingId: 'booking-paypal',
        providerId: 'neg1',
        customerId: 'c1',
        amount: 1,
        currency: 'EUR',
        method: 'paypal',
        status: 'pending',
      })
      .set('Idempotency-Key', 'payment-create-2');

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.method).toBe('paypal');
  });

  test('POST /api/payments/checkout creates a checkout intent in dev fallback mode', async () => {
    const response = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', customerAuth)
      .send({
        bookingId: 'booking-456',
        providerId: 'neg1',
        customerId: 'c1',
        amount: 1,
        currency: 'EUR',
        method: 'card',
        successUrl: 'http://localhost:4200/payment/success?bookingId=booking-456',
        cancelUrl: 'http://localhost:4200/payment/cancel?bookingId=booking-456',
      })
      .set('Idempotency-Key', 'checkout-create-1');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.checkoutUrl || response.body.data.sessionId).toBeTruthy();
    expect(response.body.data.amount).toBe(30);
    expect(response.body.data.currency).toBe('COP');
  });

  test('POST /api/payments/checkout rejects another customer booking', async () => {
    state.bookingPaymentDetails.set('booking-other', {
      id: 'booking-other',
      provider_id: 'neg1',
      customer_id: 'other-customer',
      service_id: 'Corte',
      precio: 30,
    });

    const response = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', customerAuth)
      .send({
        bookingId: 'booking-other',
        customerId: 'c1',
        providerId: 'neg1',
        method: 'card',
      });

    expect(response.status).toBe(403);
    expect(db.connect).not.toHaveBeenCalled();
  });

  test('POST /api/payments/webhook accepts a completed session event', async () => {
    state.payments.set('pay-webhook', {
      ...insertedPayment,
      id: 'pay-webhook',
      booking_id: 'booking-456',
      status: 'pending',
    });

    const payload = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          metadata: {
            bookingId: 'booking-456',
            providerId: 'negocio_1',
            customerId: 'cliente_1',
            paymentId: 'pay-webhook',
          },
        },
      },
    };

    const response = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', 'test-signature')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe('paid');
  });

  test('GET /api/payments rejects anonymous callers', async () => {
    const response = await request(app).get('/api/payments');
    expect(response.status).toBe(401);
  });

  test('POST /api/payments rejects anonymous callers', async () => {
    const response = await request(app).post('/api/payments').send({ bookingId: 'booking-123' });
    expect(response.status).toBe(401);
  });
});
