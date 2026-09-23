'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/syncService', () => ({ syncInBackground: jest.fn() }));

const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');
const businessesRoutes = require('../src/routes/businesses.routes');

const app = express();
app.use(express.json());
app.use('/api/businesses', businessesRoutes);

describe('Businesses routes', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('GET /api/businesses/all denies anonymous access', async () => {
    const response = await request(app).get('/api/businesses/all');
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('Token requerido');
  });

  test('GET /api/businesses/all allows admin access', async () => {
    const token = sign({ role: 'admin' });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'negocio1', name: 'Test', category: 'Test', rating: 4.5, reviews: 10, tags: '', gradient: '', icon: '', schedule: '', logo: '', phone: '', active: true }] });

    const response = await request(app)
      .get('/api/businesses/all')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].id).toBe('negocio1');
  });

  test('POST /api/businesses/:id/services allows business-admin access', async () => {
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });
    db.query.mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/businesses/negocio1/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Corte de cabello' });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.nombre).toBe('Corte de cabello');
    expect(db.query).toHaveBeenCalledWith('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', ['negocio1', 'Corte de cabello']);
  });

  const baseRow = {
    id: 'negocio1', name: 'Negocio', category: 'Belleza',
    rating: 4.2, reviews: 3, tags: '', gradient: '', icon: '',
    schedule: '', logo: '', phone: '', active: true,
    verified: false, cancellation_policy: '',
  };

  test('PUT /api/businesses/:id strips rating/reviews for non-admin', async () => {
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });
    db.query.mockResolvedValue({ rows: [baseRow] });

    await request(app)
      .put('/api/businesses/negocio1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Negocio', rating: 5, reviews: 999 });

    const updateCall = db.query.mock.calls.find(c => c[0] && String(c[0]).includes('UPDATE businesses'));
    expect(updateCall).toBeDefined();
    expect(String(updateCall[0])).not.toContain('rating');
    expect(String(updateCall[0])).not.toContain('reviews');
  });

  test('PATCH /api/businesses/:id/verify denies non-admin', async () => {
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });

    const response = await request(app)
      .patch('/api/businesses/negocio1/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true });

    expect(response.status).toBe(403);
  });

  test('PATCH /api/businesses/:id/verify allows admin', async () => {
    const token = sign({ role: 'admin' });
    db.query.mockResolvedValue({ rows: [baseRow] });

    const response = await request(app)
      .patch('/api/businesses/negocio1/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(db.query).toHaveBeenCalledWith('UPDATE businesses SET verified = $1 WHERE id = $2 RETURNING *', [true, 'negocio1']);
  });
});
