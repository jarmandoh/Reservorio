'use strict';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const { findOrCreateCustomer } = require('../src/services/customers.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

describe('customers.service findOrCreateCustomer', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    db.query.mockReset();
  });

  afterAll(() => {
    if (ORIGINAL_DB_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DB_URL;
    }
  });

  test('devuelve el customer existente por email sin insertar', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '' }] });

    const res = await findOrCreateCustomer({ name: 'Ana', email: 'ANA@example.com' });

    expect(res.ok).toBe(true);
    expect(res.created).toBe(false);
    expect(res.data.id).toBe('c1');
    const inserts = db.query.mock.calls.filter(c => String(c[0]).includes('INSERT INTO customers'));
    expect(inserts).toHaveLength(0);
  });

  test('inserta un customer nuevo (ON CONFLICT email DO NOTHING) y lo relee', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    db.query.mockResolvedValueOnce({});
    db.query.mockResolvedValueOnce({ rows: [{ id: 'c2', name: 'Luis', email: 'luis@example.com', phone: '' }] });

    const res = await findOrCreateCustomer({ name: 'Luis', email: 'luis@example.com', phone: '600000000' });

    expect(res.ok).toBe(true);
    expect(res.created).toBe(true);
    expect(res.data.id).toBe('c2');
    const insertCall = db.query.mock.calls.find(c => String(c[0]).includes('INSERT INTO customers'));
    expect(insertCall).toBeDefined();
    expect(String(insertCall[0])).toContain('ON CONFLICT (email) DO NOTHING');
  });

  test('valida name y email', async () => {
    const res = await findOrCreateCustomer({ email: '' });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });
});