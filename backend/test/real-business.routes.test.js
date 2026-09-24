'use strict';

process.env.JWT_SECRET = 'test-secret';

// ── Tests de integración con PostgreSQL real (vía Docker) ──────────────────
// Se omiten en `npm test` normal y solo corren cuando se activan explícitamente:
//
//   docker compose -f docker-compose.test.yml up -d
//   $env:DATABASE_URL = 'postgres://reservorio_test:reservorio_test_pass@localhost:5434/reservorio_test'
//   $env:RUN_INTEGRATION = '1'
//   npm test -- test/real-business.routes.test.js
//
// Cubren los bugs #2 y #3 que los tests con BD mockeada no podían detectar:
// restricciones reales (índice único de doble reserva) y flujo de pago completo
// (booking confirmado + notificación persistida).

const RUN_INTEGRATION =
  process.env.RUN_INTEGRATION === '1' &&
  /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');

const request = require('supertest');
const express = require('express');

const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');

const customersRoutes = require('../src/routes/customers.routes');
const bookingsRoutes = require('../src/routes/bookings.routes');
const paymentsRoutes = require('../src/routes/payments.routes');
const notificationsRoutes = require('../src/routes/notifications.routes');

const app = express();
app.use(express.json());
app.use('/api/customers', customersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

const BUSINESS_ID = 'negocio-it';
const CUSTOMER_ID = 'cliente-it';

async function resetDb() {
  await db.query(
    'TRUNCATE TABLE ratings, payments, notifications, bookings, reservations, services, customers, business_owners, businesses RESTART IDENTITY CASCADE'
  );
}

async function seed() {
  await db.query(
    'INSERT INTO businesses (id, name, category, pin_hash) VALUES ($1, $2, $3, $4)',
    [BUSINESS_ID, 'Negocio IT', 'Tecnología', '$2a$10$sin-usar-en-tests']
  );
  await db.query(
    'INSERT INTO customers (id, name, email, phone) VALUES ($1, $2, $3, $4)',
    [CUSTOMER_ID, 'Cliente IT', 'cliente@it.test', '600000000']
  );
}

const bookingPayload = {
  providerId: BUSINESS_ID,
  customerId: CUSTOMER_ID,
  serviceId: 'Corte',
  date: '2026-10-01',
  slot: '10:00',
};

maybeDescribe('Integración con PostgreSQL real', () => {
  beforeAll(async () => {
    await db.query('SELECT 1');
  });

  beforeEach(async () => {
    await resetDb();
    await seed();
  });

  afterAll(async () => {
    await db.end();
  });

  test('POST /api/bookings crea la reserva y persiste su notificación', async () => {
    const res = await request(app).post('/api/bookings').send(bookingPayload);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.providerId).toBe(BUSINESS_ID);

    const notifications = await request(app)
      .get('/api/notifications')
      .query({ businessId: BUSINESS_ID, bookingId: res.body.data.id });

    expect(notifications.status).toBe(200);
    expect(notifications.body.data.length).toBe(1);
    expect(notifications.body.data[0].type).toBe('booking_created');
  });

  test('el índice único real rechaza una doble reserva en la misma franja (bug #2)', async () => {
    const first = await request(app).post('/api/bookings').send(bookingPayload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/bookings').send({
      ...bookingPayload,
      customerId: 'cliente-it',
      notes: 'segunda petición en la misma franja',
    });

    expect(second.status).toBe(409);
    expect(second.body.ok).toBe(false);
    expect(second.body.message).toContain('no disponible');
  });

  test('confirmar un pago actualiza el booking a confirmed y notifica payment_received (bug #3)', async () => {
    const booking = await request(app).post('/api/bookings').send(bookingPayload);
    expect(booking.status).toBe(201);
    const bookingId = booking.body.data.id;

    const payment = await request(app).post('/api/payments').send({
      bookingId,
      providerId: BUSINESS_ID,
      customerId: CUSTOMER_ID,
      amount: 30,
      currency: 'EUR',
      method: 'cash',
      status: 'pending',
    });
    expect(payment.status).toBe(201);
    const paymentId = payment.body.data.id;

    const token = sign({ role: 'business-admin', businessId: BUSINESS_ID });
    const confirm = await request(app)
      .patch(`/api/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('paid');

    const bookingRow = await db.query(
      'SELECT status FROM bookings WHERE id = $1',
      [bookingId]
    );
    expect(bookingRow.rows[0].status).toBe('confirmed');

    const notifications = await request(app)
      .get('/api/notifications')
      .query({ businessId: BUSINESS_ID, bookingId });

    expect(notifications.body.data.some((n) => n.type === 'payment_received')).toBe(true);
  });
});