'use strict';

const repository = require('../src/repositories/business.repository');

describe('Business repository', () => {
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
});
