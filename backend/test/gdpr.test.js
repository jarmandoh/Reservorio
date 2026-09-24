'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const db = require('../src/db');
const customersService = require('../src/services/customers.service');
const customersRoutes = require('../src/routes/customers.routes');

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/customers', customersRoutes);
  return app;
}

function customerToken(id) {
  return jwt.sign({ role: 'customer', customerId: id }, 'test-secret');
}

describe('GDPR — consentimiento, export y borrado', () => {
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

  describe('createCustomer (consentimiento)', () => {
    test('rechaza crear un cliente sin dataConsent', async () => {
      const res = await customersService.createCustomer({ name: 'Ana', email: 'ana@example.com' });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(db.query).not.toHaveBeenCalled();
    });

    test('crea el cliente cuando dataConsent es true y guarda la marca temporal', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });                    // existe?
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '' }] }); // INSERT

      const res = await customersService.createCustomer({
        name: 'Ana', email: 'ana@example.com', phone: '600123456', dataConsent: true,
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe(201);
      const insert = db.query.mock.calls.find(c => String(c[0]).includes('INSERT INTO customers'));
      expect(insert).toBeDefined();
      expect(String(insert[0])).toContain('data_consent');
    });
  });

  describe('findOrCreateCustomer (consentimiento)', () => {
    test('no toca el consentimiento si no se aporta', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '' }] });

      const res = await customersService.findOrCreateCustomer({ name: 'Ana', email: 'ana@example.com' });

      expect(res.ok).toBe(true);
      expect(res.created).toBe(false);
      expect(db.query.mock.calls.some(c => String(c[0]).includes('UPDATE customers'))).toBe(false);
    });

    test('registra el consentimiento cuando el cliente existente no lo tenía', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '', data_consent: false }] });
      db.query.mockResolvedValueOnce({ rows: [] }); // UPDATE

      const res = await customersService.findOrCreateCustomer({ name: 'Ana', email: 'ana@example.com', dataConsent: true });

      expect(res.ok).toBe(true);
      const update = db.query.mock.calls.find(c => String(c[0]).startsWith('UPDATE customers'));
      expect(update).toBeDefined();
      expect(String(update[0])).toContain('data_consent = true');
    });

    test('inserta las columnas de consentimiento al crear', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });                       // no existe
      db.query.mockResolvedValueOnce({});                                 // INSERT
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c2', name: 'Luis', email: 'luis@example.com', phone: '' }] }); // relectura

      const res = await customersService.findOrCreateCustomer({
        name: 'Luis', email: 'luis@example.com', phone: '600000000', dataConsent: true, marketingConsent: false,
      });

      expect(res.ok).toBe(true);
      const insert = db.query.mock.calls.find(c => String(c[0]).includes('INSERT INTO customers'));
      expect(String(insert[0])).toContain('data_consent');
    });
  });

  describe('exportCustomerData', () => {
    test('devuelve perfil, bookings, pagos y notificaciones', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '' }] });  // perfil
      db.query.mockResolvedValue({ rows: [] });                                                                 // bookings/payments/notifications

      const res = await customersService.exportCustomerData('c1');

      expect(res.ok).toBe(true);
      expect(res.data.customer.id).toBe('c1');
      expect(Array.isArray(res.data.bookings)).toBe(true);
      expect(Array.isArray(res.data.payments)).toBe(true);
      expect(Array.isArray(res.data.notifications)).toBe(true);
      expect(typeof res.data.exportedAt).toBe('string');
    });
  });

  describe('deleteCustomer (derecho al olvido)', () => {
    test('anonimiza el registro e invalida los códigos de acceso', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // UPDATE ... RETURNING id
      db.query.mockResolvedValueOnce({ rows: [] });            // DELETE customer_login_codes

      const res = await customersService.deleteCustomer('c1');

      expect(res.ok).toBe(true);
      expect(res.data.anonymized).toBe(true);
      const update = db.query.mock.calls.find(c => String(c[0]).startsWith('UPDATE customers'));
      expect(String(update[0])).toContain("'anon-' || id || '@eliminado.local'");
      const codesDelete = db.query.mock.calls.find(c => String(c[0]).includes('DELETE FROM customer_login_codes'));
      expect(codesDelete).toBeDefined();
    });

    test('404 si el cliente no existe', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await customersService.deleteCustomer('nadie');

      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
    });
  });

  describe('rutas export y delete', () => {
    test('GET /:id/export exige ser el propio cliente (403 para otro)', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'c2', name: 'B', email: 'b@x.com', phone: '' }] });

      const res = await request(buildApp())
        .get('/api/customers/c2/export')
        .set('Authorization', `Bearer ${customerToken('c1')}`);

      expect(res.status).toBe(403);
    });

    test('GET /:id/export devuelve los datos del cliente logueado', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Ana', email: 'ana@example.com', phone: '' }] });
      db.query.mockResolvedValue({ rows: [] });

      const res = await request(buildApp())
        .get('/api/customers/c1/export')
        .set('Authorization', `Bearer ${customerToken('c1')}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.customer.id).toBe('c1');
    });

    test('DELETE /:id anonimiza al cliente logueado', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(buildApp())
        .delete('/api/customers/c1')
        .set('Authorization', `Bearer ${customerToken('c1')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.anonymized).toBe(true);
    });

    test('DELETE exige token de cliente (401 sin token)', async () => {
      const res = await request(buildApp()).delete('/api/customers/c1');
      expect(res.status).toBe(401);
    });
  });
});