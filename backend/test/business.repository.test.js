'use strict';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const repository = require('../src/repositories/business.repository');

describe('Business repository', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('exposes the core data access methods needed for business growth', () => {
    expect(typeof repository.listBusinesses).toBe('function');
    expect(typeof repository.listAllBusinesses).toBe('function');
    expect(typeof repository.getBusinessById).toBe('function');
    expect(typeof repository.createBusiness).toBe('function');
    expect(typeof repository.updateBusiness).toBe('function');
    expect(typeof repository.listReservations).toBe('function');
    expect(typeof repository.createReservation).toBe('function');
    expect(typeof repository.updateReservation).toBe('function');
  });

  test('includes profession in public business text search', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.listBusinesses({ q: 'electricista' });

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('profession ILIKE $1'), ['%electricista%']);
  });

  test('stores onsite business type and profession', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.createBusiness({
      id: 'electricista_1',
      name: 'Electricista',
      category: 'Servicios',
      businessType: 'onsite_service',
      profession: 'Electricista',
      pinHash: 'hash',
    });

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('business_type, profession');
    expect(values).toContain('onsite_service');
    expect(values).toContain('Electricista');
  });
});
