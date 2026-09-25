'use strict';

const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const customerValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('name requerido'),
    body('email').trim().isEmail().withMessage('email inválido'),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 20 }).withMessage('phone inválido'),
    body('dataConsent')
      .custom(value => value === true)
      .withMessage('Debes aceptar el tratamiento de datos (dataConsent)'),
    body('marketingConsent')
      .optional({ values: 'falsy' })
      .isBoolean()
      .withMessage('marketingConsent debe ser booleano'),
    handleValidation,
  ],
};

module.exports = { customerValidators };
