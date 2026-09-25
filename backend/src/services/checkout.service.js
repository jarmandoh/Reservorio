'use strict';

const businessesService = require('./businesses.service');
const customersService = require('./customers.service');
const bookingsService = require('./bookings.service');

/**
 * Preparación del checkout para el kiosk público:
 * 1. Crea la reserva legacy (bloquea la franja, anti doble-reserva por BD).
 * 2. Crea/u obtiene un customer real por email (guest si no se aporta).
 * 3. Crea la booking real del marketplace.
 *
 * Devuelve los IDs reales (bookingId, customerId) que el frontend usará para
 * iniciar la sesión de pago, de modo que el payment quede referenciado a filas reales.
 */
async function checkoutForBusiness(businessId, payload = {}) {
  const { franja, cliente, telefono, servicio, notas, email, dataConsent, marketingConsent, _customerId } =
    payload ?? {};

  if (!franja || !cliente || !telefono) {
    return { ok: false, status: 400, message: 'franja, cliente y telefono son requeridos' };
  }

  const reservationResult = await businessesService.createReservation(businessId, {
    franja,
    cliente,
    telefono,
    servicio,
    notas,
  });
  if (!reservationResult.ok) {
    return reservationResult;
  }

  // Si viene customerId autenticado (requireCustomer), úsalo directamente; si no, fallback guest
  let customerId = String(_customerId ?? '').trim();
  let customerResult;
  if (customerId) {
    // Verifica que exista (evita token manipulado con id inexistente)
    const { rows } = await require('../db').query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (!rows.length) {
      return { ok: false, status: 401, message: 'Cliente autenticado no encontrado' };
    }
    customerResult = { ok: true, data: { id: customerId } };
  } else {
    customerResult = await customersService.findOrCreateCustomer({
      name: cliente,
      email: String(email ?? '').trim() || `guest-${reservationResult.data.id}-${Date.now()}@reservando.local`,
      phone: telefono,
      dataConsent,
      marketingConsent,
    });
    if (!customerResult.ok) {
      return customerResult;
    }
    customerId = customerResult.data.id;
  }

  const bookingResult = await bookingsService.createBooking({
    providerId: businessId,
    customerId,
    serviceId: String(servicio ?? '').trim() || '-',
    date: new Date().toISOString().slice(0, 10),
    slot: franja,
    notes: String(notas ?? '').trim(),
  });
  if (!bookingResult.ok) {
    return bookingResult;
  }

  return {
    ok: true,
    status: 201,
    data: {
      bookingId: bookingResult.data.id,
      customerId,
      reservationId: reservationResult.data.id,
    },
  };
}

module.exports = { checkoutForBusiness };
