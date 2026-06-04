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
    db.query.mockResolvedValueOnce({ rows: [{ id: 'biz1', name: 'Test', category: 'Test', rating: 4.5, reviews: 10, tags: '', gradient: '', icon: '', schedule: '', logo: '', phone: '', active: true }] });

    const response = await request(app)
      .get('/api/businesses/all')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].id).toBe('biz1');
  });

  test('POST /api/businesses/:id/services allows business-admin access', async () => {
    const token = sign({ role: 'business-admin', businessId: 'biz1' });
    db.query.mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/businesses/biz1/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Corte de cabello' });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.nombre).toBe('Corte de cabello');
    expect(db.query).toHaveBeenCalledWith('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', ['biz1', 'Corte de cabello']);
  });
});
