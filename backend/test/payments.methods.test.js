'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/notifications.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ ok: true, status: 201, data: {} }),
}));

const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');
const paymentsRoutes = require('../src/routes/payments.routes');
const notificationsService = require('../src/services/notifications.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRoutes);
  return app;
}

const insertedPayment = {
  id: 'pay-1',
  booking_id: 'b1',
  provider_id: 'neg1',
  customer_id: 'c1',
  amount: 30,
  currency: 'EUR',
  method: 'card',
  status: 'pending',
};

describe('payments — más canales y confirmación manual', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    db.query.mockReset();
    notificationsService.createNotification.mockClear();
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
  });

  test('POST /checkout con método transfer devuelve instrucciones bancarias sin pasarela', async () => {
    db.query.mockResolvedValueOnce({ rows: [insertedPayment] });

    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'transfer',
      status: 'pending',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('transfer');
    expect(res.body.data.checkoutUrl).toBeNull();
    expect(res.body.data.instructions.iban).toBeTruthy();
    expect(res.body.data.instructions.reference).toBe('b1');
  });

  test('POST /checkout con método cash devuelve instrucciones en efectivo', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...insertedPayment, method: 'cash' }] });

    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'cash',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('cash');
    expect(res.body.data.checkoutUrl).toBeNull();
  });

  test('POST /checkout con card sin Stripe devuelve flujo dev', async () => {
    db.query.mockResolvedValue({ rows: [insertedPayment] });

    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutUrl).toContain('dev=1');
  });

  test('PATCH /:id requiere token', async () => {
    const res = await request(buildApp()).patch('/api/payments/pay-1').send({ status: 'paid' });
    expect(res.status).toBe(401);
  });

  test('PATCH /:id confirma un pago manual visible por el negocio', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [insertedPayment] }) // getPayment
      .mockResolvedValueOnce({ rows: [{ ...insertedPayment, status: 'paid' }] }) // update
      .mockResolvedValueOnce({}); // booking update

    const token = sign({ role: 'business-admin', businessId: 'neg1' });
    const res = await request(buildApp())
      .patch('/api/payments/pay-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paid');
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1', type: 'payment_received' })
    );
  });

  test('PATCH /:id no permite que otro negocio confirme un pago ajeno', async () => {
    db.query.mockResolvedValueOnce({ rows: [insertedPayment] });

    const token = sign({ role: 'business-admin', businessId: 'otro-negocio' });
    const res = await request(buildApp())
      .patch('/api/payments/pay-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(403);
  });

  test('PATCH /:id rechaza status inválido', async () => {
    const token = sign({ role: 'admin' });
    const res = await request(buildApp())
      .patch('/api/payments/pay-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'hackeado' });

    expect(res.status).toBe(400);
  });
});
