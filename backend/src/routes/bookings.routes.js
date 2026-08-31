'use strict';

const express = require('express');
const { bookingValidators } = require('../validators/booking.validators');
const { listBookings, createBooking } = require('../controllers/bookings.controller');

const router = express.Router();

router.get('/', listBookings);
router.post('/', bookingValidators.create, createBooking);

module.exports = router;
