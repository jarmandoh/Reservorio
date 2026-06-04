'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/syncService', () => ({ syncInBackground: jest.fn() }));

const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');
const reservationsRoutes = require('../src/routes/reservations.routes');
const servicesRoutes = require('../src/routes/services.routes');

const app = express();
app.use(express.json());
app.use('/api/reservations', reservationsRoutes);
app.use('/api/services', servicesRoutes);

describe('Legacy routes', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('GET /api/reservations denies anonymous access', async () => {
    const response = await request(app).get('/api/reservations').query({ businessId: 'biz1' });
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('Token requerido');
  });

  test('POST /api/reservations creates reservation without auth', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, business_id: 'biz1', franja: '09:00', cliente: 'Juan', telefono: '+1234567890', servicio: 'Corte', notas: '' }] });

    const response = await request(app)
      .post('/api/reservations')
      .send({ businessId: 'biz1', franja: '09:00', cliente: 'Juan', telefono: '+1234567890', servicio: 'Corte', notas: '' });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.id).toBe(1);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('PUT /api/reservations/:id allows admin update', async () => {
    const token = sign({ role: 'admin' });
    db.query
      .mockResolvedValueOnce({ rows: [{ business_id: 'biz1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, business_id: 'biz1', disponibilidad: 'Confirmado', notas: 'ok' }] });

    const response = await request(app)
      .put('/api/reservations/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ disponibilidad: 'Confirmado', notas: 'ok' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.disponibilidad).toBe('Confirmado');
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('POST /api/services requires auth', async () => {
    const response = await request(app)
      .post('/api/services')
      .send({ businessId: 'biz1', nombre: 'Corte' });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  test('DELETE /api/services/:nombre allows business-admin', async () => {
    const token = sign({ role: 'business-admin', businessId: 'biz1' });
    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app)
      .delete('/api/services/Corte')
      .set('Authorization', `Bearer ${token}`)
      .query({ businessId: 'biz1' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(db.query).toHaveBeenCalledWith('DELETE FROM services WHERE business_id = $1 AND nombre = $2', ['biz1', 'Corte']);
  });
});
