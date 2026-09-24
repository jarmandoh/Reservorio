'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/bookings.service', () => ({ listBookings: jest.fn() }));
jest.mock('../src/services/customers.service', () => ({ listCustomers: jest.fn() }));
jest.mock('../src/services/payments.service', () => ({ listPayments: jest.fn() }));

const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');
const bookingsService = require('../src/services/bookings.service');
const customersService = require('../src/services/customers.service');
const paymentsService = require('../src/services/payments.service');
const adminRoutes = require('../src/routes/admin.routes');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

function adminToken() {
  return sign({ role: 'admin' });
}

describe('admin.routes — panel avanzado', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    db.query.mockReset();
    bookingsService.listBookings.mockResolvedValue({ ok: true, data: [] });
    customersService.listCustomers.mockResolvedValue({ ok: true, data: [] });
    paymentsService.listPayments.mockResolvedValue({ ok: true, data: [] });
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
  });

  test('401 sin token', async () => {
    const res = await request(buildApp()).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('403 con rol no admin', async () => {
    const token = sign({ role: 'business-admin', businessId: 'b1' });
    const res = await request(buildApp()).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('GET /stats devuelve agregados del marketplace', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        businesses: 3,
        active_businesses: 2,
        verified_businesses: 1,
        bookings: 12,
        confirmed_bookings: 4,
        reservations: 20,
        reviews: 7,
        average_rating: 4.2,
      }],
    });

    const res = await request(buildApp()).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.businesses).toBe(3);
    expect(res.body.data.activeBusinesses).toBe(2);
    expect(res.body.data.revenue).toBe(0);
  });

  test('GET /reviews lista con nombre del negocio', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        business_id: 'neg1',
        business_name: 'Barbería Norte',
        rating: 5,
        review: 'Excepcional',
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(buildApp()).get('/api/admin/reviews').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].businessName).toBe('Barbería Norte');
    expect(res.body.data[0].rating).toBe(5);
  });

  test('DELETE /reviews/:id elimina la reseña', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 9 }] });

    const res = await request(buildApp()).delete('/api/admin/reviews/9').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM ratings'), [9]);
  });

  test('DELETE /services/:serviceId elimina el servicio', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 4 }] });

    const res = await request(buildApp()).delete('/api/admin/services/4').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM services'), [4]);
  });

  test('GET /payments respeta el filtro de status', async () => {
    paymentsService.listPayments.mockResolvedValue({
      ok: true,
      data: [
        { id: 'p1', providerId: 'neg1', status: 'paid', amount: 30 },
        { id: 'p2', providerId: 'neg1', status: 'pending', amount: 40 },
        { id: 'p3', providerId: 'neg1', status: 'pending', amount: 50 },
      ],
    });

    const res = await request(buildApp()).get('/api/admin/payments?status=pending').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(p => p.id)).toEqual(['p2', 'p3']);
  });

  test('GET /stats funciona sin base de datos (agregados desde memoria)', async () => {
    delete process.env.DATABASE_URL;
    bookingsService.listBookings.mockResolvedValue({ ok: true, data: [{ status: 'confirmed' }] });
    customersService.listCustomers.mockResolvedValue({ ok: true, data: [{ id: 'c1' }] });
    paymentsService.listPayments.mockResolvedValue({ ok: true, data: [{ id: 'p1', status: 'paid', amount: 25 }] });

    const res = await request(buildApp()).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toBe(1);
    expect(res.body.data.confirmedBookings).toBe(1);
    expect(res.body.data.customers).toBe(1);
    expect(res.body.data.paidPayments).toBe(1);
    expect(res.body.data.revenue).toBe(25);
  });
});