'use strict';

const { createIdempotencyDb } = require('./helpers/idempotency-db');
const { db, state } = createIdempotencyDb();
jest.doMock('../src/db', () => db);
jest.doMock('../src/services/syncService', () => ({ syncInBackground: jest.fn() }));
jest.doMock('../src/services/realtime.service', () => ({ broadcastBookingCreated: jest.fn() }));
jest.doMock('../src/services/notifications.service', () => ({
  deliverExternalNotification: jest.fn().mockResolvedValue(undefined),
}));

const { checkoutForBusiness } = require('../src/services/checkout.service');

describe('checkout.service idempotency', () => {
  const payload = {
    franja: '10:00',
    cliente: 'Ana',
    telefono: '600000000',
    servicio: 'Corte',
    email: 'ana@example.test',
  };

  beforeEach(() => {
    state.idempotency.clear();
    state.reservations.length = 0;
    state.bookings.length = 0;
    state.notifications.length = 0;
    db.connect.mockClear();
  });

  test('reproduce la respuesta y no crea otra reserva al repetir la clave', async () => {
    const first = await checkoutForBusiness('neg1', payload, 'reservation-attempt-1');
    const replay = await checkoutForBusiness('neg1', payload, 'reservation-attempt-1');

    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({ ...first, replayed: true });
    expect(state.reservations).toHaveLength(1);
    expect(state.bookings).toHaveLength(1);
    expect(state.notifications).toHaveLength(2);
  });

  test('rechaza la misma clave si cambia el contenido', async () => {
    const first = await checkoutForBusiness('neg1', payload, 'reservation-attempt-2');
    const changed = await checkoutForBusiness('neg1', { ...payload, franja: '11:00' }, 'reservation-attempt-2');

    expect(first.ok).toBe(true);
    expect(changed).toMatchObject({ ok: false, status: 409 });
    expect(state.reservations).toHaveLength(1);
  });

  test('requiere una clave antes de abrir una transacción', async () => {
    const before = db.connect.mock.calls.length;
    const result = await checkoutForBusiness('neg1', payload);

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(db.connect).toHaveBeenCalledTimes(before);
  });
});
