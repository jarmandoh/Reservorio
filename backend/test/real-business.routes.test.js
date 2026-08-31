'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');

const customersRoutes = require('../src/routes/customers.routes');
const bookingsRoutes = require('../src/routes/bookings.routes');

const app = express();
app.use(express.json());
app.use('/api/customers', customersRoutes);
app.use('/api/bookings', bookingsRoutes);

describe('Real-business routes', () => {
  test('GET /api/customers returns customer list', async () => {
    const response = await request(app).get('/api/customers');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/bookings creates a reservation request', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({
        providerId: 'negocio1',
        customerId: 'cliente1',
        serviceId: 'servicio-1',
        date: '2026-09-10',
        slot: '10:00',
        notes: 'Necesito atención urgente',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.providerId).toBe('negocio1');
  });
});
