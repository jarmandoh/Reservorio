'use strict';

const { createIdempotencyDb } = require('./helpers/idempotency-db');
const { db, state } = createIdempotencyDb();
jest.doMock('../src/db', () => db);
const payments = require('../src/services/payments.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

describe('payments.service — no degradación silenciosa', () => {
  beforeEach(() => {
    state.idempotency.clear();
    state.payments.clear();
    db.query.mockClear();
    db.connect.mockClear();
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
  });

  test('con DATABASE_URL configurado, un fallo de BD devuelve 500 (sin fallback a memoria)', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    db.connect.mockRejectedValueOnce(new Error('boom'));
    db.query.mockRejectedValue(new Error('boom'));

    const res = await payments.createPayment({
      bookingId: 'b1',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 10,
      method: 'card',
      status: 'pending',
    }, 'payment-db-failure');

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });

  test('sin DATABASE_URL, falla alto (500) en vez de guardar en memoria', async () => {
    delete process.env.DATABASE_URL;
    const res = await payments.createPayment({
      bookingId: 'b2',
      providerId: 'neg1',
      customerId: 'c1',
      amount: 10,
      method: 'card',
      status: 'pending',
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });
});
