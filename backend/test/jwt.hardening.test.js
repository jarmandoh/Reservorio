'use strict';

process.env.JWT_SECRET = 'test-secret-with-at-least-32-chars';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

const { sign, verify } = require('../src/middleware/jwt');
const { requireAuth } = require('../src/middleware/auth');

describe('JWT hardening', () => {
  test('verify accepts tokens signed with HS256', () => {
    const token = sign({ role: 'admin' });
    expect(verify(token).role).toBe('admin');
  });

  test('verify rejects tokens signed with a different algorithm (HS512)', () => {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS512' });
    expect(() => verify(token)).toThrow();
  });
});

describe('requireAuth rejects forged algorithm tokens', () => {
  const app = express();
  app.get('/protected', requireAuth, (_req, res) => res.status(200).json({ ok: true }));

  test('returns 401 for a token signed with HS512', async () => {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS512' });
    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });
});
