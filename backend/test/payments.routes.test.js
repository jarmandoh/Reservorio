'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://test';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/notifications.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ ok: true, status: 201, data: {} }),
}));

const db = require('../src/db');
const paymentsRoutes = require('../src/routes/payments.routes');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentsRoutes);

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
    db.query.mockReset();
  });

  test('GET /api/payments returns a valid payload', async () => {
    db.query.mockResolvedValue({ rows: [insertedPayment] });

    const response = await request(app).get('/api/payments');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/payments creates a payment record', async () => {
    db.query.mockResolvedValue({ rows: [insertedPayment] });

    const response = await request(app).post('/api/payments').send({
      bookingId: 'booking-123',
      providerId: 'negocio_1',
      customerId: 'cliente_1',
      amount: 89,
      currency: 'EUR',
      method: 'card',
      status: 'pending',
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.amount).toBe(89);
    expect(response.body.data.status).toBe('pending');
  });

  test('POST /api/payments accepts alternative payment methods', async () => {
    db.query.mockResolvedValue({ rows: [{ ...insertedPayment, method: 'paypal' }] });

    const response = await request(app).post('/api/payments').send({
      bookingId: 'booking-paypal',
      providerId: 'negocio_1',
      customerId: 'cliente_1',
      amount: 89,
      currency: 'EUR',
      method: 'paypal',
      status: 'pending',
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.method).toBe('paypal');
  });

  test('POST /api/payments/checkout creates a checkout intent in dev fallback mode', async () => {
    db.query.mockResolvedValue({ rows: [insertedPayment] });

    const response = await request(app)
      .post('/api/payments/checkout')
      .send({
        bookingId: 'booking-456',
        providerId: 'negocio_1',
        customerId: 'cliente_1',
        amount: 120,
        currency: 'EUR',
        method: 'card',
        successUrl: 'http://localhost:4200/success',
        cancelUrl: 'http://localhost:4200/cancel',
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.checkoutUrl || response.body.data.sessionId).toBeTruthy();
  });

  test('POST /api/payments/webhook accepts a completed session event', async () => {
    db.query.mockResolvedValue({ rows: [] });

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
});