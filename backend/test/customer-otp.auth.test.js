'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:4200';
delete process.env.OTP_DEBUG;

const crypto = require('crypto');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/channels', () => ({
  sendEmail: jest.fn().mockResolvedValue({ ok: true, status: 202 }),
  sendSms: jest.fn().mockResolvedValue({ ok: true, status: 202 }),
  getOutbox: jest.fn(() => []),
  resetOutbox: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const channels = require('../src/services/channels');
const authRoutes = require('../src/routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const CUSTOMER = { id: 'c1', name: 'Ana García', email: 'ana@example.com', phone: '+34 600 111 222' };
const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

describe('Auth API — OTP y magic-link de cliente', () => {
  beforeEach(() => {
    db.query.mockReset();
    channels.sendEmail.mockClear();
    channels.sendSms.mockClear();
  });

  describe('POST /customer/otp/request', () => {
    test('devuelve 400 sin email', async () => {
      const res = await request(app).post('/api/auth/customer/otp/request').send({});
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    test('responde genérico (sin enumerar) si el email no está registrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/request').send({ email: 'nobody@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.message).toContain('Si el correo está registrado');
      expect(channels.sendEmail).not.toHaveBeenCalled();
    });

    test('envía OTP por email y SMS cuando el cliente dejó teléfono', async () => {
      db.query.mockResolvedValueOnce({ rows: [CUSTOMER] }).mockResolvedValue({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/request').send({ email: 'ana@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.delivery).toEqual({ email: 'sent', sms: 'sent' });
      expect(res.body.data.debugCode).toBeUndefined();
      expect(channels.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@example.com', subject: expect.stringContaining('código') }));
      expect(channels.sendSms).toHaveBeenCalledWith(expect.objectContaining({ to: CUSTOMER.phone }));
    });

    test('omite el SMS si el cliente no dejó teléfono', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ ...CUSTOMER, phone: '' }] }).mockResolvedValue({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/request').send({ email: 'ana@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.delivery).toEqual({ email: 'sent', sms: 'skipped' });
      expect(channels.sendSms).not.toHaveBeenCalled();
    });
  });

  describe('POST /customer/otp/verify', () => {
    test('devuelve 400 sin email o sin código', async () => {
      const res1 = await request(app).post('/api/auth/customer/otp/verify').send({ code: '123456' });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post('/api/auth/customer/otp/verify').send({ email: 'ana@example.com' });
      expect(res2.status).toBe(400);
    });

    test('devuelve 401 si el email no está registrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/verify').send({ email: 'nobody@example.com', code: '123456' });
      expect(res.status).toBe(401);
    });

    test('devuelve 401 con código incorrecto', async () => {
      db.query.mockResolvedValueOnce({ rows: [CUSTOMER] }).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/verify').send({ email: 'ana@example.com', code: '000000' });
      expect(res.status).toBe(401);
    });

    test('emite token de cliente cuando el código coincide y lo consume (one-time)', async () => {
      const code = '123456';
      const storedHash = sha256('ana@example.com:123456');
      db.query
        .mockResolvedValueOnce({ rows: [CUSTOMER] })
        .mockResolvedValueOnce({ rows: [{ id: 'x1', customer_id: 'c1', kind: 'otp', code_hash: storedHash, attempts: 0, expires_at: futureExpiry }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/verify').send({ email: 'ana@example.com', code });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const payload = jwt.verify(res.body.data.token, 'test-secret');
      expect(payload.role).toBe('customer');
      expect(payload.customerId).toBe('c1');

      // El código ya fue consumido → no se puede reutilizar.
      db.query.mockReset();
      db.query.mockResolvedValueOnce({ rows: [CUSTOMER] }).mockResolvedValueOnce({ rows: [] });
      const again = await request(app).post('/api/auth/customer/otp/verify').send({ email: 'ana@example.com', code });
      expect(again.status).toBe(401);
    });
  });

  describe('POST /customer/magic-link/request', () => {
    test('responde genérico si el email no está registrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/magic-link/request').send({ email: 'nobody@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('enlace');
      expect(channels.sendEmail).not.toHaveBeenCalled();
    });

    test('envía email con el enlace del frontend', async () => {
      db.query.mockResolvedValueOnce({ rows: [CUSTOMER] }).mockResolvedValue({ rows: [] });

      const res = await request(app).post('/api/auth/customer/magic-link/request').send({ email: 'ana@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.delivery).toEqual({ email: 'sent' });
      const emailCall = channels.sendEmail.mock.calls[0][0];
      expect(emailCall.to).toBe('ana@example.com');
      expect(emailCall.textBody).toContain('http://localhost:4200/customer/verify?token=');
      expect(res.body.data.debugToken).toBeUndefined();
    });
  });

  describe('POST /customer/magic-link/verify', () => {
    test('devuelve 401 con token inexistente', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/magic-link/verify').send({ token: 'un-token-desconocido-1234567890abc' });
      expect(res.status).toBe(401);
    });

    test('emite token de cliente al canjear el enlace y lo consume', async () => {
      const token = 'magic-token-abc123def456ghi789';
      const storedHash = sha256(token);
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'm1', customer_id: 'c1', kind: 'magic_link', code_hash: storedHash, attempts: 0, expires_at: futureExpiry }] })
        .mockResolvedValueOnce({ rows: [CUSTOMER] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/auth/customer/magic-link/verify').send({ token });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const payload = jwt.verify(res.body.data.token, 'test-secret');
      expect(payload.role).toBe('customer');
      expect(payload.customerId).toBe('c1');

      db.query.mockReset();
      db.query.mockResolvedValueOnce({ rows: [] });
      const again = await request(app).post('/api/auth/customer/magic-link/verify').send({ token });
      expect(again.status).toBe(401);
    });
  });

  test('debug: con OTP_DEBUG=1 se expone el código al solicitarlo', async () => {
    process.env.OTP_DEBUG = '1';
    try {
      db.query.mockResolvedValueOnce({ rows: [{ ...CUSTOMER, phone: '' }] }).mockResolvedValue({ rows: [] });

      const res = await request(app).post('/api/auth/customer/otp/request').send({ email: 'ana@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.debugCode).toMatch(/^\d{6}$/);
    } finally {
      delete process.env.OTP_DEBUG;
    }
  });
});