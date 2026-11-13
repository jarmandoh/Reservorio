'use strict';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API — cliente (panel de cliente)', () => {
  test('POST /customer/login deshabilita la autenticación no verificada por email y teléfono', async () => {
    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'ana@example.com', phone: '600111222' });

    expect(res.status).toBe(410);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toContain('OTP');
  });
});
