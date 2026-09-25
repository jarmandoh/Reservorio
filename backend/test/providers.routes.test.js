'use strict';

process.env.JWT_SECRET = 'test-secret';

const bcrypt = require('bcrypt');
const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const providersRoutes = require('../src/routes/providers.routes');

const app = express();
app.use(express.json());
app.use('/api/providers', providersRoutes);

describe('Providers API', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('GET /api/providers returns active providers', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'negocio1',
          name: 'Barber Shop',
          category: 'Belleza',
          description: 'Servicio profesional',
          location: 'Madrid',
          rating: 4.8,
          reviews: 12,
          tags: 'barberia, estilo',
          gradient: 'linear-gradient(135deg,#000,#333)',
          icon: 'cut',
          schedule: 'L-V 09:00-18:00',
          logo: '',
          phone: '123456789',
          active: true,
        },
      ],
    });

    const response = await request(app).get('/api/providers');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].id).toBe('negocio1');
  });

  test('POST /api/providers/:id/auth accepts correct business PIN', async () => {
    const hash = await bcrypt.hash('1234', 10);
    db.query.mockResolvedValueOnce({ rows: [{ id: 'negocio1', pin_hash: hash }] });

    const response = await request(app).post('/api/providers/negocio1/auth').send({ pin: '1234' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveProperty('token');
  });

  test('PUT /api/providers/:id/reservations/:row validates estado (rejects invalid)', async () => {
    const token = require('../src/middleware/jwt').sign({ role: 'business-admin', businessId: 'negocio1' });

    const response = await request(app)
      .put('/api/providers/negocio1/reservations/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ disponibilidad: 'foo' });

    expect(response.status).toBe(400);
  });

  test('PUT /api/providers/:id/reservations/:row accepts estado Cancelado', async () => {
    const { sign } = require('../src/middleware/jwt');
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });
    db.query.mockResolvedValue({ rows: [{ id: 1, franja: '10:00', business_id: 'negocio1' }], rowCount: 1 });

    const response = await request(app)
      .put('/api/providers/negocio1/reservations/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ disponibilidad: 'Cancelado' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
