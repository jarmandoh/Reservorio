'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const notificationsRoutes = require('../src/routes/notifications.routes');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRoutes);

describe('Notifications routes', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('GET /api/notifications returns notification rows for a business', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'ntf-1',
          business_id: 'negocio1',
          customer_id: 'cliente1',
          booking_id: 'booking-1',
          type: 'booking_created',
          channel: 'in_app',
          title: 'Reserva creada',
          message: 'Tu reserva está pendiente de confirmación.',
          status: 'queued',
          created_at: '2026-08-31T00:00:00Z',
        },
      ],
    });

    const response = await request(app)
      .get('/api/notifications')
      .query({ businessId: 'negocio1' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].businessId).toBe('negocio1');
    expect(response.body.data[0].type).toBe('booking_created');
  });
});
