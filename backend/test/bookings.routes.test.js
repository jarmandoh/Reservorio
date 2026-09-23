'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://test';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const bookingsRoutes = require('../src/routes/bookings.routes');

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingsRoutes);

describe('Bookings routes', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  const bookingPayload = {
    providerId: 'provider1',
    customerId: 'customer1',
    serviceId: 'Corte',
    date: '2026-09-30',
    slot: '10:00',
  };

  test('POST /api/bookings returns 409 when the slot is already taken', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'provider1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'customer1' }] })
      .mockRejectedValueOnce({ code: '23505', message: 'duplicate key value violates unique constraint' });

    const response = await request(app)
      .post('/api/bookings')
      .send(bookingPayload);

    expect(response.status).toBe(409);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('no disponible');
  });

  test('POST /api/bookings creates the booking and notifies the provider', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'provider1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'customer1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'booking-1', provider_id: 'provider1', customer_id: 'customer1', service_id: 'Corte', booking_date: '2026-09-30', slot: '10:00', status: 'pending', notes: '', created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/bookings')
      .send({ ...bookingPayload, notes: 'Primera vez' });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.id).toBe('booking-1');
    expect(response.body.data.status).toBe('pending');
  });
});