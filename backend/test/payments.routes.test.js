'use strict';

const request = require('supertest');
const express = require('express');
const paymentsRoutes = require('../src/routes/payments.routes');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentsRoutes);

describe('Payments API', () => {
  test('GET /api/payments returns a valid payload', async () => {
    const response = await request(app).get('/api/payments');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/payments creates a payment record', async () => {
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
});
