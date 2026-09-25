'use strict';

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/notifications.service', () => ({
  sendReminderNotification: jest.fn(),
}));

const db = require('../src/db');
const notificationsService = require('../src/services/notifications.service');
const { runDueReminders, startReminderWorker } = require('../src/services/reminders.worker');

const dueBooking = id => ({
  booking_id: `booking-${id}`,
  business_id: `negocio-${id}`,
  customer_id: `cliente-${id}`,
  booking_date: '2026-10-01',
  slot: '10:00',
});

const flush = async () => {
  // Microtasks únicamente (setImmediate es falso bajo jest.useFakeTimers()).
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe('Worker de recordatorios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
    notificationsService.sendReminderNotification.mockResolvedValue({ ok: true, status: 201 });
  });

  test('consulta reservas dentro de la ventana y sin recordatorio previo', async () => {
    await runDueReminders();

    expect(db.query).toHaveBeenCalledTimes(1);
    const [query, params] = db.query.mock.calls[0];
    expect(query).toContain("n.type = 'reminder'");
    expect(query).toContain("n.status IN ('queued', 'sent')");
    expect(query).toContain('b.status IN');
    expect(params[0]).toBe('24 hours');
  });

  test('crea un recordatorio por reserva elegible', async () => {
    db.query.mockResolvedValueOnce({ rows: [dueBooking('1'), dueBooking('2')] });

    const result = await runDueReminders();

    expect(result.due).toBe(2);
    expect(result.sent).toBe(2);
    expect(notificationsService.sendReminderNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.sendReminderNotification).toHaveBeenCalledWith({
      businessId: 'negocio-1',
      customerId: 'cliente-1',
      bookingId: 'booking-1',
    });
  });

  test('un fallo individual no se cuenta como enviado ni interrumpe el resto', async () => {
    db.query.mockResolvedValueOnce({ rows: [dueBooking('1'), dueBooking('2')] });
    notificationsService.sendReminderNotification
      .mockResolvedValueOnce({ ok: true, status: 201 })
      .mockResolvedValueOnce({ ok: false, status: 500, message: 'db caída' });

    const result = await runDueReminders();

    expect(result.due).toBe(2);
    expect(result.sent).toBe(1);
  });

  test('arranca una corrida inmediata y luego en intervalo sin bloquear el proceso', async () => {
    db.query.mockResolvedValueOnce({ rows: [dueBooking('1')] });
    jest.useFakeTimers();
    try {
      const interval = startReminderWorker();
      await flush();

      expect(db.query).toHaveBeenCalledTimes(1);

      db.query.mockResolvedValueOnce({ rows: [] });
      jest.advanceTimersByTime(60 * 60 * 1000);
      await flush();

      expect(db.query.mock.calls.length).toBeGreaterThan(1);
      expect(interval.unref).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  test('una corrida que falla en el query solo loguea y no rompe el bucle', async () => {
    db.query.mockRejectedValueOnce(new Error('timeout'));

    const interval = startReminderWorker();
    await flush();

    expect(interval.unref).toBeDefined();
    expect(notificationsService.sendReminderNotification).not.toHaveBeenCalled();
  });
});
