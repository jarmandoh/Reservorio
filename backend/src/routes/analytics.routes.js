'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const analyticsService = require('../services/analytics.service');

const router = express.Router();

// Generoso: las vistas de negocio son eventos públicos ligeros; el límite global /api ya aplica.
const viewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas peticiones, inténtalo más tarde.' },
});

/** POST /api/analytics/view — registra una vista de negocio (fire-and-forget). */
router.post('/view', viewLimiter, async (req, res) => {
  try {
    const result = await analyticsService.recordView({ businessId: req.body?.businessId });
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;