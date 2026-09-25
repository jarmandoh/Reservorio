'use strict';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const analyticsService = require('../src/services/analytics.service');
const adminService = require('../src/services/admin.service');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

describe('analytics — embudo de conversión (vista → reserva → pago)', () => {
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

  describe('recordView', () => {
    test('registra una vista en memoria cuando no hay DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      const res = await analyticsService.recordView({ businessId: 'negocio1' });
      expect(res.ok).toBe(true);
      expect(res.status).toBe(201);
      expect(await analyticsService.countViews({ days: 30 })).toBe(1);
    });

    test('inserta la vista en analytics_events cuando hay base de datos', async () => {
      process.env.DATABASE_URL = 'postgres://test';
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await analyticsService.recordView({ businessId: 'negocio1' });

      expect(res.ok).toBe(true);
      const insert = db.query.mock.calls.find(c => String(c[0]).includes('INSERT INTO analytics_events'));
      expect(insert).toBeDefined();
      expect(insert[1]).toContain('view');
    });
  });

  describe('admin stats con funel', () => {
    test('expone funnel con views/bookings/paid incluso sin base de datos', async () => {
      delete process.env.DATABASE_URL;
      const res = await adminService.getMarketplaceStats();

      expect(res.ok).toBe(true);
      expect(res.data.funnel).toBeDefined();
      expect(res.data.funnel.days).toBe(30);
      expect(typeof res.data.funnel.views).toBe('number');
      expect(typeof res.data.funnel.bookings).toBe('number');
      expect(typeof res.data.funnel.paid).toBe('number');
    });
  });
});
