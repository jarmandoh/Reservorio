'use strict';

const bookingsService = require('../services/bookings.service');

async function listBookings(req, res) {
  try {
    const result = await bookingsService.listBookings();
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function createBooking(req, res) {
  try {
    const result = await bookingsService.createBooking(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = { listBookings, createBooking };
