'use strict';

const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { requireAuth, canAccessBusinessId } = require('../middleware/auth');
const { listPayments, createPayment, createCheckoutSession, processWebhook, getPayment, updatePaymentStatus } = require('../services/payments.service');

const router = express.Router();

const allowedPaymentMethods = ['card', 'paypal', 'transfer', 'cash'];

const paymentValidators = [
  body('bookingId').trim().notEmpty().withMessage('bookingId requerido'),
  body('providerId').trim().notEmpty().withMessage('providerId requerido'),
  body('customerId').trim().notEmpty().withMessage('customerId requerido'),
  body('amount').isFloat({ min: 0 }).withMessage('amount inválido'),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('currency inválido'),
  body('method').isIn(allowedPaymentMethods).withMessage('method inválido'),
  body('status').optional().isIn(['pending', 'paid', 'failed']).withMessage('status inválido'),
  handleValidation,
];

const checkoutValidators = [
  body('bookingId').trim().notEmpty().withMessage('bookingId requerido'),
  body('providerId').trim().notEmpty().withMessage('providerId requerido'),
  body('customerId').trim().notEmpty().withMessage('customerId requerido'),
  body('amount').isFloat({ min: 0 }).withMessage('amount inválido'),
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('currency inválido'),
  body('method').optional().isIn(allowedPaymentMethods).withMessage('method inválido'),
  body('successUrl').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('successUrl inválida'),
  body('cancelUrl').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('cancelUrl inválida'),
  handleValidation,
];

router.get('/', async (req, res) => {
  try {
    const result = await listPayments(req.query);
    const body = { ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) };
    if (result.meta) body.meta = result.meta;
    return res.status(result.status).json(body);
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

router.post('/checkout', checkoutValidators, async (req, res) => {
  try {
    const result = await createCheckoutSession(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const rawBody = req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const result = await processWebhook({
      rawBody,
      signature: req.headers['stripe-signature'],
      event: req.body && !Buffer.isBuffer(req.body) ? req.body : null,
    });

    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    const status = String(req.body?.status ?? '').trim();

    if (!['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'status inválido' });
    }

    const found = await getPayment(id);
    if (!found.ok) {
      return res.status(found.status).json({ ok: false, message: found.message });
    }

    if (!canAccessBusinessId(req, res, found.data.providerId)) return;

    const result = await updatePaymentStatus(id, status);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
