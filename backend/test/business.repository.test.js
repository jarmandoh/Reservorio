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

  test('filters verified businesses by their live rating and sorts ratings safely', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.listBusinesses({ verified: 'true', minRating: '4.5', sortBy: 'rating' });

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('b.verified = $1');
    expect(query).toContain('AVG(r.rating)');
    expect(query).toContain('ORDER BY COALESCE');
    expect(values).toEqual([true, 4.5]);
  });

  test('can filter for unverified businesses without interpolating user input', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.listBusinesses({ verified: 'false' });

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('b.verified = $1');
    expect(values).toEqual([false]);
  });

  test('filters by a structured profession id using a bound parameter', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.listBusinesses({ categoryId: '4', professionCategoryId: '17' });

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('selected.id = $1');
    expect(query).toContain('b.profession_category_id = $2');
    expect(values).toEqual([4, 17]);
  });

  test('ignores invalid rating thresholds and keeps name ordering by default', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.listBusinesses({ minRating: 'not-a-rating' });

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('ORDER BY b.name');
    expect(query).not.toContain('AVG(r.rating)');
    expect(values).toEqual([]);
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

  test('looks up only active profession options belonging to a selected root category', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await repository.findCategorySelection(3, 8);

    const [query, values] = db.query.mock.calls[0];
    expect(query).toContain('profession.parent_id = category.id');
    expect(query).toContain('category.parent_id IS NULL');
    expect(values).toEqual([3, 8]);
  });
});
