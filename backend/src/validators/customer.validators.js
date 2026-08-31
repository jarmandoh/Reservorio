'use strict';

const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const customerValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('name requerido'),
    body('email').trim().isEmail().withMessage('email inválido'),
    body('phone').optional().trim().isLength({ min: 7, max: 20 }).withMessage('phone inválido'),
    handleValidation,
  ],
};

module.exports = { customerValidators };
