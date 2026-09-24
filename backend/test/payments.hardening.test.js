'use strict';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const payments = require('../src/services/payments.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

describe('payments.service — no degradación silenciosa', () => {
  beforeEach(() => {
    db.query.mockReset();
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
    db.query.mockRejectedValue(new Error('boom'));

    const res = await payments.createPayment({
      bookingId: 'b1', providerId: 'neg1', customerId: 'c1', amount: 10, method: 'card', status: 'pending',
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });

  test('sin DATABASE_URL, falla alto (500) en vez de guardar en memoria', async () => {
    delete process.env.DATABASE_URL;
    db.query.mockRejectedValue(new Error('boom'));

    const res = await payments.createPayment({
      bookingId: 'b2', providerId: 'neg1', customerId: 'c1', amount: 10, method: 'card', status: 'pending',
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });
});