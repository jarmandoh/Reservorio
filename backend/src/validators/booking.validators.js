'use strict';

const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const bookingValidators = {
  create: [
    body('providerId').trim().notEmpty().withMessage('providerId requerido'),
    body('customerId').trim().notEmpty().withMessage('customerId requerido'),
    body('serviceId').trim().notEmpty().withMessage('serviceId requerido'),
    body('date').isISO8601().withMessage('date inválida'),
    body('slot').trim().notEmpty().withMessage('slot requerido'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('notes demasiado largas'),
    handleValidation,
  ],
};

module.exports = { bookingValidators };
