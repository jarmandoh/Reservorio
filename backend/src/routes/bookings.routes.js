'use strict';

const express = require('express');
const { bookingValidators } = require('../validators/booking.validators');
const { requireAuth, requireCustomer } = require('../middleware/auth');
const { listBookings, createBooking } = require('../controllers/bookings.controller');

const router = express.Router();

router.get('/', requireAuth, listBookings);
router.post('/', requireCustomer, bookingValidators.create, createBooking);

module.exports = router;
