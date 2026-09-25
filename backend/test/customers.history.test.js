'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/bookings.service', () => ({ listBookings: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const bookingsService = require('../src/services/bookings.service');
const customersRoutes = require('../src/routes/customers.routes');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/customers', customersRoutes);
  return app;
}

function customerToken(id) {
  return jwt.sign({ role: 'customer', customerId: id }, 'test-secret');
}

describe('customers — historial y recuerdo por email', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    db.query.mockReset();
    bookingsService.listBookings.mockResolvedValue({ ok: true, data: [] });
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
  });

  test('GET /email/:email resuelve el cliente por email', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '600123456', created_at: new Date().toISOString() },
      ],
    });

    const res = await request(buildApp()).get('/api/customers/email/ana@example.com');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('c1');
  });

  test('GET /email/:email devuelve 404 si no hay historial', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(buildApp()).get('/api/customers/email/nobody@example.com');

    expect(res.status).toBe(404);
  });

  test('GET /:id/history devuelve el cliente y sus reservas con nombre del negocio y pago', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '600123456', created_at: new Date().toISOString() },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'b1',
            provider_id: 'neg1',
            business_name: 'Barbería Norte',
            service_id: 'Corte',
            date: new Date().toISOString().slice(0, 10),
            slot: '10:30',
            status: 'confirmed',
            notes: '',
            created_at: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            booking_id: 'b1',
            amount: 1500,
            currency: 'EUR',
            method: 'card',
            status: 'paid',
          },
        ],
      });

    const res = await request(buildApp())
      .get('/api/customers/c1/history')
      .set('Authorization', `Bearer ${customerToken('c1')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customer.id).toBe('c1');
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].businessName).toBe('Barbería Norte');
    expect(res.body.data.bookings[0].slot).toBe('10:30');
    expect(res.body.data.bookings[0].paymentStatus).toBe('paid');
    expect(res.body.data.bookings[0].paymentAmount).toBe(1500);
  });

  test('GET /:id/history devuelve 404 si el cliente no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(buildApp())
      .get('/api/customers/desconocido/history')
      .set('Authorization', `Bearer ${customerToken('desconocido')}`);

    expect(res.status).toBe(404);
  });

  test('GET /:id/history sin token devuelve 401', async () => {
    const res = await request(buildApp()).get('/api/customers/c1/history');

    expect(res.status).toBe(401);
  });

  test('GET /:id/history con token de otro cliente devuelve 403', async () => {
    const res = await request(buildApp())
      .get('/api/customers/otro/history')
      .set('Authorization', `Bearer ${customerToken('c1')}`);

    expect(res.status).toBe(403);
  });

  test('GET /me devuelve el perfil del cliente autenticado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '600123456', created_at: new Date().toISOString() },
      ],
    });

    const res = await request(buildApp())
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${customerToken('c1')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('c1');
    expect(res.body.data.email).toBe('ana@example.com');
  });

  test('GET /me sin token devuelve 401', async () => {
    const res = await request(buildApp()).get('/api/customers/me');

    expect(res.status).toBe(401);
  });

  test('GET /:id/history funciona sin base de datos (fallback en memoria)', async () => {
    delete process.env.DATABASE_URL;
    bookingsService.listBookings.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'booking-1',
          customerId: 'cliente1',
          providerId: 'neg1',
          serviceId: 'Corte',
          date: '2026-09-01',
          slot: '09:00',
          status: 'confirmed',
        },
      ],
    });

    const res = await request(buildApp())
      .get('/api/customers/cliente1/history')
      .set('Authorization', `Bearer ${customerToken('cliente1')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customer.name).toBe('Ana García');
    expect(res.body.data.bookings[0].slot).toBe('09:00');
  });
});
