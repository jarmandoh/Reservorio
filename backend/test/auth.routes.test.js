'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PIN = '1234';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {

  test('POST /api/auth/admin returns 400 when pin is missing', async () => {
    const response = await request(app).post('/api/auth/admin').send({});
    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('Validación fallida');
    expect(response.body.errors[0]).toContain('pin requerido');
  });

  test('POST /api/auth/admin returns 401 for invalid pin', async () => {
    const response = await request(app).post('/api/auth/admin').send({ pin: 'wrong' });
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('PIN incorrecto');
  });
});
