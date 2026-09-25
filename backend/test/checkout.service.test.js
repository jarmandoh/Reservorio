'use strict';

jest.mock('../src/services/businesses.service', () => ({ createReservation: jest.fn() }));
jest.mock('../src/services/customers.service', () => ({ findOrCreateCustomer: jest.fn() }));
jest.mock('../src/services/bookings.service', () => ({ createBooking: jest.fn() }));

const businessesService = require('../src/services/businesses.service');
const customersService = require('../src/services/customers.service');
const bookingsService = require('../src/services/bookings.service');
const { checkoutForBusiness } = require('../src/services/checkout.service');

describe('checkout.service', () => {
  beforeEach(() => {
    businessesService.createReservation.mockReset();
    customersService.findOrCreateCustomer.mockReset();
    bookingsService.createBooking.mockReset();
  });

  test('crea reserva legacy, customer y booking reales, y devuelve los ids', async () => {
    businessesService.createReservation.mockResolvedValue({ ok: true, status: 201, data: { id: 42 } });
    customersService.findOrCreateCustomer.mockResolvedValue({ ok: true, status: 200, data: { id: 'c1' } });
    bookingsService.createBooking.mockResolvedValue({ ok: true, status: 201, data: { id: 'b1' } });

    const res = await checkoutForBusiness('neg1', {
      franja: '10:00',
      cliente: 'Ana',
      telefono: '600000000',
      servicio: 'Corte',
      notas: 'n',
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(201);
    expect(res.data).toEqual({ bookingId: 'b1', customerId: 'c1', reservationId: 42 });
    expect(businessesService.createReservation).toHaveBeenCalledWith(
      'neg1',
      expect.objectContaining({ franja: '10:00' })
    );
    expect(customersService.findOrCreateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana', phone: '600000000' })
    );
    expect(bookingsService.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'neg1', customerId: 'c1', slot: '10:00', serviceId: 'Corte' })
    );
  });

  test('genera email guest cuando no se aporta email', async () => {
    businessesService.createReservation.mockResolvedValue({ ok: true, status: 201, data: { id: 7 } });
    customersService.findOrCreateCustomer.mockResolvedValue({ ok: true, status: 201, data: { id: 'c2' } });
    bookingsService.createBooking.mockResolvedValue({ ok: true, status: 201, data: { id: 'b2' } });

    await checkoutForBusiness('neg1', { franja: '11:00', cliente: 'Luis', telefono: '600000001' });

    expect(customersService.findOrCreateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: expect.stringMatching(/^guest-7-.*@reservando\.local$/) })
    );
  });

  test('propaga el 409 cuando la franja ya no está disponible', async () => {
    businessesService.createReservation.mockResolvedValue({ ok: false, status: 409, message: 'Franja no disponible' });

    const res = await checkoutForBusiness('neg1', { franja: '12:00', cliente: 'A', telefono: '600000002' });

    expect(res.status).toBe(409);
    expect(customersService.findOrCreateCustomer).not.toHaveBeenCalled();
    expect(bookingsService.createBooking).not.toHaveBeenCalled();
  });

  test('valida que franja, cliente y telefono sean obligatorios', async () => {
    const res = await checkoutForBusiness('neg1', { franja: '12:00' });

    expect(res.status).toBe(400);
    expect(businessesService.createReservation).not.toHaveBeenCalled();
  });
});
