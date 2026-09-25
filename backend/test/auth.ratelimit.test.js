'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PIN = '1234';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth brute-force protection', () => {
  test('POST /api/auth/admin returns 429 after too many attempts', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/api/auth/admin').send({ pin: 'wrong' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/api/auth/admin').send({ pin: 'wrong' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.message).toContain('inténtalo más tarde');
  });
});
