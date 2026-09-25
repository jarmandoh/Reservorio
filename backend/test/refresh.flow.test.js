'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PIN = '1234';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');
const { sign } = require('../src/middleware/jwt');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const freshToken = role => {
  const payload = { role };
  if (role === 'owner') payload.ownerId = 'owner-1';
  if (role === 'customer') payload.customerId = 'customer-1';
  return sign(payload, role === 'admin' ? '2h' : '8h');
};

describe('Auth API — POST /api/auth/refresh (renovación de sesión)', () => {
  test('rechaza llamadas sin token', async () => {
    const response = await request(app).post('/api/auth/refresh').send({});
    expect(response.status).toBe(400);
    expect(response.body.errors[0]).toContain('token requerido');
  });

  test('rechaza un token inválido (firma corrupta)', async () => {
    const tampered = 'aaaa.bbbb.cccc'.replace('b', 'x');
    const response = await request(app).post('/api/auth/refresh').send({ token: tampered });
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('Token inválido');
  });

  test('rechaza un token con role desconocido', async () => {
    const token = sign({ role: 'super-admin' }, '8h');
    const response = await request(app).post('/api/auth/refresh').send({ token });
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Token inválido');
  });

  test('rechaza un token expirado fuera de la ventana de gracia', async () => {
    const token = sign({ role: 'customer', customerId: 'customer-1' }, '-8h');
    const response = await request(app).post('/api/auth/refresh').send({ token });
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Sesión expirada');
  });

  test('reemite admin dentro de la ventana de gracia conservando el rol', async () => {
    const token = sign({ role: 'admin' }, '-1h');
    const response = await request(app).post('/api/auth/refresh').send({ token });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.token).toBeDefined();

    const decoded = JSON.parse(Buffer.from(response.body.data.token.split('.')[1], 'base64').toString());
    expect(decoded.role).toBe('admin');
    expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
  });

  test('reemite owner preservando su identidad', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ token: freshToken('owner') });
    expect(response.status).toBe(200);

    const decoded = JSON.parse(Buffer.from(response.body.data.token.split('.')[1], 'base64').toString());
    expect(decoded.role).toBe('owner');
    expect(decoded.ownerId).toBe('owner-1');
  });

  test('reemite customer preservando su identidad', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ token: freshToken('customer') });
    expect(response.status).toBe(200);

    const decoded = JSON.parse(Buffer.from(response.body.data.token.split('.')[1], 'base64').toString());
    expect(decoded.role).toBe('customer');
    expect(decoded.customerId).toBe('customer-1');
  });
});

describe('AuthService — refreshAccessToken', () => {
  const authService = require('../src/services/auth.service');

  test('devuelve 401 si el token no es un JWT válido', async () => {
    const result = await authService.refreshAccessToken('no-es-un-jwt');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test('devuelve un token nuevo con expiración renovada', async () => {
    const result = await authService.refreshAccessToken(freshToken('customer'));
    expect(result.ok).toBe(true);
    const decoded = JSON.parse(Buffer.from(result.data.token.split('.')[1], 'base64').toString());
    expect(decoded.exp * 1000).toBeGreaterThan(Date.now() + 6 * 60 * 60 * 1000);
  });
});
