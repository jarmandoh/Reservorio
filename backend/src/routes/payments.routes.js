'use strict';

const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { listPayments, createPayment } = require('../services/payments.service');

const router = express.Router();

const paymentValidators = [
  body('bookingId').trim().notEmpty().withMessage('bookingId requerido'),
  body('providerId').trim().notEmpty().withMessage('providerId requerido'),
  body('customerId').trim().notEmpty().withMessage('customerId requerido'),
  body('amount').isFloat({ min: 0 }).withMessage('amount inválido'),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('currency inválido'),
  body('method').isIn(['card', 'transfer', 'cash']).withMessage('method inválido'),
  body('status').optional().isIn(['pending', 'paid', 'failed']).withMessage('status inválido'),
  handleValidation,
];

router.get('/', async (req, res) => {
  try {
    const result = await listPayments(req.query);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/', paymentValidators, async (req, res) => {
  try {
    const result = await createPayment(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
