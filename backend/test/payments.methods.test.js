'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const { createIdempotencyDb } = require('./helpers/idempotency-db');
const { db, state } = createIdempotencyDb();
jest.doMock('../src/db', () => db);
jest.doMock('../src/services/notifications.service', () => ({ deliverExternalNotification: jest.fn().mockResolvedValue(undefined) }));

const { sign } = require('../src/middleware/jwt');
const paymentsRoutes = require('../src/routes/payments.routes');
const notificationsService = require('../src/services/notifications.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;
const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

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
    process.env.FRONTEND_URL = 'http://localhost:4200';
    if (ORIGINAL_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
    state.idempotency.clear();
    state.payments.clear();
    state.webhookEvents.clear();
    state.notifications.length = 0;
    db.query.mockClear();
    db.connect.mockClear();
    notificationsService.deliverExternalNotification.mockClear();
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
    if (ORIGINAL_FRONTEND_URL === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL;
    }
    if (ORIGINAL_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
  });

  test('POST /checkout con método transfer devuelve instrucciones bancarias sin pasarela', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'transfer',
      status: 'pending',
    }).set('Idempotency-Key', 'methods-transfer-1');

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('transfer');
    expect(res.body.data.checkoutUrl).toBeNull();
    expect(res.body.data.instructions.iban).toBeTruthy();
    expect(res.body.data.instructions.reference).toBe('b1');
  });

  test('POST /checkout con método cash devuelve instrucciones en efectivo', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'cash',
    }).set('Idempotency-Key', 'methods-cash-1');

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('cash');
    expect(res.body.data.checkoutUrl).toBeNull();
  });

  test('POST /checkout con card sin Stripe devuelve flujo dev', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
    }).set('Idempotency-Key', 'methods-card-1');

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutUrl).toContain('dev=1');
  });

  test('POST /checkout acepta URLs de retorno del frontend configurado', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
      successUrl: 'http://localhost:4200/payment/success?bookingId=b1',
      cancelUrl: 'http://localhost:4200/payment/cancel?bookingId=b1',
    }).set('Idempotency-Key', 'methods-card-url-1');

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutUrl).toContain('http://localhost:4200/payment/success');
    expect(state.payments.size).toBe(1);
  });

  test('POST /checkout rechaza URLs de retorno fuera del origen de frontend', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
      successUrl: 'https://evil.example/payment/success?bookingId=b1',
      cancelUrl: 'http://localhost:4200/payment/cancel?bookingId=b1',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('successUrl o cancelUrl inválida');
    expect(db.connect).not.toHaveBeenCalled();
  });

  test('POST /checkout rechaza rutas de retorno no correspondientes al pago', async () => {
    const res = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
      successUrl: 'http://localhost:4200/customer/history',
      cancelUrl: 'http://localhost:4200/payment/cancel?bookingId=b1',
    });

    expect(res.status).toBe(400);
    expect(db.connect).not.toHaveBeenCalled();
  });

  test('POST /checkout exige origen HTTPS y URLs HTTPS en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://reservorio.example';
    const validResponse = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
      successUrl: 'https://reservorio.example/payment/success?bookingId=b1',
      cancelUrl: 'https://reservorio.example/payment/cancel?bookingId=b1',
    }).set('Idempotency-Key', 'methods-prod-1');

    expect(validResponse.status).toBe(200);

    db.query.mockClear();
    db.connect.mockClear();
    const invalidResponse = await request(buildApp()).post('/api/payments/checkout').send({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 30,
      currency: 'EUR',
      method: 'card',
      successUrl: 'http://reservorio.example/payment/success?bookingId=b1',
      cancelUrl: 'https://reservorio.example/payment/cancel?bookingId=b1',
    });

    expect(invalidResponse.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('PATCH /:id requiere token', async () => {
    const res = await request(buildApp()).patch('/api/payments/pay-1').send({ status: 'paid' });
    expect(res.status).toBe(401);
  });

  test('PATCH /:id confirma un pago manual visible por el negocio', async () => {
    state.payments.set('pay-1', { ...insertedPayment });

    const token = sign({ role: 'business-admin', businessId: 'neg1' });
    const res = await request(buildApp())
      .patch('/api/payments/pay-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paid');
    expect(notificationsService.deliverExternalNotification).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1', type: 'payment_received' })
    );
  });

  test('PATCH /:id no permite que otro negocio confirme un pago ajeno', async () => {
    state.payments.set('pay-1', { ...insertedPayment });

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
