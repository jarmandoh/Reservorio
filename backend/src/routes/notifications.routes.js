'use strict';

const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const { listNotifications, createNotification, sendReminderNotification } = require('../services/notifications.service');

const router = express.Router();

const notificationValidators = [
  body('businessId').trim().notEmpty().withMessage('businessId requerido'),
  body('title').trim().notEmpty().withMessage('title requerido'),
  body('message').trim().notEmpty().withMessage('message requerido'),
  body('type').optional().trim().isLength({ min: 2 }).withMessage('type inválido'),
  body('channel').optional().trim().isLength({ min: 2 }).withMessage('channel inválido'),
  handleValidation,
];

router.get('/', async (req, res) => {
  try {
    const result = await listNotifications({
      businessId: String(req.query.businessId ?? ''),
      bookingId: String(req.query.bookingId ?? ''),
    });
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/', requireAuth, notificationValidators, async (req, res) => {
  try {
    const result = await createNotification(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/reminder', requireAuth, async (req, res) => {
  try {
    const result = await sendReminderNotification(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
