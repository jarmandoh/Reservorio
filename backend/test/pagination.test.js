'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://test';

const request = require('supertest');
const express = require('express');

const { parsePagination } = require('../src/utils/pagination');

describe('parsePagination', () => {
  test('sin parámetros devuelve paginación desactivada', () => {
    const p = parsePagination({});
    expect(p.paginated).toBe(false);
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
  });

  test('con page/pageSize calcula limit y offset', () => {
    const p = parsePagination({ page: '2', pageSize: '50' });
    expect(p.paginated).toBe(true);
    expect(p.limit).toBe(50);
    expect(p.offset).toBe(50);
  });

  test('pageSize por defecto 25 y máx 200', () => {
    expect(parsePagination({ page: '1' }).pageSize).toBe(25);
    expect(parsePagination({ page: '1', pageSize: '9999' }).pageSize).toBe(200);
  });

  test('valores inválidos caen a defectos sin romper', () => {
    const p = parsePagination({ page: '0', pageSize: '-3' });
    expect(p.paginated).toBe(true);
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
  });
});

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const bookingsRoutes = require('../src/routes/bookings.routes');
const paymentsRoutes = require('../src/routes/payments.routes');
const customersRoutes = require('../src/routes/customers.routes');

function buildApp(routes) {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', routes.bookings);
  app.use('/api/payments', routes.payments);
  app.use('/api/customers', routes.customers);
  return app;
}

const routes = { bookings: bookingsRoutes, payments: paymentsRoutes, customers: customersRoutes };
const app = buildApp(routes);

describe('Paginación en listados (endpoints)', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('GET /api/bookings?page=1&pageSize=5 incluye meta y LIMIT/OFFSET', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'b1',
            provider_id: 'neg1',
            customer_id: 'c1',
            service_id: 's1',
            booking_date: '2026-09-01',
            slot: '10:00',
            status: 'pending',
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: 42 }] });

    const res = await request(app).get('/api/bookings?page=1&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 42, page: 1, pageSize: 5 });
    expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1 OFFSET $2'), [5, 0]);
    expect(res.body.data).toHaveLength(1);
  });

  test('GET /api/bookings sin parámetros no ejecuta COUNT ni LIMIT', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeUndefined();
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('GET /api/payments?page=2&pageSize=10 con providerId filtra y pagina', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ total: 7 }] });

    const res = await request(app).get('/api/payments?providerId=neg1&page=2&pageSize=10');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 7, page: 2, pageSize: 10 });
    expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE provider_id = $1'), ['neg1', 10, 10]);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE provider_id = $1'), ['neg1']);
  });

  test('GET /api/payments sin parámetros conserva el contrato actual', async () => {
    db.query.mockResolvedValue({
      rows: [
        {
          id: 'pay-1',
          booking_id: 'b1',
          provider_id: 'neg1',
          customer_id: 'c1',
          amount: 10,
          currency: 'EUR',
          method: 'card',
          status: 'paid',
        },
      ],
    });
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeUndefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/customers?page=1&pageSize=5 incluye meta', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'c1', name: 'Ana', email: 'a@example.com', phone: '', created_at: new Date().toISOString() }],
      })
      .mockResolvedValueOnce({ rows: [{ total: 3 }] });

    const res = await request(app).get('/api/customers?page=1&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 3, page: 1, pageSize: 5 });
  });
});
