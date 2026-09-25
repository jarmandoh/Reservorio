'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const authRoutes = require('../src/routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API — cliente (panel de cliente)', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('POST /customer/login devuelve 400 sin email', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({ phone: '600000000' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.errors[0]).toContain('email');
  });

  test('POST /customer/login devuelve 401 si el email no tiene historial', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'nadie@example.com', phone: '600000000' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('POST /customer/login devuelve 401 si el telefono no coincide', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '+34 600 111 222' }],
    });

    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'ana@example.com', phone: '600999888' });

    expect(res.status).toBe(401);
  });

  test('POST /customer/login emite token de cliente cuando email y telefono coinciden', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '600111222' }] });

    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'ANA@example.com', phone: '600 111 222' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.customer.id).toBe('c1');

    const payload = jwt.verify(res.body.data.token, 'test-secret');
    expect(payload.role).toBe('customer');
    expect(payload.customerId).toBe('c1');
  });
});
