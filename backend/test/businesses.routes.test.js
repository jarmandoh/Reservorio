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
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'negocio1',
          name: 'Test',
          category: 'Test',
          rating: 4.5,
          reviews: 10,
          tags: '',
          gradient: '',
          icon: '',
          schedule: '',
          logo: '',
          phone: '',
          active: true,
        },
      ],
    });

    const response = await request(app).get('/api/businesses/all').set('Authorization', `Bearer ${token}`);

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
    expect(db.query).toHaveBeenCalledWith('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', [
      'negocio1',
      'Corte de cabello',
    ]);
  });

  const baseRow = {
    id: 'negocio1',
    name: 'Negocio',
    category: 'Belleza',
    rating: 4.2,
    reviews: 3,
    tags: '',
    gradient: '',
    icon: '',
    schedule: '',
    logo: '',
    phone: '',
    active: true,
    verified: false,
    cancellation_policy: '',
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
    expect(db.query).toHaveBeenCalledWith('UPDATE businesses SET verified = $1 WHERE id = $2 RETURNING *', [
      true,
      'negocio1',
    ]);
  });

  test('GET /api/businesses/:id/availability is public and hides personal data', async () => {
    db.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          franja: '10:00',
          disponibilidad: 'Disponible',
          cliente: 'Juan',
          telefono: '123456789',
          servicio: 'x',
          notas: '',
        },
        {
          id: 2,
          franja: '11:00',
          disponibilidad: 'Reservado',
          cliente: 'Ana',
          telefono: '987654321',
          servicio: 'y',
          notas: '',
        },
      ],
    });

    const response = await request(app).get('/api/businesses/negocio1/availability');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toEqual({ id: 1, franja: '10:00', disponibilidad: 'Disponible' });
    expect(response.body.data[0]).not.toHaveProperty('cliente');
    expect(response.body.data[0]).not.toHaveProperty('telefono');
    expect(response.body.data[1]).not.toHaveProperty('servicio');
  });

  test('PUT /api/businesses/:id/reservations/:row accepts estado Cancelado', async () => {
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });
    db.query.mockResolvedValue({ rows: [{ id: 1, franja: '10:00', business_id: 'negocio1' }], rowCount: 1 });

    const response = await request(app)
      .put('/api/businesses/negocio1/reservations/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ disponibilidad: 'Cancelado' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(db.query).toHaveBeenCalledWith(
      'UPDATE reservations SET disponibilidad = $1, notas = $2, updated_at = now()\n     WHERE id = $3 AND business_id = $4 RETURNING *',
      ['Cancelado', '', 1, 'negocio1']
    );
  });

  test('PUT /api/businesses/:id/reservations/:row rejects invalid estado', async () => {
    const token = sign({ role: 'business-admin', businessId: 'negocio1' });

    const response = await request(app)
      .put('/api/businesses/negocio1/reservations/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ disponibilidad: 'NO_EXISTE' });

    expect(response.status).toBe(400);
  });

  test('POST /api/businesses/:id/checkout rejects missing telefono', async () => {
    const response = await request(app)
      .post('/api/businesses/negocio1/checkout')
      .send({ franja: '10:00', cliente: 'Ana' });

    expect(response.status).toBe(400);
  });

  test('POST /api/businesses/:id/checkout rejects invalid email', async () => {
    const response = await request(app)
      .post('/api/businesses/negocio1/checkout')
      .send({ franja: '10:00', cliente: 'Ana', telefono: '600000000', email: 'no-es-email' });

    expect(response.status).toBe(400);
  });
});
